
const _ = require('underscore');
const v = require('./voxeldata');
const Material = v.Material;

const non_solids = ['air', 'water'].map(x => Material.getMaterialByName(x));

// solid materials. e.g. materials which can be walked on, but not walked through
const solid_materials = _.without(Material.all().map(x=>x.toLowerCase()), ...non_solids).map(Material.getMaterialByName);

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

function getTraversibleNeighbors(world, x, y, z) {
   var vmd = world.voxelMaterialData;
   var results = [];
   function canWalkTo(x, y, z) {
      return (
         vmd.isValidCoord(x, y, z) &&
         isSolid(world, x, y, z)
      );
   }
   function pos(x, y, z) {return {x:x, y:y, z:z}}
   function visit(x, y, z) {
      if (canWalkTo(x, y, z)) {
         results.push(pos(x, y, z));
      }
   }

   // forward
   visit(x, y+1, z);
   //backward
   visit(x, y-1, z);
   //right
   visit(x+1, y, z);
   //left
   visit(x-1, y, z);
   //up
   visit(x, y, z-1);
   //down
   visit(x, y, z+1);

   return results;
}

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

   /**
    * get list of Nodes representing valid coordinate nodes which are accessibly adjacent to the given node
    * @param {Node} node
    */
   getNeighbors(node, grid=null) {
      var neighbors = getTraversibleNeighbors(this.world, node.x, node.y, node.z);
      return neighbors.map(toNode);
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