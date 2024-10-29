
const _ = require('underscore');
const v = require('./blockdata');
const geom = require('./geometry');
const Material = v.Material;

const non_solids = ['air', 'water'].map(x => Material.getMaterialByName(x));

// solid materials. e.g. materials which can be walked on, but not walked through
var solid_materials = Material.all().map(Material.getMaterialByName);
solid_materials = _.without(solid_materials, ...non_solids);

console.log('non-solids=', non_solids);
console.log('solids=', solid_materials);


const directions = {
   Forward: { x: 0, y: 1, z: 0 },   // Forward
   Backward: { x: 0, y: -1, z: 0 },  // Backward
   Right: { x: 1, y: 0, z: 0 },   // Right
   Left: { x: -1, y: 0, z: 0 },  // Left
   Up: { x: 0, y: 0, z: 1 },   // Up
   Down: { x: 0, y: 0, z: -1 },  // Down

   ForwardRight: { x: 1, y: 1, z: 0 },  // Forward-Right
   ForwardLeft: { x: -1, y: 1, z: 0 }, // Forward-Left
   BackwardRight: { x: 1, y: -1, z: 0 }, // Backward-Right
   BackwardLeft: { x: -1, y: -1, z: 0 },// Backward-Left

   UpRight: { x: 1, y: 0, z: 1 },  // Up-Right
   UpLeft: { x: -1, y: 0, z: 1 }, // Up-Left
   DownRight: { x: 1, y: 0, z: -1 }, // Down-Right
   DownLeft: { x: -1, y: 0, z: -1 },// Down-Left

   ForwardUp: { x: 0, y: 1, z: 1 },  // Forward-Up
   ForwardDown: { x: 0, y: 1, z: -1 }, // Forward-Down
   BackwardUp: { x: 0, y: -1, z: 1 }, // Backward-Up
   BackwardDown: { x: 0, y: -1, z: -1 },// Backward-Down

   RightUp: { x: 1, y: 0, z: 1 },  // Right-Up
   RightDown: { x: 1, y: 0, z: -1 }, // Right-Down
   LeftUp: { x: -1, y: 0, z: 1 }, // Left-Up
   LeftDown: { x: -1, y: 0, z: -1 },// Left-Down
};

const block = (world, ...args) => {
   if (world.data.isWithinBounds(...args)) {
      return world.data.getBlockType(...args);
   }
   return null;
};

const isSolid = (world, x, y, z) => _.contains(solid_materials, block(world, x, y, z));
const isBelowAir = (world, x, y, z) => (block(world, x, y, z - 1) == Material.AIR);


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

      // Connections stored by 'key' with mutual status
      this.connections = {};
   }

   isConnectedTo(other) {
      if (other == this) return false;

      const otherKey = other.key;
      return this.connections.hasOwnProperty(otherKey);
   }

   connectTo(other, mutual = false) {
      const otherKey = other.key;
      this.connections[otherKey] = mutual ? "mutual" : "not mutual";

      if (mutual) {
         other.connectTo(this, false);
      }
   }

   get fCost() {
      return this.gCost + this.hCost;
   }

   // _getKey(node) {
   //    return `${node.x},${node.y},${node.z}`;
   // }
   get key() {
      return `${this.x},${this.y},${this.z}`;
   }
}

const toNode = (pos) => {
   if (pos instanceof Node) {
      return pos;
   } else {
      return new Node(pos.x, pos.y, pos.z, true);
   }
}

function pkey(x, y, z) {
   return `${x},${y},${z}`;
}

class AStar {
   constructor(world) {
      this.world = world;
      this.start_pos = null;
      this.end_pos = null;

      /*
      valid moves between blocks will be stored here
      as in `this.connections[poskey(pos)] = 
      */
      this._nodes = {};
   }

   poskey(pos) {
      return pkey(pos.x, pos.y, pos.z);
   }

   _nodeFor(x, y=null, z=null) {
      var k;
      if (typeof x === 'string' && y == null && z == null) {
         k = x;
      }
      else {
         k = pkey(x, y, z);
      }

      if (_.has(this._nodes, k)) {
         return this._nodes[k];
      }
      else {
         var node = new Node(x, y, z, true);
         this._nodes[k] = node;
         return node;
      }
   }

   heuristic(a, b) {
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
   }

   visit(pos) {
      if (this.visited.has(this.poskey(pos))) {
         return true;
      }

      if (!this.world.data.isValidCoord(pos.x, pos.y, pos.z)) {
         return false;
      }

      this.visited.add(this.poskey(pos));
      return true;
   }

   

   canWalkTo(x, y, z) {
      const world = this.world;
      const vmd = world.data;
      return (
         vmd.isWithinBounds(x, y, z) &&
         isSolid(world, x, y, z)
      );
   }

/**
 * Determines if a move from one block to another is valid.
 *
 * A move is considered valid if the two blocks are adjacent in 3D space,
 * there are no solid blocks at the specified coordinates (ax, ay, az) and (bx, by, bz), 
 * and there are solid blocks directly below them. Additionally, if the nodes
 * representing these blocks are already connected, the move is valid.
 *
 * If the move is valid, it establishes a mutual connection between the nodes, preventing the need for adjacency checks and the like for subsequent calls
 *
 * @param {number} ax - The x-coordinate of the starting block.
 * @param {number} ay - The y-coordinate of the starting block.
 * @param {number} az - The z-coordinate of the starting block.
 * @param {number} bx - The x-coordinate of the destination block.
 * @param {number} by - The y-coordinate of the destination block.
 * @param {number} bz - The z-coordinate of the destination block.
 * @returns {boolean} - Returns true if the move is valid, false otherwise.
 */
   // _isValidMove(ax, ay, az, bx, by, bz) {
   //    var apos = {x: ax, y: ay, z: az};
   //    var bpos = {x: bx, y: by, z: bz};


   // }
   isValidMove(ax, ay, az, bx, by, bz) {
      if (ax === bx && ay === by && az === bz) {
         return false;
      }

      var a = this._nodeFor(ax, ay, az);
      var b = this._nodeFor(bx, by, bz);
      if (a.isConnectedTo(b) || b.isConnectedTo(a)) {
         return true;
      }

      if (dist3d(ax, ay, az, bx, by, bz) > 2) {
         console.log(`(${ax},${ay},${az})  and  (${bx},${by},${bz}) are not adjacent`);
         return false;
      }

      const world = this.world;
      var apos = {x:ax, y:ay, z:az};

      var is_a_standable = (!isSolid(world, ax, ay, az) && isSolid(world, ax, ay, az - 1));
      var is_b_standable = (!isSolid(world, bx, by, bz) && isSolid(world, bx, by, bz - 1));

      let validity = (is_a_standable && is_b_standable);
      if (validity) {
         a.connectTo(b, true);
         b.connectTo(a, true);
      }

      return validity;
   }

   getNeighbors(node, grid = null) {
      const me = this;
      if (!this.neighborCache) this.neighborCache = {};

      const nckey = this.poskey(node);
      if (_.has(this.neighborCache, nckey)) {
         return this.neighborCache[nckey];
      }

      const world = this.world;
      var x = node.x, y = node.y, z = node.z;

      var vmd = world.data;
      var results = [];
      
      const visit = (x, y, z) => {
         const dirpt = geom.ptdiff(node, {x:x, y:y, z:z});
         const npt = geom.ptsum(node, dirpt);
         const neighborBlockType = this.world.data.getBlockType(npt.x, npt.y, npt.z);

         var direction_name = _.findKey(directions, v => pteq(v, dirpt));
         console.log(`Direction: ${direction_name||JSON.stringify(dirpt)}, Block type: ${neighborBlockType}`);

         if (me.isValidMove(node.x, node.y, node.z, x, y, z)) {
            results.push(new Node(x, y, z, true));
         }
      }


      // visit(x, y + 1, z);//Forward
      // visit(x, y - 1, z);//Backward
      // visit(x + 1, y, z);//Left
      // visit(x - 1, y, z);//Right

      // visit(x + 1, y, z - 1);//Left/Down
      // visit(x - 1, y, z - 1);
      // visit(x, y + 1, z - 1);
      // visit(x, y - 1, z - 1);

      // visit(x + 1, y, z + 1);
      // visit(x - 1, y, z + 1);
      // visit(x, y + 1, z + 1);
      // visit(x, y - 1, z + 1);

      for (let k of _.keys(directions)) {
         var p = geom.ptsum(node, directions[k]);
         var blockType = Material.getMaterialName(this.world.data.getBlockType(p.x, p.y, p.z));
         console.log(`${k}: ${blockType}`);
         
         if (this.isValidMove(node.x, node.y, node.z, p.x, p.y, p.z)) {
            results.push(new Node(x, y, z, true));
         }
      }

      this.neighborCache[nckey] = results;

      return results;
   }

   findpath(start_pos, end_pos, grid = null, options=null) {
      // Reset the costs on all cached Nodes
      _.each(this._nodes, (node) => {
         node.gCost = Infinity;
         node.hCost = 0;
         node.parent = null;
      });

      options = options || {};
      //! will necessitate a BlockModJournal class of some kind to implement
      const can_modify = options.can_modify || false; // whether block placement/removal may be part of the 'path'
      const one_way = options.one_way || false; // should one-way paths be considered. i.e. jumping down to a position we couldn't have walked to

      this.start_pos = start_pos;
      this.end_pos = end_pos;

      const openSet = [];
      const closedSet = new Set();

      var start = this._nodeFor(this.start_pos.x, this.start_pos.y, this.start_pos.z);
      var end = this._nodeFor(this.end_pos.x, this.end_pos.y, this.end_pos.z);
      console.log(`Plotting path from ${start.key} to ${end.key}`);

      openSet.push(start);

      start.gCost = 0;
      start.hCost = this.heuristic(start, end);

      while (openSet.length > 0) {
         openSet.sort((a, b) => a.fCost - b.fCost);
         
         const currentNode = openSet.shift();
         console.log(currentNode);

         // If we have reached a suitable target position
         if (pteq(currentNode, end)) {
            return this.reconstructPath(currentNode);
         }

         closedSet.add(currentNode);

         const neighbors = this.getNeighbors(currentNode);
         console.log(neighbors.length);

         for (const neighbor of neighbors) {
            if (_.any(closedSet, x => pteq(x, neighbor))) {
               continue;
            }

            const tentativeGCost = currentNode.gCost + 1;

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

      console.log('nope');
      return [];
   }

   reconstructPath(currentNode) {
      const path = [];

      let temp = currentNode;
      while (temp) {
         path.push(temp);

         temp = temp.parent;
      }

      console.log('ween');
      return path.reverse();
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
