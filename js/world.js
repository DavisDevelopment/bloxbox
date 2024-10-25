
var nj = require('numjs');
var _ = require('underscore');
var vd = require('./voxeldata');
var Material = vd.Material;
var BlockData = vd.BlockData;

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
}

module['exports']['World'] = World;
module['exports']['Material'] = Material;