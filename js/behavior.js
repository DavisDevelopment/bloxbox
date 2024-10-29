
const _ = require('underscore');
const v = require('./blockdata');
const Material = v.Material;
const pf = require('./pathfinding.js');
const pteq = pf.pteq;

class Task {
   constructor() {
      // this.running = false;
      // this.complete = false;
      // this.suspended = false;
      this.next_task = null;
   }

   tick(person) {

      return this;
   }
}

class WalkPath extends Task {
   constructor(mvmt_path) {
      super();

      this.path = mvmt_path;
      this.current_node = 0;
   }

   tick(person, n) {
      if (this.path.length == 0 || pteq(person.pos, this.path[this.path.length - 1])) {
         this.current_node = 0;
         return this.next_task;
      }

      var target = this.path[this.current_node++];

      person.setPos(target.x, target.y, target.z);

      return this;
   }
}

class LaunchTask extends Task {
   constructor(launch) {
      super();
      this.f = launch;
   }

   tick(person, n) {
      return this.f(person, n);
   }
}

module.exports.Task=Task;
module.exports.WalkPath=WalkPath;
module.exports.LaunchTask=LaunchTask;