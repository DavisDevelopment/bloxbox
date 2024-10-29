
const _ = require('underscore');
const v = require('./blockdata');
const Material = v.Material;
const behavior = require('./behavior');

class Entity {
   //
}

class Person extends Entity {
   //TODO constructor
   constructor() {
      super();

      this.pos = {x:0, y:0, z:0};

      this.territory = null;
      this.master = null;
      this.tasks = [
         new behavior.LaunchTask((person, n) => {
            console.log('peen');
            var targetPos = { x: 0, y: 0, z: this.world.data.getSunlitBlockAt(0, 0) + 1 };

            let path = this.calcPathTo(targetPos.x, targetPos.y, targetPos.z);
            let walk = new behavior.WalkPath(path);

            var revpath = path.slice().reverse();
            let walk_back = walk.next_task = new behavior.WalkPath(revpath);
            walk_back.next_task = walk;

            return walk;
         })
      ];
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
      var ast = new pf.AStar(this.world);

      return ast.findpath(_.clone(this.pos), {x:x, y:y, z:z}, null, opts);
   }

   tick(world, n) {
      this.world = world;

      const blocks = world.data;

      for (let i = 0; i < this.tasks.length; i++) {
         if (!this.tasks[i]) continue;
         var task = this.tasks[i];
         this.tasks[i] = task.tick(this, n);
      }
   }
}

const pf = require('./pathfinding');


module.exports['Person'] = Person;