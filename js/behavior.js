
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
      if (distance <= 5) {
         // first, get some info about the block being taken
         const oldBlockType = person.world.data.getBlockType(x, y, z);
         const blockItemType = Material.getMaterialName(oldBlockType);
         const blockItemCount = 1;

         const blockItemObject = {
            block_type: blockItemType,
         };

         // now, remove that block from the world, replacing it with air
         person.world.data.setBlockType(x, y, z, Material.AIR);

         // add the block into the person's inventory
         person.inventory.addItem(blockItemObject, blockItemType, blockItemCount);

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

   tick(person, n) {
      console.log('PlaceBlock.tick');

      const {x, y, z} = this.targetPosition;
      
      const distance = Math.sqrt(
         Math.pow(person.pos.x - x, 2) + 
         Math.pow(person.pos.y - y, 2) + 
         Math.pow(person.pos.z - z, 2)
      );

      // if the person is within range of the block
      if (distance <= 5) {
         // first, get some info about the block being taken
         const oldBlockType = person.world.data.getBlockType(x, y, z);
         const blockItemType = Material.getMaterialName(oldBlockType);
         const blockItemCount = 1;

         // check if the person has the block in their inventory
         var invSlot = person.inventory.getSlot({type:Material.getMaterialName(this.blockToPlace)});
         if (invSlot != null) {
            invSlot.count--;
            if (invSlot.count == 0) {
               player.inventory.resetSlot(invSlot);
            }

            // set the block in the world
            person.world.data.setBlockType(x, y, z, this.blockToPlace);

            // complete this task
            this.complete();
            return this.next_task;
         }
      }

      // otherwise
      else {
         // walk there
         // const path = person.calcPathTo(x, y, z);
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

      this.build_plan();
   }

   build_plan() {
      // the most basic possible home is a 5x5x4 rectangle made of grass blocks, so in order to build one, we'll need to:
      // 1) calculate the number of grass blocks needed to fill the outermost layer of the planned rectangle
      const width = 5;
      const height = 5;
      const depth = 4;
      const blocksNeeded = (width * height * depth) - (width - 2) * (height - 2) * (depth - 2);
      const wd = this.person.world.data;
      // const 

      const buildSiteRect = new geom.Rect3D(
         this.targetPosition.x, this.targetPosition.y, this.targetPosition.z,
         depth, width, height
      );

      const buildSiteSel = new BlockSelection();
      buildSiteSel.addRect3D(buildSiteRect);

      let plan_steps = [];
      
      // 2) check if we have at least that number of grass blocks
      const grassCount = this.person.inventory.getCount(Material.GRASS);
      if (grassCount < blocksNeeded) {
         // 2.1) if we do not, go and mine the remaining required number of grass blocks somewhere nearby
         
         // remaining required number of blocks
         const missingBlocks = blocksNeeded - grassCount;

         // list of coordinates of grass blocks nearby
         const buildingMaterialLocations = this.person.findNearestBlock(missingBlocks, Material.GRASS, buildSiteSel);

         // create a MineBlock task for each of the building material locations
         for (var i = 0; i < buildingMaterialLocations.length; i++) {
            const { x, y, z } = buildingMaterialLocations[i];
            plan_steps.push(new MineBlock({ x, y, z }));
         }
      }

      // 3) mine all non-air blocks inside our build site
      let r = buildSiteRect;
      for (var x = r.x+1; x < r.width - 1; x++) {
         for (var y = r.y+1; y < r.height - 1; y++) {
            for (var z = r.z+1; z < r.length - 1; z++) {
               if (wd.getBlockType(x, y, z) !== Material.AIR) {
                  plan_steps.push(new MineBlock({x, y, z}));
               }
            }
         }
      }

         
      // 4) place our grass blocks around the outer layer of our selected rectangle
      
      //   iterate over every point on the build site
      for (const [x, y, z] of buildSiteSel.all()) {
         // if these coordinates are along the outer edge of the build site rectangle
         if (x === buildSiteRect.x || y === buildSiteRect.y || z === buildSiteRect.z || x === buildSiteRect.width - 1 || y === buildSiteRect.height - 1 || z === buildSiteRect.length - 1) {
            // queue up the placement of a grass-block here
            plan_steps.push(new PlaceBlock(Material.GRASS, {x, y, z}));
         }
      }

      function cut_doorway() {
         var a = [buildSiteRect.x + 1, (buildSiteRect.y + buildSiteRect.height), buildSiteRect.z - 1];
         var b = [buildSiteRect.x + 1, (buildSiteRect.y + buildSiteRect.height), buildSiteRect.z - 2];
         [a, b] = [a, b].map(([x, y, z]) => {x, y, z});

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