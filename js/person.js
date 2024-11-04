
const _ = require('underscore');
const v = require('./blockdata');
const Material = v.Material;
const behavior = require('./behavior');
const {BlockSelection} = require('./blockselection');

function uuid() {
   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
   });
}

const nn = (v) => (typeof v !== 'undefined' && v !== null);

class Entity {
   //
}

/*
TODO give Person an Inventory, so that they can hold blocks/items
*/
class Person extends Entity {
   constructor(world) {
      super();

      // the World into which this Person is being instantiated
      this.world = world;

      // the unique identifier String that will be used to store/retrieve this Person instance among others
      this.uid = uuid();

      // the position the Person is standing at
      this.pos = {x:0, y:0, z:0};

      // the community of Persons to which this instance belongs
      this.village = null;

      // the Person (where applicable) to which this one reports
      this.master = null;

      // a Set of block coordinates which this Person has laid claim to
      this.claimed_blocks = this.world.villagerPropertyClaims[this.uid] = new BlockSelection();

      // the object used to look up paths between points in the World
      this.pathfinder = new pf.AStar(this.world);

      // the object used to handle the items/blocks which are carried by this Person
      this.inventory = new Inventory();

      // the list of Task instances to be pinged at every tick
      //? this is the current rough-draft implementation, to be changed drastically I'm sure
      this.tasks = [
         //
      ];

      let launchWalkTask = new behavior.LaunchTask((person, n) => {
         console.log('Creating and launching the WalkPath task');

         var targetPos = {
            x: 0,
            y: 0,
            z: this.world.data.getSunlitBlockAt(0, 0)
         };

         let path = this.calcPathTo(targetPos.x, targetPos.y, targetPos.z);
         let walk = new behavior.WalkPath(path);

         var path_reversed = path.slice().reverse();
         let walk_back = new behavior.WalkPath(path_reversed);

         // create mutual "nextness" between these two walking tasks
         //? i.e. when one finishes, it forwards the other as the next task to be carried out
         walk.next_task = walk_back;
         walk_back.next_task = walk;

         return walk;
      });

      // this.addTask(launchWalkTask);
   }

   claimBlock(x, y, z) {
      // eventually, we're gonna want to check that no one else has claimed the block before we decide it's ours
      if (!this.claimed_blocks.contains(x, y, z)) {
         this.claimed_blocks.add(x, y, z);
      }
   }

   addTask(task, prepend=false) {
      if (prepend) {
         this.tasks.unshift(task);
      }
      else {
         this.tasks.push(task);
      }
   }

   clearTasks() {
      this.tasks = [];
   }

   setPos(x, y, z) {
      if (x != null) {
         this.pos.x = x;
      }
      if (y != null) {
         this.pos.y = y;
      }
      if (z != null) {
         this.pos.z = z;
      }
   }

   movePos(x, y, z) {
      this.setPos(
         this.pos.x + (x !== null ? x : 0),
         this.pos.y + (y !== null ? y : 0),
         this.pos.z + (z !== null ? z : 0)
      );
   }

   calcPathTo(x, y, z, opts=null) {
      const target_pos = {x:x, y:y, z:z};
      const start_pos = _.clone(this.pos);

      return this.pathfinder.findpath(start_pos, target_pos);
   }

   tick(world, n) {
      // this.world = world;

      const blocks = world.data;

      for (let i = 0; i < this.tasks.length; i++) {
         if (!this.tasks[i]) 
            continue;
         var task = this.tasks[i];
         this.tasks[i] = task.tick(this, n);
      }
   }


   /*
   use a grid-search to find the nearest N blocks of T material which are not inside of the BlockSelection named `exclude`
   */
  findNearestBlock(N, T, exclude=null) {
      const start_pos = _.clone(this.pos);
      const max_dist = 10;
      const max_iter = max_dist * max_dist;
      const results = [];

      for (let i = 0; i < max_iter && results.length < N; i++) {
         const x = start_pos.x + (i % max_dist) - (max_dist / 2);
         const y = start_pos.y + Math.floor(i / max_dist) - (max_dist / 2);
         const z = start_pos.z;
         const block_type = this.world.data.getBlockType(x, y, z);

         if (block_type === T && (exclude == null || !exclude.contains(x, y, z))) {
            results.push({x, y, z});
         }
      }

      return results;
   }

   buildHome() {
      var construction = new behavior.BuildHome(this, _.clone(this.pos));
      this.addTask(construction);

      var monitor_construction = (resolve, reject) => {
         const check_construction = setInterval(() => {
            if (construction.is_complete) {
               clearInterval(check_construction);
               resolve();
            }
         }, 100);
      };

      return new Promise(monitor_construction);
   }
}

const pf = require('./pathfinding');


module.exports['Person'] = Person;

/**
 * The Inventory class - provides block/item storage
 */
class Inventory {
   constructor() {
      this.n_slots = 16;
      this.slot_max_capacity = 64;
      this.slots = new Array(this.n_slots);
      this.equipped_index = 0;

      // initialize the slots
      for (var i = 0; i < this.slots.length; i++) {
         // items of the same type identifier will be grouped together and considered to be the same in general
         this.slots[i] = {
            type: null, // the type identifier for this slot
            count: 0, // the number of items stored in this slot
            item: null // the object representing the contents of the slot
         };
      }
   }

   getSlot(q) {
      if (typeof q === 'function') {
         return _.find(this.slots, q);
      }
      else {
         var qo = _.matcher(q);
         return this.getSlot(qo);
      }
   }

   hasItem(type) {
      //TODO
   }

   addItem(item, type=null, count=1) {
      if (type == null || typeof type !== 'string')
         throw new TypeError('type should be a String');

      // check if we already have a slot which is occupied by the given type
      const existingSlotOfThatType = _.find(this.slots, slot => slot.type === type);
      console.log(existingSlotOfThatType);

      // if we do
      if (existingSlotOfThatType != null) {
         // just sum the counts
         existingSlotOfThatType.count += count;

         //? maybe there's more to do, I can't think of it rn tho

         return true;
      }

      // if we do not
      else {
         // we'll find the first empty slot
         const firstEmptySlotIndex = _.findIndex(this.slots, slot => (slot.type == null));

         // if we have any empty slots
         if (firstEmptySlotIndex !== -1) {
            const slot = this.slots[firstEmptySlotIndex];
            slot.type = type;
            slot.count += count;
            slot.item = item;

            return true;
         }

         return false;
      }
   }

   resetSlot(slot) {
      slot.type = slot.item = null;
      slot.count = 0;
   }

   getCount(type) {
      return this.slots.filter(slot => (slot.type === type)).reduce((prev, curr) => prev + curr.count, 0);
   }
}

module.exports.Inventory = Inventory;