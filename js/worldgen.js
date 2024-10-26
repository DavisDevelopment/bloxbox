
var v = require('./voxeldata');
var Material = v.Material;
// var World = require('./world').World;

/**
 * Grows a tree at a given position in the world. The tree is grown
 * upwards, centered on the specified position, and consists of a
 * trunk and a canopy of leaves.
 * @param {World} world world to grow the tree in
 * @param {number} x x position of the tree
 * @param {number} y y position of the tree
 * @param {number} z z position of the tree
 */
function grow_tree(world, x, y, z) {
   try {
      const vd = world.voxelMaterialData;

      // Check if the block at the specified position is a sapling
      if (vd.getBlock(x, y, z) === Material.SAPLING) {
         // Grow a tree
         const treeHeight = 5;
         for (let i = 0; i < treeHeight; i++) {
            // Set each block in the tree to wood
            vd.setBlock(x, y + i, z, Material.WOOD);
         }

         // Set the top block of the tree to leaves
         vd.setBlock(x, y + treeHeight, z, Material.LEAVES);

         const canopyRadius = 3;
         // Grow a little tree-top made of leaves around the top of the tree
         for (let dx = -canopyRadius; dx <= canopyRadius; dx++) {
            for (let dz = -canopyRadius; dz <= canopyRadius; dz++) {
               // Check if the block is within a circle of radius canopyRadius
               if (dx * dx + dz * dz <= canopyRadius * canopyRadius) {
                  // Set the block to leaves
                  vd.setBlock(x + dx, y + treeHeight, z + dz, Material.LEAVES);
               }
            }
         }
      }
   }
   catch {
      return ;
   }
}
module.exports['grow_tree'] = grow_tree;