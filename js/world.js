
var nj = require('numjs');
var _ = require('underscore');
var vd = require('./blockdata');
var Material = vd.Material;
var BlockData = vd.BlockData;

var wd = require('./blockdata');
var gen = require('./worldgen');

const geom = require('./geometry');
// import {BlockSelection} from './blockselection';
const {BlockSelection} = require('./blockselection');

class World {
   constructor(config) {
      if (config == null) config = {};

      config = _.defaults(config, {
         size: [500, 500, 75],
      });

      let voxel_matrix_shape = config.size;
      
      this.data = new wd.WorldData(
         Math.floor(voxel_matrix_shape[0]/wd.CHUNK_WIDTH),
         Math.floor(voxel_matrix_shape[1]/wd.CHUNK_HEIGHT)
      );
      
      this.entities = new Array();
      
      //TODO set all blocks to grass


      // Mapping from villager uids to the BlockSelections that comprise their respective property claims
      this.villagerPropertyClaims = {};
   }

   getEntity(q) {
      return _.find(this.entities, e => _.isMatch(e, q));
   }

   getEntities(q) {
      const qf = _.matcher(q);
      return this.entities.filter(qf);
   }

   getBlock(x, y, z) {
      return this.data.getBlockType(x, y, z);
   }

   getWidth() {
      return this.data.width;
   }

   getHeight() {
      return this.data.height;
   }

   getDepth() {
      return this.data.depth;
   }

   initialize_flatgrass() {
      let vmd = this.data;
      let width = vmd.width, height = vmd.height, depth = vmd.depth;

      console.log(`World dimensions - Width: ${width}, Height: ${height}, Depth: ${depth}`);
      const put = (x,y,z,type)=>{vmd.setBlockType(x,y,z,type);}

      // put down the blocks of the world
      for (let x = 0; x < width; x++) {
         for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
               if (z <= 3) {
                  put(x, y, z, Material.AIR);
               }
               else if (z === 4) {
                  put(x, y, z, Material.GRASS);
               }
               else if (z > 4) {
                  put(x, y, z, Material.STONE);
               }
               else if (z === depth-1) {
                  put(x, y, z, Material.WATER);
               }
            }
         }
      }
   }

   /**
    * Handle moment-to-moment world logic, like the growing of trees
    * and the processing of game ticks for Entities roaming about in our world
    * 
    * @param {int} n number of frames to process
    */
   tick(n) {
      // block-related logic
      for (let i = 0; i < this.data.chunks.length; i++) {
         for (let j = 0; j < this.data.chunks[i].length; j++) {
            for (let k = 0; k < this.data.chunks[i][j].length; k++) {
               var mat = this.data.chunks[i][j][k];

               // occasionally plant saplings on top of 'sunlit' grass blocks
               if (mat == Material.GRASS && Math.random() < 0.000002) {
                  var coords = this.data.coords(i, j, k);

                  // Check if the block above is directly under open sky before planting sapling
                  if (this.data.isSunlit(coords[0], coords[1], coords[2] + 1)) {
                     // plant the sapling
                     this.data.setBlockType(coords[0], coords[1], coords[2] + 1, Material.SAPLING);
                  }
               }

               // occasionally grow saplings into trees
               if (mat == Material.SAPLING && Math.random() < 0.013) {
                  var coords = this.data.coords(i, j, k);
                  gen.grow_tree(this, coords[0], coords[1], coords[2]);
               }
            }
         }
      }

      // entity-related logic
      for (let j = 0; j < this.entities.length; j++) {
         let e = this.entities[j];

         if (typeof e.tick !== 'function') {
            continue;
         }

         e.tick(this, n);
      }
   }
}

module['exports']['World'] = World;
module['exports']['Material'] = Material;

function test_world() {
   var w = new World();
   console.log(`World Dimensions - Width: ${w.getWidth()}, Height: ${w.getHeight()}, Depth: ${w.getDepth()}`);

   w.data.forEachBlock({}, (x, y, z) => {
      if (z === 5) {
         w.data.setBlockType(x, y, z, Material.GRASS);
      } else {
         w.data.setBlockType(x, y, z, Material.AIR);
      }
   });

   w.tick(1);
   
   
}
