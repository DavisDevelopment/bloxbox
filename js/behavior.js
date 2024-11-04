
const _ = require('underscore');
const v = require('./blockdata');
const Material = v.Material;
const pf = require('./pathfinding.js');
const pteq = pf.pteq;

const geom = require('./geometry');
const {BlockSelection} = require('./blockselection.js');
const assert = require('assert');

class Task {
   constructor() {
      this.has_started = false;
      this.running = false;
      this.is_complete = false;
      this.suspended = false;
      this.next_task = null;
   }

   begin() {
      if (!this.has_started) {
         this.has_started = true;
         this.running = true;
      }
   }

   complete() {
      if (this.has_started && this.running && !this.is_complete) {
         this.is_complete = true;
         this.has_started = this.running = false;
      }
   }

   tick(person) {
      if (!this.has_started) {
         this.begin();
      }

      return this;
   }
}

class WalkPath extends Task {
   constructor(o) {
      const {path, person, target_position} = o;
      
      if (!path && (person == null || target_position == null)) {
         throw new Error('Either path or person AND target_position options must be provided');
      }

      super();

      this.path = path;
      this.person = person;
      this.target_position = target_position;
      this.current_node = 0;
   }

   tick(person, n) {
      super.tick(person);
      console.log('WalkPath.tick');

      if (!this.person) this.person = person;
      if (!this.path && this.target_position != null) {
         var {x,y,z} = this.target_position;
         var path = this.person.calcPathTo(x, y, z);
         this.path = path;
      }

      // reset and proceed to the next task when we've reached the end of the path
      if (this.path.length == 0 || pteq(person.pos, this.path[this.path.length - 1])) {
         this.current_node = 0;
         this.complete();

         return this.next_task;
      }

      // when we haven't reached the end of the path, move to the next position along the path
      var target = this.path[this.current_node++];
      person.setPos(target.x, target.y, target.z);

      return this;
   }
}

class LaunchTask extends Task {
   constructor(launch) {
      super();
      this.f = launch;
   }

   tick(person, n) {
      return this.f(person, n);
   }
}

module.exports.Task=Task;
module.exports.WalkPath=WalkPath;
module.exports.LaunchTask=LaunchTask;

class MineBlock extends Task {
   constructor(targetBlock) {
      super();
      this.targetBlock = targetBlock;
      if (!targetBlock) {
         throw new TypeError('targetBlock must be an object with x,y and z attributes');
      }
   }

   tick(person, n) {
      super.tick(person);
      console.log('MineBlock.tick');

      const { x, y, z } = this.targetBlock;

      // Calculate the distance between the person and the target block
      const distance = Math.sqrt(
         Math.pow(person.pos.x - x, 2) + 
         Math.pow(person.pos.y - y, 2) + 
         Math.pow(person.pos.z - z, 2)
      );

      // if the person is within range of the block
      if (distance <= 15) {
         console.log('MINING THE BLOCK!!!');
         // first, get some info about the block being taken
         const oldBlockType = person.world.data.getBlockType(x, y, z);
         const blockItemType = Material.getMaterialName(oldBlockType);
         const blockItemCount = 1;

         const blockItemObject = {
            block_type: oldBlockType,
         };

         // now, remove that block from the world, replacing it with air
         person.world.data.setBlockType(x, y, z, Material.AIR);

         // add the block into the person's inventory
         person.inventory.addItem(blockItemObject, blockItemType, blockItemCount);
         console.log('Just added block to inventory');

         this.complete();

         return this.next_task;
      }

      // otherwise
      else {
         // walk there
         // const path = person.calcPathTo(x, y, z);
         let walk = new WalkPath({target_position:this.targetBlock, person:person});

         // and then return to this task when we have completed that walk
         walk.next_task = this;
         return walk;
      }
   }
}

module.exports.MineBlock = MineBlock;

class PlaceBlock extends Task {
   constructor(blockType, targetPosition) {
      super();

      this.targetPosition = targetPosition;
      this.blockToPlace = blockType;

      
   }

   /**
     * Tries to place a block at the target position. If the person is
     * within range of the block, it will be placed in the world and
     * removed from the person's inventory. If not, it will walk to the
     * target position and then return to this task.
     * 
     * @param {Person} person The person performing the action
     * @param {Number} n How many ticks to process
     * 
     * @return {Task} The next task to be executed, or null if there is none
     */
   tick(person, n) {
      console.log('PlaceBlock.tick');

      const {x, y, z} = this.targetPosition;
      
      const distance = Math.sqrt(
         Math.pow(person.pos.x - x, 2) + 
         Math.pow(person.pos.y - y, 2) + 
         Math.pow(person.pos.z - z, 2)
      );

      // if the person is within range of the block
      if (distance <= 15) {
         console.log('Within range; placing block');
         // first, get some info about the block being taken
         const oldBlockType = person.world.data.getBlockType(x, y, z);
         const blockItemType = Material.getMaterialName(oldBlockType);
         const blockItemCount = 1;

         // check if the person has the block in their inventory
         var invQ = {
            type: Material.getMaterialName(this.blockToPlace).toLowerCase()
         };
         console.log(invQ);
         var invSlot = person.inventory.getSlot(invQ);

         if (invSlot != null && invSlot.count >= 1) {
            // if they do, remove one
            invSlot.count--;

            // resetting the slot if we've just emptied it
            if (invSlot.count == 0) {
               person.inventory.resetSlot(invSlot);
            }

            // set the block in the world
            person.world.data.setBlockType(x, y, z, this.blockToPlace);

            // complete this task
            this.complete();

            return this.next_task;
         }
         else if (invSlot == null) {
            throw new Error('Cannot place blocks I do not have');
         }
      }

      // otherwise
      else {
         // walk there
         let walk = new WalkPath({target_position:this.targetPosition, person:person});

         // and then return to this task when we have completed that walk
         walk.next_task = this;

         return walk;
      }
   }
}
module.exports.PlaceBlock = PlaceBlock;



/*

*/
class BuildHome extends Task {
   constructor(person, targetPosition) {
      super();
      this.person = person;
      this.targetPosition = targetPosition;
      this.subtasks = null;
      this.currentTask = null;

      this.use_material = 'stone';

      this.build_plan();
   }

   build_plan() {
      // the most basic possible home is a 5x5x4 rectangle made of grass blocks, so in order to build one, we'll need to:
      // 1) calculate the number of grass blocks needed to fill the outermost layer of the planned rectangle
      const width = 15;
      const height = 15;
      const depth = 6;

      const floorBlocks = (width * height);
      const westWallBlocks = (depth - 2) * (width - 2) * (height - 2);
      const eastWallBlocks = westWallBlocks;
      const northWallBlocks = (width * height) * (depth - 2);
      const southWallBlocks = (width * height) * (depth - 2);

      const blocksNeeded = (floorBlocks * 2) + westWallBlocks + eastWallBlocks + northWallBlocks + southWallBlocks;
      const wd = this.person.world.data;

      // raise the target-position up so that the home will be built above ground
      this.targetPosition.z -= depth;

      const buildSiteRect = new geom.Rect3D(
         this.targetPosition.x, this.targetPosition.y, this.targetPosition.z,
         depth, width, height
      );


      const buildSiteSel = new BlockSelection();
      buildSiteSel.addRect3D(buildSiteRect);

      const boundarySelections = () => {
         // build a BlockSelection of the blocks for the floor
         const floorBlockSel = new BlockSelection();
         for (var x = 0; x < width; x++) {
            for (var y = 0; y < height; y++) {
               floorBlockSel.add(this.targetPosition.x + x, this.targetPosition.y + y, this.targetPosition.z + depth);
            }
         }

         // build a BlockSelection of the roof blocks
         const roofBlockSel = new BlockSelection();
         for (var x = 0; x < width; x++) {
            for (var y = 0; y < height; y++) {
               roofBlockSel.add(this.targetPosition.x + x, this.targetPosition.y + y, this.targetPosition.z);
            }
         }

         // build BlockSelections for the four walls as well
         const wallBlockSels = [];
         for (let i = 0; i < 4; i++) {
            wallBlockSels[i] = new BlockSelection();
         }

         // West and East walls
         for (var z = 0; z < depth; z++) {
            for (var y = 0; y < height; y++) {
               wallBlockSels[0].add(this.targetPosition.x, this.targetPosition.y + y, this.targetPosition.z + z); // West
               wallBlockSels[1].add(this.targetPosition.x + width - 1, this.targetPosition.y + y, this.targetPosition.z + z); // East
            }
         }
         
         // North and South walls
         for (var x = 0; x < width; x++) {
            for (var y = 0; y < height; y++) {
               wallBlockSels[2].add(this.targetPosition.x + x, this.targetPosition.y + y, this.targetPosition.z); // North
               wallBlockSels[3].add(this.targetPosition.x + x, this.targetPosition.y + y, this.targetPosition.z + depth - 1); // South
            }
         }
      
         return {
            floor: floorBlockSel,
            west: wallBlockSels[0],
            east: wallBlockSels[1],
            north: wallBlockSels[2],
            south: wallBlockSels[3],
            roof: roofBlockSel
         };
      }

      let plan_steps = [];
      
      // 2) check if we have at least that number of grass blocks
      const blocksHeld = this.person.inventory.getCount(this.use_material);

      if (blocksHeld < blocksNeeded) {
         // 2.1) if we do not, go and mine the remaining required number of grass blocks somewhere nearby
         
         // remaining required number of blocks
         const missingBlocks = blocksNeeded - blocksHeld;

         // list of coordinates of grass blocks nearby
         const buildingMaterialLocations = this.person.findNearestBlock(missingBlocks, Material.STONE, buildSiteSel);

         // create a MineBlock task for each of the building material locations
         for (var i = 0; i < buildingMaterialLocations.length; i++) {
            const { x, y, z } = buildingMaterialLocations[i];
            plan_steps.push(new MineBlock({ x, y, z }));
         }
      }

      const planSelectionFill = (sel) => {
         for (const [x, y, z] of sel.all()) {
            plan_steps.push(new PlaceBlock(
               Material.getMaterialByName(this.use_material),
               {x, y, z}
            ));
         }
      }

      // 4) place our blocks around the outer layer of our selected rectangle
      var walls = boundarySelections();
      planSelectionFill(walls.floor);
      planSelectionFill(walls.east);
      planSelectionFill(walls.west);
      planSelectionFill(walls.south);
      planSelectionFill(walls.north);
      planSelectionFill(walls.roof);

      var cut_doorway = ()=>{
         var a = {x:buildSiteRect.x + 1, y:(buildSiteRect.y + buildSiteRect.height), z:buildSiteRect.z - 1};
         var b = {x:buildSiteRect.x + 1, y:(buildSiteRect.y + buildSiteRect.height), z:buildSiteRect.z - 2};

         var rm_a = new MineBlock(a);
         var rm_b = new MineBlock(b);

         plan_steps.push(rm_a, rm_b);
      }
      cut_doorway();

      // 5) link all of the subtasks in the plan end-to-end
      var task = plan_steps[0];
      for (var i = 1; i < plan_steps.length; i++) {
         task.next_task = plan_steps[i];
         task = plan_steps[i];
      }

      this.subtasks = plan_steps;
      console.log(this.subtasks);
      this.currentTask = plan_steps[0];
   }

   /*
    Chonky fuckin' boi of a `tick` function oO
   */
   tick() {
      super.tick(this.person);
      console.log('BuildHome.tick', this.currentTask);

      // if we still have a pending task
      if (this.currentTask != null) {
         // invoke that task's `tick` method, holding the result
         var t = this.currentTask.tick(this.person, 1);

         // if the current task has declared itself to be complete
         if (this.currentTask.is_complete) {
            // and it has not forwarded its own next-step
            if (t == null) {
               // move on to attribute-linked next-step provided
               this.currentTask = this.currentTask.next_task;
            }
            // if it has forwarded its own next-step
            else {
               // save a reference to the task that just finished
               var oldTask = this.currentTask;

               // follow `t`s 'next_task' link-chain, checking if `prevTask` appears in that chain

               var last_task = t; // the last observed task in the link-chain
               var chainLoopsBack = false;
               var chainPatched = false;

               while (last_task != null) {
                  if (last_task == oldTask) {
                     chainLoopsBack = true;
                     break;
                  }
                  else if (last_task == oldTask.next_task) {
                     chainPatched = true;
                     break;
                  }

                  // proceed down the chain
                  last_task = last_task.next_task;
               }

               if (chainLoopsBack) {
                  console.error('weird, the task is already complete');
               }
               else if (chainPatched) {
                  // chain is already patched, we don't need to do anything
               }
               else {
                  // we need to patch it ourselves
                  last_task.next_task = oldTask.next_task;
               }

               // proceed to the provided next task
               this.currentTask = t;
            }
         }
         // if the current task has not declared itself complete, but has forwarded a next-task
         else if (t != null) {
            var oldTask = this.currentTask;
            
            // follow `t`s 'next_task' link-chain, checking if `prevTask` appears in that chain

            var last_task = t; // the last observed task in the link-chain
            var chainLoopsBack = false;
            var chainPatched = false;

            while (last_task != null) {
               if (last_task == oldTask) {
                  chainLoopsBack = true;
                  break;
               }
               else if (last_task == oldTask.next_task) {
                  chainPatched = true;
                  break;
               }

               // proceed down the chain
               last_task = last_task.next_task;
            }

            if (chainLoopsBack) {
               // chain is already intact, no action necessary
            }
            else if (chainPatched) {
               // the incomplete task has explicitly linked the task it provided with its next-task, so it has opted out
               // no action necessary
            }
            else {
               // we'll assume this course of action for now
               last_task.next_task = oldTask;
            }

            this.currentTask = t;
         }

         return this;
      }

      // if all tasks have been completed
      else {
         this.complete();
         return null;
      }
   }
}

module.exports.BuildHome = BuildHome;

/*
   given an array of Tasks, will run them each to completion one-after-another
*/
class TaskSequence extends Task {
   constructor(tasks) {
      super();

      if (Array.isArray(tasks)) {
         this.tasks = tasks;
         this.currentTask = tasks[0];
      }
      else if (tasks instanceof Task) {
         this.tasks = [];
         var t = tasks;
         while (t != null) {
            this.tasks.push(t);
            t = t.next_task;
         }

         this.currentTask = this.tasks[0];
      }
   }

   tick(person, n) {

      //TODO import the linked-list maintaining logic from BuildHome.tick

      super.tick(person);

      if (this.currentTask != null) {
         var t = this.currentTask.tick(person, n);
         
         if (this.currentTask.is_complete) {
            var i = this.tasks.indexOf(this.currentTask);
            if (i < this.tasks.length - 1) {
               this.currentTask = this.tasks[i + 1];
            }
            else {
               this.is_complete = true;
            }
         }

         return this;
      }

      return null;
   }
}

module.exports.TaskSequence = TaskSequence;