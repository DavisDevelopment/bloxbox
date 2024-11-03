
const _ = require('underscore');
const v = require('./blockdata');
const Material = v.Material;
const pf = require('./pathfinding.js');
const pteq = pf.pteq;

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
   constructor(mvmt_path) {
      super();

      this.path = mvmt_path;
      this.current_node = 0;
   }

   tick(person, n) {
      super.tick(person);

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
         const oldBlockType = person.world.getBlockType(x, y, z);
         const blockItemType = Material.getMaterialName(oldBlockType);
         const blockItemCount = 1;

         const blockItemObject = {
            block_type: blockItemType,
         };

         // now, remove that block from the world, replacing it with air
         person.world.setBlockType(x, y, z, Material.AIR);

         // add the block into the person's inventory
         person.inventory.addItem(blockItemObject, blockItemType, blockItemCount);

         this.complete();
         return this.next_task;
      }

      // otherwise
      else {
         // walk there
         const path = person.calcPathTo(x, y, z);
         let walk = new WalkPath(path);

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
      const {x, y, z} = this.targetPosition;
      
      const distance = Math.sqrt(
         Math.pow(person.pos.x - x, 2) + 
         Math.pow(person.pos.y - y, 2) + 
         Math.pow(person.pos.z - z, 2)
      );

      // if the person is within range of the block
      if (distance <= 5) {
         // first, get some info about the block being taken
         const oldBlockType = person.world.getBlockType(x, y, z);
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
            person.world.setBlockType(x, y, z, this.blockToPlace);

            // complete this task
            this.complete();
            return this.next_task;
         }
      }

      // otherwise
      else {
         // walk there
         const path = person.calcPathTo(x, y, z);
         let walk = new WalkPath(path);

         // and then return to this task when we have completed that walk
         walk.next_task = this;
         return walk;
      }
   }
}
module.exports.PlaceBlock = PlaceBlock;