
const _ = require('underscore');
const v = require('./voxeldata');
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

   isLandOwner() {
      if (this.territory === null) {
         return false;
      }
      else if (this.master == null) {
         return true;
      }
      else {
         return false;
      }
   }

   getKing() {
      if (this.master === null) {
         return this;
      }
      
      return this.master.getKing();
   }

   tick(world, n) {
      this.world = world;

      const blocks = world.voxelMaterialData;

      if (!this._activePath) {
         var targetPos = { x: 0, y: 0, z: blocks.getSunlitBlockAt(0, 0) };
         var ast = new pf.AStar(this.world, _.clone(this.pos), targetPos);

         this._activePath = ast.findpath();

         console.log(this._activePath);
      }
   }
}

const pf = require('./pathfinding');


module.exports['Person'] = Person;