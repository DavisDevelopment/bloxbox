var v = require("./blockdata"), Material = v.Material;

// var World = require('./world').World;
/**
 * Grows a tree at a given position in the world. The tree is grown
 * upwards, centered on the specified position, and consists of a
 * trunk and a canopy of leaves.
 * @param {WorldData} world world to grow the tree in
 * @param {number} x x position of the tree
 * @param {number} y y position of the tree
 * @param {number} z z position of the tree
 */
function grow_tree(e, r, t, a) {
    try {
        var l = e.data;
        // Check if the block at the specified position is a sapling
        if (l.getBlockType(r, t, a) === Material.SAPLING) {
            for (let e = 0; e < 5; e++) 
            // Set each block in the tree to wood
            l.setBlock(r, t, a + 1, Material.WOOD);
            // Set the top block of the tree to leaves
            l.setBlock(r, t, 1 + a + 5, Material.LEAVES);
        }
    } catch {}
}

module.exports.grow_tree = grow_tree;
