
const _ = require('underscore');
const v = require('./voxeldata');
const Material = v.Material;

class Task {
   constructor() {

   }

   tick(person) {

      return this;
   }
}

class WalkPath extends Task {
   constructor(mvmt) {
      super();

      this.goalpos = {x:x, y:y, z:z};
   }
}


function find_path(person, start_pos, end_pos) {
   var path = [];

   var start = {x: start_pos.x, y: start_pos.y};
   var end = {x: end_pos.x, y: end_pos.y};

   var current = start;
   while (!_.isEqual(current, end)) {
      path.push(current);

      if (current.x > end.x) {
         current.x--;
      } else if (current.x < end.x) {
         current.x++;
      } else if (current.y > end.y) {
         current.y--;
      } else if (current.y < end.y) {
         current.y++;
      }
   }

   path.push(end);

   return path;
}

function a_star(person, start_pos, end_pos) {
   const world = person.world;
   const blocks = world.voxelMaterialData;

   function getNeighbors(node) {
      var neighbors = [];
      var directions = [
         { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
         { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
         { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
      ];
      directions.forEach(function (dir) {
         var neighbor = { x: node.x + dir.x, y: node.y + dir.y, z: node.z + dir.z };
         if (blocks.isValidCoord(neighbor)) {
            neighbors.push(neighbor);
         }
      });
      console.log(neighbors);
      return neighbors;
   }

   var start = start_pos;
   var end = end_pos;

   var open_set = [start];
   var came_from = {};

   var g_score = {};
   g_score[start] = 0;

   var f_score = {};
   f_score[start] = heuristic(start, end);

    while (open_set.length > 0) {
      console.log(open_set);

      var current = open_set[0];
      for (var i = 1; i < open_set.length; i++) {
         if (f_score[open_set[i]] < f_score[current]) {
            current = open_set[i];
         }
      }

      if (current.x == end.x && current.y == end.y && current.z == end.z) {
         var path = [current];
         while (current in came_from) {
            current = came_from[current];
            path.unshift(current);
         }
         return path;
      }

      for (var i = 0; i < open_set.length; i++) {
         if (open_set[i].x == current.x && open_set[i].y == current.y && open_set[i].z == current.z) {
            open_set.splice(i,1);
            break;
         }
      }

      // Get a list of the current node's neighbors
      var neighbors = getNeighbors(current);
      // For each neighbor, if we haven't visited it yet, or if our current path
      // to the neighbor is shorter than a previously discovered path, then
      // update the neighbor's came_from and g_score values
      for (var i = 0; i < neighbors.length; i++) {
         var neighbor = neighbors[i];

         var tentative_g_score = g_score[current] + 1;

         if (neighbor in g_score && g_score[neighbor] <= tentative_g_score) {
            // This neighbor has already been visited and our new path to it
            // is not shorter than the previously discovered path, so skip it
            continue;
         }

         // Set the neighbor's came_from value to the current node
         came_from[neighbor] = current;
         // Set the neighbor's g_score value to the tentative g_score
         g_score[neighbor] = tentative_g_score;
         // Set the neighbor's f_score value to the g_score plus the heuristic
         // cost of moving from the neighbor to the end node
         f_score[neighbor] = g_score[neighbor] + heuristic(neighbor, end);

         // If the neighbor is not already in the open set, add it
         if (!_.contains(open_set, neighbor)) {
            open_set.push(neighbor);
         }
      }
   }

   return [];
}

function heuristic(a, b) {
   return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}



_.extend(module.exports, {
   a_star: a_star
});