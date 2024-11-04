let _ = require("underscore"), v = require("./blockdata"), geom = require("./geometry"), Material = v.Material, non_solids = [ "air", "water" ].map(t => Material.getMaterialByName(t));

// solid materials. e.g. materials which can be walked on, but not walked through
var solid_materials = Material.all().map(Material.getMaterialByName).filter(t => !non_solids.includes(t));

console.log(non_solids, solid_materials);

let directions = {
    Forward: {
        x: 0,
        y: 1,
        z: 0
    },
    // Forward
    Backward: {
        x: 0,
        y: -1,
        z: 0
    },
    // Backward
    Right: {
        x: 1,
        y: 0,
        z: 0
    },
    // Right
    Left: {
        x: -1,
        y: 0,
        z: 0
    },
    // Left
    Up: {
        x: 0,
        y: 0,
        z: 1
    },
    // Up
    Down: {
        x: 0,
        y: 0,
        z: -1
    },
    // Down
    // ForwardRight: { x: 1, y: 1, z: 0 },  // Forward-Right
    // ForwardLeft: { x: -1, y: 1, z: 0 }, // Forward-Left
    // BackwardRight: { x: 1, y: -1, z: 0 }, // Backward-Right
    // BackwardLeft: { x: -1, y: -1, z: 0 },// Backward-Left
    // UpRight: { x: 1, y: 0, z: 1 },  // Up-Right
    // UpLeft: { x: -1, y: 0, z: 1 }, // Up-Left
    // DownRight: { x: 1, y: 0, z: -1 }, // Down-Right
    // DownLeft: { x: -1, y: 0, z: -1 },// Down-Left
    // ForwardUp: { x: 0, y: 1, z: 1 },  // Forward-Up
    // ForwardDown: { x: 0, y: 1, z: -1 }, // Forward-Down
    // BackwardUp: { x: 0, y: -1, z: 1 }, // Backward-Up
    // BackwardDown: { x: 0, y: -1, z: -1 },// Backward-Down
    RightUp: {
        x: 1,
        y: 0,
        z: 1
    },
    // Right-Up
    RightDown: {
        x: 1,
        y: 0,
        z: -1
    },
    // Right-Down
    LeftUp: {
        x: -1,
        y: 0,
        z: 1
    },
    // Left-Up
    LeftDown: {
        x: -1,
        y: 0,
        z: -1
    }
}, block = (t, ...s) => t.data.isWithinBounds(...s) ? t.data.getBlockType(...s) : null, isSolid = (t, s, e, i) => _.contains(solid_materials, block(t, s, e, i));

class Node {
    constructor(t, s, e, i = !0) {
        if (void 0 === t) throw new Error("x=" + t);
        if (void 0 === s) throw new Error("y=" + s);
        if (void 0 === e) throw new Error("z=" + e);
        this.x = t, this.y = s, this.z = e, this.walkable = i, // can this Node be stood upon
        this.gCost = 1 / 0, // Cost from start to this node
        this.hCost = 0, // Heuristic-estimated cost from this node to end node
        this.parent = null, // For path reconstruction. This is a reference to the previous Node in the path, I think
        // The Nodes to which this Node has been determined to be adjacent
        this.neighbors = {};
    }
    isConnectedTo(t) {
        return t != this && (t = t.key, this.neighbors.hasOwnProperty(t));
    }
    connectTo(t, s = !1) {
        var e = t.key;
        this.neighbors[e] = s ? "mutual" : "not mutual", s && t.connectTo(this, !1);
    }
    get fCost() {
        return this.gCost + this.hCost;
    }
    get key() {
        return this._key || (this._key = `${this.x},${this.y},` + this.z), this._key;
    }
}

function pkey(t, s, e) {
    return t + `,${s},` + e;
}

class AStar {
    constructor(t) {
        this.world = t, this.start_pos = null, this.end_pos = null, 
        /*
      valid moves between blocks will be stored here
      as in `this.connections[poskey(pos)] = 
      */
        this._nodes = {};
    }
    poskey(t) {
        return pkey(t.x, t.y, t.z);
    }
    _nodeFor(t, s = null, e = null) {
        var i = "string" == typeof t && null == s && null == e ? t : pkey(t, s, e);
        return this._nodes.hasOwnProperty(i) ? this._nodes[i] : (t = new Node(t, s, e, !0), 
        this._nodes[i] = t);
    }
    heuristic(t, s) {
        // //TODO change this to the manhattan distance between the two points
        // return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
        return dist3d(t.x, t.y, t.z, s.x, s.y, s.z);
    }
    visit(t) {
        if (!this.visited.has(this.poskey(t))) {
            if (!this.world.data.isValidCoord(t.x, t.y, t.z)) return !1;
            this.visited.add(this.poskey(t));
        }
        return !0;
    }
    canWalkTo(t, s, e) {
        var i = this.world;
        return i.data.isWithinBounds(t, s, e) && isSolid(i, t, s, e);
    }
    isStandable(t, s, e, i) {
        // check that the block above the given position is AIR
        var t = t.data;
        return !(!t.isWithinBounds(s, e, i) || !t.isWithinBounds(s, e, i - 1)) && (t.getBlockType(s, e, i), 
        t = t.getBlockType(s, e, i - 1), Material.AIR, t == Material.AIR);
    }
    isValidMove(t, s, e, i, o, r) {
        var n;
        return (t !== i || s !== o || e !== r) && !(2 < dist3d(t, s, e, i, o, r) || (n = this.world, 
        t = this.isStandable(n, t, s, e), s = this.isStandable(n, i, o, r), !t) || !s);
    }
    getNeighbors(t, s = 0) {
        t.key;
        // if (!this.neighborCache) this.neighborCache = {};
        var e, i = this.world.data, o = [];
        // when the motion of one's bowels are foamy, you know that's not your homie
        for (e of _.keys(directions)) {
            var r = geom.ptsum(t, directions[e]);
            i.isWithinBounds(r.x, r.y, r.z) && this.isValidMove(t.x, t.y, t.z, r.x, r.y, r.z) && o.push(this._nodeFor(r.x, r.y, r.z));
        }
        // this.neighborCache[nckey] = results;
        return o;
    }
    findpath(t, s, e = 0, i) {
        // Reset the costs on all cached Nodes
        _.each(this._nodes, t => {
            t.gCost = 1 / 0, t.hCost = 0, t.parent = null;
        }), 
        //! will necessitate a BlockModJournal class of some kind to implement
        this.start_pos = t, this.end_pos = s;
        var o = [], r = new Set(), t = this._nodeFor(this.start_pos.x, this.start_pos.y, this.start_pos.z);
        if (0 == this.getNeighbors(t).length) throw new Error("We cannot move in any direction from here. Where are we?!");
        var n = this._nodeFor(this.end_pos.x, this.end_pos.y, this.end_pos.z);
        for (console.log(`Plotting path from ${t.key} to ` + n.key), o.push(t), 
        t.gCost = 0, t.hCost = this.heuristic(t, n); 0 < o.length; ) {
            // sort the open nodes by fCost
            o.sort((t, s) => t.fCost - s.fCost);
            var a = o.shift();
            // If we have reached a suitable target position
            if (console.log(a), pteq(a, n)) 
            // reconstruct and return the path
            return this.reconstructPath(a);
            // If we have not, then mark the node as 'closed', since we know it's not what we're looking for
            r.add(a);
            // Now we're going to scan the adjacent nodes which can be navigated to
            var h, l, d = this.getNeighbors(a);
            console.log(d.length);
            for (h of d) 
            // skip the node if we've already checked it before
            r.has(h) || (l = a.gCost + 1) < h.gCost && (h.parent = a, h.gCost = l, 
            h.hCost = this.heuristic(h, n), o.includes(h) || o.push(h));
        }
        return console.log("nope"), [];
    }
    reconstructPath(t) {
        var s = [];
        let e = t;
        for (;e; ) s.push(e), e = e.parent;
        //console.log('ween');
        return s.reverse();
    }
}

function pteq(t, s) {
    return t.x === s.x && t.y === s.y && t.z === s.z;
}

/**
 * Calculate the Euclidean distance between two points in 3D space.
 */
function dist3d(t, s, e, i, o, r) {
    t -= i, i = s - o, s = e - r;
    return Math.sqrt(t * t + i * i + s * s);
}

module.exports.AStar = AStar, module.exports.pteq = pteq;
