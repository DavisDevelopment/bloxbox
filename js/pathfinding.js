
const _ = require('underscore');
const v = require('./voxeldata');
const Material = v.Material;

const non_solids = ['air', 'water'].map(x => Material.getMaterialByName(x));

// solid materials. e.g. materials which can be walked on, but not walked through
var solid_materials = Material.all().map(Material.getMaterialByName);
solid_materials = _.without(solid_materials, ...non_solids);

console.log('non-solids=', non_solids);
console.log('solids=', solid_materials);


const directions = [
   { x: 0, y: 1, z: 0 },   // Forward
   { x: 0, y: -1, z: 0 },  // Backward
   { x: 1, y: 0, z: 0 },   // Right
   { x: -1, y: 0, z: 0 },  // Left
   { x: 0, y: 0, z: -1 },   // Up
   { x: 0, y: 0, z: 1 },  // Down
];

const block = (world, ...args) => {
   if (world.voxelMaterialData.isValidCoord(...args)) {
      return world.getBlock(...args);
   }
   return null;
};
var isSolid = (world, x, y, z) => _.contains(solid_materials, block(world, x, y, z));
var isBelowAir = (world, x, y, z) => (block(world, x, y, z - 1) == Material.AIR);



class Node {
   constructor(x, y, z, walkable) {
      if (typeof x === 'undefined') throw new Error(`x=${x}`);
      if (typeof y === 'undefined') throw new Error(`y=${y}`);
      if (typeof z === 'undefined') throw new Error(`z=${z}`);

      this.x = x;
      this.y = y;
      this.z = z;

      this.walkable = walkable;
      this.gCost = Infinity; // Cost from start to this node
      this.hCost = 0; // Heuristic cost to end node
      this.parent = null; // For path reconstruction
   }

   get fCost() {
      return this.gCost + this.hCost;
   }
}

const toNode = (pos) => {
   if (pos instanceof Node) {
      return pos;
   } else {
      return new Node(pos.x, pos.y, pos.z, true);
   }
}

class AStar {
   constructor(world, start_pos, end_pos) {
      this.world = world;
      this.start_pos = start_pos;
      this.end_pos = end_pos;

      // this.visited = Set();
      console.log('start_block=', Material.getMaterialName(block(world, start_pos.x, start_pos.y, start_pos.z)));
      console.log('is_solid=', isSolid(world, start_pos.x, start_pos.y, start_pos.z));

      const endBlock = block(world, end_pos.x, end_pos.y, end_pos.z);
      if (isSolid(world, end_pos.x, end_pos.y, end_pos.z)) {
         throw new Error('end_pos must be a non-solid block');
      }
   }

   poskey(pos) {
      return `${pos.x},${pos.y},${pos.z}`;
   }

   heuristic(a, b) {
      // Using Manhattan distance for 3D
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
   }

   visit(pos) {
      if (this.visited.has(poskey(pos))) {
         return true;
      }

      // Check if the position is valid
      if (!this.world.voxelMaterialData.isValidCoord(pos.x, pos.y, pos.z)) {
         return false;
      }

      // do the stuff

      // record that we've already visited this position
      this.visited.add(poskey(pos));
      
      // Return true if the visit was successful
      return true;
   }

   reconstructPath(node) {
      //TODO
   }

   canWalkTo(x, y, z) {
      const world = this.world;
      const vmd = world.voxelMaterialData;
      return (
         vmd.isValidCoord(x, y, z) &&
         isSolid(world, x, y, z)
         // && isBelowAir(world, x, y, z)
         // && vmd.isSunlit(x, y, z)
      );
   }

   isValidMove(ax, ay, az, bx, by, bz) {
      if (ax === bx && ay === by && az === bz) {
         // non-movement is not valid
         return false;
      }

      // check that the two positions are adjacent
      if (dist3d(ax, ay, az, bx, by, bz) > 2) {
         console.log(`(${ax},${ay},${az})  and  (${bx},${by},${bz}) are not adjacent`);
         return false;
      }

      const world = this.world;

      // is position 'a' a non-solid block with a solid block underneath it
      var is_a_standable = (!isSolid(world, ax, ay, az) && isSolid(world, ax, ay, az - 1));

      // is position 'b' a non-solid block with a solid block underneath it
      var is_b_standable = (!isSolid(world, bx, by, bz) && isSolid(world, bx, by, bz - 1));

      let validity = (is_a_standable && is_b_standable);
      if (validity) {
         // console.log(`(${ax},${ay},${az})->(${bx},${by},${bz}) is a valid move`);
      }
      else {

      }
      return validity;
   }

   /**
    * get list of Nodes representing valid coordinate nodes which are accessibly adjacent to the given node
    * @param {Node} node
    */
   getNeighbors(node, grid=null) {
      const me = this;
      if (!this.neighborCache) this.neighborCache = {};

      const nckey = this.poskey(node);
      if (_.has(this.neighborCache, nckey)) {
         return this.neighborCache[nckey];
      }

      const world = this.world;
      var x = node.x, y = node.y, z = node.z;

      var vmd = world.voxelMaterialData;
      var results = [];
      
      function visit(x, y, z) {
         if (me.isValidMove(node.x, node.y, node.z, x, y, z)) {
            results.push(new Node(x, y, z, true));
         }
      }

      // forward
      visit(x, y + 1, z);
      //backward
      visit(x, y - 1, z);
      //right
      visit(x + 1, y, z);
      //left
      visit(x - 1, y, z);

      //up
      //visit(x, y, z - 1);
      //down
      //visit(x, y, z + 1);

      // up-right
      visit(x + 1, y, z - 1);
      // up-left
      visit(x - 1, y, z - 1);
      // up-forward
      visit(x, y + 1, z - 1);
      // up-backward
      visit(x, y - 1, z - 1);

      // down-right
      visit(x + 1, y, z + 1);
      // down-left
      visit(x - 1, y, z + 1);
      // down-forward
      visit(x, y + 1, z + 1);
      // down-backward
      visit(x, y - 1, z + 1);

      // results = results.map(toNode);

      this.neighborCache[nckey] = results;

      return results;
   }

   findpath(grid=null) {

      const openSet = [];
      const closedSet = new Set();

      var start = toNode(this.start_pos);
      var end = toNode(this.end_pos);

      openSet.push(start);

      start.gCost = 0;
      start.hCost = this.heuristic(start, end);

      while (openSet.length > 0) {
         // Sort openSet to get the node with the lowest fCost
         openSet.sort((a, b) => a.fCost - b.fCost);
         
         // yunk said node off the beginning of the list
         const currentNode = openSet.shift();

         // if currentNode is the goal point
         if (pteq(currentNode, end)) {
            // Reconstruct the path
            const path = [];

            let temp = currentNode;
            while (temp) {
               path.push(temp);
               temp = temp.parent;
            }
            
            // Return the path from start to end
            return path.reverse(); 
         }

         // assuming we haven't reached the end yet

         // 'close' current node
         closedSet.add(currentNode);

         const neighbors = this.getNeighbors(currentNode);
         if (neighbors.length == 0) {
            throw new Error('there should always be neighbors');
         }

         for (const neighbor of neighbors) {
            // if `neighbor` is in `closedSet`
            if (_.any(closedSet, x => pteq(x, neighbor))) {
               continue;
            }


            const tentativeGCost = currentNode.gCost + 1; // Assuming each step cost is 1

            if (tentativeGCost < neighbor.gCost) {
               neighbor.parent = currentNode;
               neighbor.gCost = tentativeGCost;
               neighbor.hCost = this.heuristic(neighbor, end);

               if (!openSet.includes(neighbor)) {
                  openSet.push(neighbor);
               }
            }
         }
      }

      // Return an empty path if no path is found
      return []; 
   }
}

module.exports.AStar = AStar;

function pteq(a, b) {
   return a.x === b.x && a.y === b.y && a.z === b.z;
}
module.exports.pteq = pteq;

/**
 * Calculate the Euclidean distance between two points in 3D space.
 */
function dist3d(ax, ay, az, bx, by, bz) {
   const dx = ax - bx;
   const dy = ay - by;
   const dz = az - bz;
   return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
