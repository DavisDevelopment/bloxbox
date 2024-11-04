let _ = require("underscore"), v = require("./blockdata"), Material = v.Material, behavior = require("./behavior"), BlockSelection = require("./blockselection").BlockSelection;

function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(t) {
        var s = 16 * Math.random() | 0;
        return ("x" == t ? s : 3 & s | 8).toString(16);
    });
}

let nn = t => null != t;

class Entity {
    //
}
/*
TODO give Person an Inventory, so that they can hold blocks/items
*/

class Person extends Entity {
    constructor(t) {
        super(), 
        // the World into which this Person is being instantiated
        this.world = t, 
        // the unique identifier String that will be used to store/retrieve this Person instance among others
        this.uid = uuid(), 
        // the position the Person is standing at
        this.pos = {
            x: 0,
            y: 0,
            z: 0
        }, 
        // the community of Persons to which this instance belongs
        this.village = null, 
        // the Person (where applicable) to which this one reports
        this.master = null, 
        // a Set of block coordinates which this Person has laid claim to
        this.claimed_blocks = this.world.villagerPropertyClaims[this.uid] = new BlockSelection(), 
        // the object used to look up paths between points in the World
        this.pathfinder = new pf.AStar(this.world), 
        // the object used to handle the items/blocks which are carried by this Person
        this.inventory = new Inventory(), 
        // the list of Task instances to be pinged at every tick
        //? this is the current rough-draft implementation, to be changed drastically I'm sure
        this.tasks = [];
        new behavior.LaunchTask((t, s) => {
            console.log("Creating and launching the WalkPath task");
            var e = {
                x: 0,
                y: 0,
                z: this.world.data.getSunlitBlockAt(0, 0)
            }, e = this.calcPathTo(e.x, e.y, e.z), i = new behavior.WalkPath(e), e = e.slice().reverse(), e = new behavior.WalkPath(e);
            // create mutual "nextness" between these two walking tasks
            //? i.e. when one finishes, it forwards the other as the next task to be carried out
            return (i.next_task = e).next_task = i;
        });
        // this.addTask(launchWalkTask);
    }
    claimBlock(t, s, e) {
        // eventually, we're gonna want to check that no one else has claimed the block before we decide it's ours
        this.claimed_blocks.contains(t, s, e) || this.claimed_blocks.add(t, s, e);
    }
    addTask(t, s = !1) {
        s ? this.tasks.unshift(t) : this.tasks.push(t);
    }
    clearTasks() {
        this.tasks = [];
    }
    setPos(t, s, e) {
        null != t && (this.pos.x = t), null != s && (this.pos.y = s), null != e && (this.pos.z = e);
    }
    movePos(t, s, e) {
        this.setPos(this.pos.x + (null !== t ? t : 0), this.pos.y + (null !== s ? s : 0), this.pos.z + (null !== e ? e : 0));
    }
    calcPathTo(t, s, e, i = 0) {
        t = {
            x: t,
            y: s,
            z: e
        }, s = _.clone(this.pos);
        return this.pathfinder.findpath(s, t);
    }
    tick(t, s) {
        // this.world = world;
        var e;
        t.data;
        for (let t = 0; t < this.tasks.length; t++) this.tasks[t] && (e = this.tasks[t], 
        this.tasks[t] = e.tick(this, s));
    }
    /*
   use a grid-search to find the nearest N blocks of T material which are not inside of the BlockSelection named `exclude`
   */
    findNearestBlock(s, e, i = null) {
        var n = _.clone(this.pos), l = 10, o = [];
        for (let t = 0; t < 100 && o.length < s; t++) {
            var r = n.x + t % l - 5, a = n.y + Math.floor(t / l) - 5, h = n.z;
            this.world.data.getBlockType(r, a, h) !== e || null != i && i.containsBlock(r, a, h) || o.push({
                x: r,
                y: a,
                z: h
            });
        }
        return o;
    }
    buildHome() {
        var t = new behavior.BuildHome(this, _.clone(this.pos));
        this.addTask(t);
    }
}

let pf = require("./pathfinding");

module.exports.Person = Person;

/**
 * The Inventory class - provides block/item storage
 */
class Inventory {
    constructor() {
        this.n_slots = 16, this.slot_max_capacity = 64, this.slots = new Array(this.n_slots);
        // initialize the slots
        for (var t = this.equipped_index = 0; t < this.slots.length; t++) 
        // items of the same type identifier will be grouped together and considered to be the same in general
        this.slots[t] = {
            type: null,
            // the type identifier for this slot
            count: 0,
            // the number of items stored in this slot
            item: null
        };
    }
    getSlot(i) {
        if ("function" == typeof i) return _.find(this.slots, i);
        {
            let {
                i: t,
                type: s,
                item: e
            } = i;
            if (nn(t) && "number" == typeof t) return this.slots[t];
            var n;
            if (nn(s)) n = t => t.type === s; else {
                if (!nn(e)) throw new TypeError("Invalid q argument given: " + i);
                n = t => t.item == e;
            }
            return this.getSlot(n);
        }
    }
    hasItem(t) {
        //TODO
    }
    addItem(t, s = null, e = 1) {
        if (null == s || "string" != typeof s) throw new TypeError("type should be a String");
        // check if we already have a slot which is occupied by the given type
        var i = _.find(this.slots, t => t.type === s);
        // if we do
        return null != i ? (
        // just sum the counts
        i.count += e, !0) : 
        // if we have any empty slots
        -1 !== (i = _.findIndex(this.slots, t => null == t.type)) && ((i = this.slots[i]).type = s, 
        i.count += e, i.item = t, !0);
    }
    resetSlot(t) {
        t.type = t.item = null, t.count = 0;
    }
    getCount(t) {
        return this.slots.filter(t => t.type === Material.GRASS).reduce((t, s) => t + s.count, 0);
    }
}

module.exports.Inventory = Inventory;
