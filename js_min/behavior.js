let _ = require("underscore"), v = require("./blockdata"), Material = v.Material, pf = require("./pathfinding.js"), pteq = pf.pteq, geom = require("./geometry"), BlockSelection = require("./blockselection.js").BlockSelection;

class Task {
    constructor() {
        this.has_started = !1, this.running = !1, this.is_complete = !1, this.suspended = !1, 
        this.next_task = null;
    }
    begin() {
        this.has_started || (this.has_started = !0, this.running = !0);
    }
    complete() {
        this.has_started && this.running && !this.is_complete && (this.is_complete = !0, 
        this.has_started = this.running = !1);
    }
    tick(t) {
        return this.has_started || this.begin(), this;
    }
}

class WalkPath extends Task {
    constructor(t) {
        super(), this.path = t, this.current_node = 0;
    }
    tick(t, e) {
        // reset and proceed to the next task when we've reached the end of the path
        var s;
        // when we haven't reached the end of the path, move to the next position along the path
        return super.tick(t), 0 == this.path.length || pteq(t.pos, this.path[this.path.length - 1]) ? (this.current_node = 0, 
        this.complete(), this.next_task) : (s = this.path[this.current_node++], 
        t.setPos(s.x, s.y, s.z), this);
    }
}

class LaunchTask extends Task {
    constructor(t) {
        super(), this.f = t;
    }
    tick(t, e) {
        return this.f(t, e);
    }
}

module.exports.Task = Task, module.exports.WalkPath = WalkPath, module.exports.LaunchTask = LaunchTask;

class MineBlock extends Task {
    constructor(t) {
        super(), this.targetBlock = t;
    }
    tick(t, e) {
        var s, i, {
            x: a,
            y: r,
            z: o
        } = this.targetBlock;
        // Calculate the distance between the person and the target block
        // if the person is within range of the block
        return Math.sqrt(Math.pow(t.pos.x - a, 2) + Math.pow(t.pos.y - r, 2) + Math.pow(t.pos.z - o, 2)) <= 5 ? (i = t.world.getBlockType(a, r, o), 
        s = {
            block_type: i = Material.getMaterialName(i)
        }, 
        // now, remove that block from the world, replacing it with air
        t.world.setBlockType(a, r, o, Material.AIR), 
        // add the block into the person's inventory
        t.inventory.addItem(s, i, 1), this.complete(), this.next_task) : (s = t.calcPathTo(a, r, o), 
        // and then return to this task when we have completed that walk
        (i = new WalkPath(s)).next_task = this, i);
    }
}

module.exports.MineBlock = MineBlock;

class PlaceBlock extends Task {
    constructor(t, e) {
        super(), this.targetPosition = e, this.blockToPlace = t;
    }
    tick(t, e) {
        var s, {
            x: i,
            y: a,
            z: r
        } = this.targetPosition;
        // if the person is within range of the block
        return Math.sqrt(Math.pow(t.pos.x - i, 2) + Math.pow(t.pos.y - a, 2) + Math.pow(t.pos.z - r, 2)) <= 5 ? (s = t.world.getBlockType(i, a, r), 
        Material.getMaterialName(s), null != (s = t.inventory.getSlot({
            type: Material.getMaterialName(this.blockToPlace)
        })) ? (s.count--, 0 == s.count && player.inventory.resetSlot(s), 
        // set the block in the world
        t.world.setBlockType(i, a, r, this.blockToPlace), 
        // complete this task
        this.complete(), this.next_task) : void 0) : (s = t.calcPathTo(i, a, r), 
        // and then return to this task when we have completed that walk
        (t = new WalkPath(s)).next_task = this, t);
    }
}

module.exports.PlaceBlock = PlaceBlock;

/*

*/
class BuildHome extends Task {
    constructor(t, e) {
        super(), this.person = t, this.targetPosition = e, this.subtasks = null, 
        this.currentTask = null, this.build_plan();
    }
    build_plan() {
        // the most basic possible home is a 5x5x4 rectangle made of grass blocks, so in order to build one, we'll need to:
        // 1) calculate the number of grass blocks needed to fill the outermost layer of the planned rectangle
        var t = this.person.world.data, i = new geom.Rect3D(this.targetPosition.x, this.targetPosition.y, this.targetPosition.z, 4, 5, 5), a = new BlockSelection(), r = (a.addRect3D(i), 
        []), e = this.person.inventory.getCount(Material.GRASS);
        if (e < 82) 
        // create a MineBlock task for each of the building material locations
        for (
        // 2.1) if we do not, go and mine the remaining required number of grass blocks somewhere nearby
        // remaining required number of blocks
        var o = this.person.findNearestBlock(82 - e, Material.GRASS, a), n = 0
        // list of coordinates of grass blocks nearby
        ; n < o.length; n++) {
            let {
                x: t,
                y: e,
                z: s
            } = o[n];
            r.push(new MineBlock({
                x: t,
                y: e,
                z: s
            }));
        }
        // 3) mine all non-air blocks inside our build site
        for (var s = i, l = s.x + 1; l < s.width - 1; l++) for (var h = s.y + 1; h < s.height - 1; h++) for (var c = s.z + 1; c < s.length - 1; c++) t.getBlockType(l, h, c) !== Material.AIR && r.push(new MineBlock({
            x: l,
            y: h,
            z: c
        }));
        // 4) place our grass blocks around the outer layer of our selected rectangle
        // checking one more time that we, in fact, do have enough materials
        if (82 <= this.person.inventory.getCount(Material.GRASS)) 
        // iterate over every point on the build site
        for (let [ t, e, s ] of a.all()) 
        // if these coordinates are along the outer edge of the build site rectangle
        t !== i.x && e !== i.y && s !== i.z && t !== i.width - 1 && e !== i.height - 1 && s !== i.length - 1 || 
        // queue up the placement of a grass-block here
        r.push(new PlaceBlock(Material.GRASS, {
            x: t,
            y: e,
            z: s
        }));
        //TODO finally, remove 2 blocks from a randomly selected wall, forming a door
        // 5) link all of the subtasks in the plan end-to-end
        for (var u = r[0], n = 1; n < r.length; n++) u.next_task = r[n], u = r[n];
        this.subtasks = r, this.currentTask = r[0];
    }
    tick() {
        return super.tick(this.person), null != this.currentTask ? (this.currentTask.tick(this.person, 1), 
        this.currentTask.is_complete && (this.currentTask = this.currentTask.next_task), 
        this) : null;
    }
}

module.exports.BuildHome = BuildHome;
