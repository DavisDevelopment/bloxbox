
var nj = require('numjs');
var _ = require('underscore');
var vd = require('./voxeldata');
var Material = vd.Material;
var BlockData = vd.BlockData;

var gen = require('./worldgen');

class World {
   constructor(config) {
      if (config == null) config = {};
      config = _.defaults(config, {
         size: [500, 500, 75],

      });

      let voxel_matrix_shape = config.size;
      let voxel_attributes = [
         'material'
      ];
      
      this.voxelMaterialData = new BlockData(
         voxel_matrix_shape[0],
         voxel_matrix_shape[1],
         voxel_matrix_shape[2]
      );

      this.entities = new Array();

      this.initialize_flatgrass();
   }

   getBlock(x, y, z) {
      return this.voxelMaterialData.getBlock(x, y, z);
   }

   getWidth() {
      return this.voxelMaterialData.width;
   }

   getHeight() {
      return this.voxelMaterialData.height;
   }

   getDepth() {
      return this.voxelMaterialData.depth;
   }

   initialize_flatgrass() {
      let vmd = this.voxelMaterialData;
      let width = vmd.width, height = vmd.height, depth = vmd.depth;

      for (let x = 0; x < width; x++) {
         for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
               if (z < 25) {
                  vmd.setBlock(x, y, z, Material.STONE);
               } 
               else if (z < 50) {
                  vmd.setBlock(x, y, z, Material.DIRT);
               } 
               else if (z === 50) {
                  vmd.setBlock(x, y, z, Material.GRASS);
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
      for (let i = 0; i < this.voxelMaterialData.blocks.length; i++) {
         var mat = this.voxelMaterialData.blocks[i];

         // occasionally plant saplings on top of 'sunlit' grass blocks
         if (mat == Material.GRASS && Math.random() < 0.000002) {
            var coords = this.voxelMaterialData.coords(i);

            // Check if the block above is directly under open sky before planting sapling
            if (this.voxelMaterialData.isSunlit(coords[0], coords[1], coords[2] + 1)) {
               // plant the sapling
               this.voxelMaterialData.setBlock(coords[0], coords[1], coords[2] + 1, Material.SAPLING);
            }
         }

         // occasionally grow saplings into trees
         if (mat == Material.SAPLING && Math.random() < 0.013) {
            var coords = this.voxelMaterialData.coords(i);
            gen.grow_tree(this, coords[0], coords[1], coords[2]);
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