
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
            vd.setBlock(x, y, z-i, Material.WOOD);
         }

         /*
         // Set the top block of the tree to leaves
         vd.setBlock(x, y, z + treeHeight, Material.LEAVES);

         // Grow a square of leaves around the WOOD block right below the top of the tree
         for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
               vd.setBlock(x + i, y + j, z - treeHeight + 1, Material.LEAVES);
            }
         }

         // Grow a 2-block-thick, 2-block-tall square of leaves below
         for (let h = 1; h <= 2; h++) {
            for (let i = -2; i <= 2; i++) {
               for (let j = -2; j <= 2; j++) {
                  vd.setBlock(x + i, y + j, z - treeHeight - h, Material.LEAVES);
               }
            }
         }
         */
      }
   }
   catch {
      return ;
   }
}
module.exports['grow_tree'] = grow_tree;