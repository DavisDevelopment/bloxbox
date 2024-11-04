var __extends = this && this.__extends || (() => {
    var r = function(t, e) {
        return (r = Object.setPrototypeOf || ({
            __proto__: []
        } instanceof Array ? function(t, e) {
            t.__proto__ = e;
        } : function(t, e) {
            for (var o in e) Object.prototype.hasOwnProperty.call(e, o) && (t[o] = e[o]);
        }))(t, e);
    };
    return function(t, e) {
        if ("function" != typeof e && null !== e) throw new TypeError("Class extends value " + String(e) + " is not a constructor or null");
        function o() {
            this.constructor = t;
        }
        r(t, e), t.prototype = null === e ? Object.create(e) : (o.prototype = e.prototype, 
        new o());
    };
})(), assert = require("assert"), _ = require("underscore"), CHUNK_WIDTH = 16, CHUNK_HEIGHT = 16, CHUNK_DEPTH = 64, SECTION_HEIGHT = 16, UInt32 = 
// WAY premature check for the java ecosystem being available
// if (typeof java !== 'undefined') {
//    //check whether we're running in GraalVM and have access to Java types
//    var getJavaArrayClass = java?.lang?.Integer?.TYPE?.arrayClass;
//    try {
//       var JavaIntegerArray = getJavaArrayClass();
//       console.log(JavaIntegerArray);
//       return JavaIntegerArray;
//    }
//    catch (error) {
//       //
//    }
// }
"undefined" != typeof Uint32Array ? Uint32Array : "undefined" != typeof Buffer ? Buffer : Array, Material = module.exports.Material = {
    AIR: 0,
    STONE: 1,
    DIRT: 2,
    GRASS: 3,
    WOOD: 4,
    LEAVES: 5,
    SAPLING: 6,
    WATER: 7,
    all: function() {
        var t, e = [];
        for (t in Object.keys(Material)) t === t.toUpperCase() && "number" == typeof Material[t] && e.push(t);
        return e;
    },
    getMaterialName: function(t) {
        for (var e in Material) if (Material[e] === t) return e;
        throw new Error("No such material ".concat(t));
    },
    getMaterialByName: function(t) {
        t = ("" + t).toUpperCase();
        return Material[t];
    },
    getColorOf: function(t) {
        switch (
        // return material_color(material);
        t = "string" == typeof t ? Material.getMaterialByName(t) : t) {
          case Material.AIR:
            return "#FFFFFF";

          case Material.STONE:
            return "#808080";

          case Material.DIRT:
            return "#964B00";

          case Material.GRASS:
            return "#32CD32";

          case Material.WOOD:
            return "#A0522D";

          case Material.LEAVES:
            return "#006400";

          case Material.WATER:
            return "#0000FF";

          case Material.SAPLING:
            return "#FF00FF";

          default:
            throw new Error('"'.concat(t, '"'));
        }
    },
    validateMaterial: function(t) {
        if ("number" != typeof (t = "string" == typeof t ? Material.getMaterialByName(t) : t)) throw new Error('"'.concat(t, '"'));
        if (!Object.values(Material).includes(t)) throw new Error('"'.concat(t, '" is not a valid material id'));
    }
}, block_fields = [ "type", "light_level" ], BlockState = function() {}, BlockData = /** @class */ (() => {
    function t(t, e, o) {
        this.width = t, this.height = e, this.depth = o, 
        // Initialize blocks array with zeros
        this.data = new UInt32(t * e * o);
        for (var r = 0; r < this.data.length; r++) this.data[r] = 0;
        this.block_states = new Map();
    }
    // Convert 3D coordinates to a 1D index
    return t.prototype.index = function(t, e, o) {
        return t + e * this.width + o * this.width * this.height;
    }, 
    // Convert a 1D index to 3D coordinates
    /*
    private coords(index: number):[number, number, number] {
       const z = Math.floor(index / (this.width * this.height));
       const y = Math.floor((index % (this.width * this.height)) / this.width);
       const x = index % this.width;
       return [x, y, z];
    }
 
    // Get the block type at specified coordinates
    getBlockType(x: number, y: number, z: number): number {
       this.validateCoordinates(x, y, z);
       const i = this.index(x, y, z);
       if (this.data[i] == null) {
          (this.data as any)[i] = 0;
       }
       return this.data[i];
    }
 
    // Set the block type at specified coordinates
    setBlockType(x: number, y: number, z: number, blockType: number): void {
       this.validateCoordinates(x, y, z);
       // Ignore type errors here
       (this.data as unknown as number[])[this.index(x, y, z)] = blockType;
    }
    */
    // Adjust the coordinates conversion in BlockData
    t.prototype.coords = function(t) {
        var e = this.depth - 1 - Math.floor(t / (this.width * this.height)), o = Math.floor(t % (this.width * this.height) / this.width); // Adjusted for top-down
        return [ t % this.width, o, e ];
    }, 
    // Get the block type at specified coordinates
    t.prototype.getBlockType = function(t, e, o) {
        this.validateCoordinates(t, e, o);
        t = this.index(t, e, this.depth - 1 - o); // Adjusted for top-down
        return null == this.data[t] && (this.data[t] = 0), this.data[t];
    }, 
    // Set the block type at specified coordinates
    t.prototype.setBlockType = function(t, e, o, r) {
        this.validateCoordinates(t, e, o), this.data[this.index(t, e, this.depth - 1 - o)] = r;
    }, 
    // Check if the coordinates are within bounds
    t.prototype.validateCoordinates = function(t, e, o) {
        if (t < 0 || t >= this.width || e < 0 || e >= this.height || o < 0 || o >= this.depth) throw new RangeError("Coordinates out of bounds");
    }, 
    // Check if the coordinates are valid within bounds
    t.prototype.isValidCoord = function(t, e, o) {
        return 0 <= t && t < this.width && 0 <= e && e < this.height && 0 <= o && o < this.depth;
    }, 
    /*
     Return the lowest z-index which has a non-zero value
    */
    t.prototype.getSunlitBlockAt = function(t, e) {
        for (var o = this.depth - 1; 0 <= o; o--) if (0 !== this.getBlockType(t, e, o)) return o;
        return 0;
    }, 
    /*
     Check whether the block at the given coordinates has any non-air blocks above it
    */
    /*
     isSunlit(x: number, y: number, z: number): boolean {
        for (let z2 = z + 1; z2 < this.depth; z2++) {
           if (this.getBlockType(x, y, z2) !== 0) {
              return false;
           }
        }
  
        return true;
     }
     */
    // Get the dimensions of the block data
    t.prototype.getWidth = function() {
        return this.width;
    }, t.prototype.getHeight = function() {
        return this.height;
    }, t.prototype.getDepth = function() {
        return this.depth;
    }, t;
})(), ChunkSection = /** @class */ (n => {
    function i(t, e, o) {
        var r = n.call(this, i.SECTION_SIZE, i.SECTION_SIZE, i.SECTION_SIZE) || this;
        return r.pos = {
            x: t,
            y: e,
            z: o
        }, r;
    }
    return __extends(i, n), i.SECTION_SIZE = 16, i;
})(BlockData), Chunk = /** @class */ (() => {
    function i(t, e) {
        this.sections = [];
        var o = i.CHUNK_HEIGHT / i.SECTION_HEIGHT;
        this.pos = {
            x: t,
            y: e
        };
        for (var r = 0; r < o; r++) this.sections.push(new ChunkSection(t, e, r * SECTION_HEIGHT));
    }
    return i.prototype.getBlockType = function(t, e, o) {
        // if (x >= this.pos.x && y >= this.pos.y && x < CHUNK_WIDTH && y < CHUNK_HEIGHT) {
        var r;
        if (this.isWithinBounds(t, e, o)) return r = Math.floor(o / i.SECTION_HEIGHT), 
        this.sections[r].getBlockType(t, e, o % i.SECTION_HEIGHT);
        // console.error(new RangeError(``))
        throw new RangeError("".concat(t, ",").concat(e, " out of bounds"));
    }, i.prototype.setBlockType = function(t, e, o, r) {
        if (!this.isWithinBounds(t, e, o)) throw new RangeError("Cannot set chunk[".concat(this.pos.x, ", ").concat(this.pos.y, "][").concat(t, ",").concat(e, ",").concat(o, "]"));
        var n = Math.floor(o / i.SECTION_HEIGHT);
        this.sections[n].setBlockType(t, e, o % i.SECTION_HEIGHT, r);
    }, i.prototype.isWithinBounds = function(t, e, o) {
        return 0 <= t && t < i.CHUNK_WIDTH && 0 <= e && e < CHUNK_HEIGHT && 0 <= o && o < CHUNK_DEPTH;
    }, i.CHUNK_WIDTH = CHUNK_WIDTH, i.CHUNK_HEIGHT = CHUNK_DEPTH, i.SECTION_HEIGHT = SECTION_HEIGHT, 
    i;
})(), WorldData = /** @class */ (() => {
    function t(t, e) {
        this.nc_x = t, this.nc_y = e, this.chunks = [];
        for (var o = 0; o < t; o++) {
            this.chunks[o] = [];
            for (var r = 0; r < e; r++) this.chunks[o][r] = new Chunk(o, r);
        }
    }
    return t.prototype.getChunk = function(t, e) {
        /*
        if (!this.chunks[chunkX]) {
           this.chunks[chunkX] = [];
        }
        if (!this.chunks[chunkX][chunkZ]) {
           this.chunks[chunkX][chunkZ] = new Chunk();
        }
        */
        return this.chunks[t][e];
    }, t.prototype.getBlockType = function(t, e, o) {
        var r = Math.floor(t / CHUNK_WIDTH), n = Math.floor(e / CHUNK_HEIGHT), r = this.getChunk(r, n), n = t % CHUNK_WIDTH, t = e % CHUNK_HEIGHT, e = Math.floor(o / SECTION_HEIGHT);
        return r.sections[e].getBlockType(n, t, o % SECTION_HEIGHT);
    }, t.prototype.setBlockType = function(t, e, o, r) {
        var n = Math.floor(t / CHUNK_WIDTH), i = Math.floor(e / CHUNK_HEIGHT), n = this.getChunk(n, i), i = t % CHUNK_WIDTH, t = e % CHUNK_HEIGHT, e = Math.floor(o / SECTION_HEIGHT);
        return n.sections[e].setBlockType(i, t, o % SECTION_HEIGHT, r);
    }, t.prototype.isWithinBounds = function(t, e, o) {
        return 0 <= t && t < this.width && 0 <= e && e < this.height && 0 <= o && o < this.depth;
    }, 
    /*
     return the lowest z-index which has a non-zero value
    */
    t.prototype.getHighestNonAirBlockAt = function(t, e) {
        //
        for (var o = 0; o < this.depth; o++) 
        // if we've found a non-air block
        if (0 !== this.getBlockType(t, e, o)) 
        // then this is the first one we've encountered, and is therefore the topmost skyward block at this x,y 
        return o;
        // 
        return 0;
    }, t.prototype.getSunlitBlockAt = function(t, e) {
        return this.getHighestNonAirBlockAt(t, e);
    }, 
    /*
     Check whether the block at the given coordinates has any non-air blocks above it
    */
    t.prototype.isSunlit = function(t, e, o) {
        return this.getHighestNonAirBlockAt(t, e) == o;
    }, Object.defineProperty(t.prototype, "width", {
        get: function() {
            return this.nc_x * CHUNK_WIDTH;
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "height", {
        get: function() {
            return this.nc_y * CHUNK_HEIGHT;
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "depth", {
        get: function() {
            return CHUNK_DEPTH;
        },
        enumerable: !1,
        configurable: !0
    }), t.prototype.forEachBlock = function(t, e) {
        /* all blocks - the default case */
        for (var o, r = null != (r = (t = _.defaults(t, {
            x: null,
            y: null,
            z: null,
            xmin: null,
            xmax: null,
            ymin: null,
            ymax: null,
            zmin: null,
            zmax: null
        })).xmin) ? r : 0, n = null != (o = t.xmax) ? o : this.width - 1, i = null != (o = t.ymin) ? o : 0, a = null != (o = t.ymax) ? o : this.height - 1, s = null != (o = t.zmin) ? o : 0, l = null != (o = t.zmax) ? o : this.depth - 1, c = r; c <= n; c++) for (var u = i; u <= a; u++) for (var h = s; h <= l; h++) e(c, u, h);
    }, t;
})();

// const world = new WorldData(15, 15);
// world.setBlockType(0, 0, 0, 1);
// world.setBlockType(1, 0, 0, 2);
// world.setBlockType(2, 0, 0, 3);
// world.setBlockType(0, 1, 0, 4);
// console.log(world.getBlockType(0, 0, 0));
// console.log(world.getBlockType(1, 0, 0));
// console.log(world.getBlockType(2, 0, 0));
// console.log(world.getBlockType(0, 1, 0));
// console.log(world.getBlockType(5, 0, 0));
// // console.log(JSON.stringify(world));
// console.log(
//    world.width, world.height, world.depth
// )
function run_tests() {
    console.log("Running tests..."), test_BlockData(), test_Chunk();
}

function test_BlockData() {
    var t = new BlockData(16, 16, 16);
    t.setBlockType(0, 0, 0, 1), t.setBlockType(1, 0, 0, 2), t.setBlockType(2, 0, 0, 3), 
    t.setBlockType(0, 1, 0, 4), assert.strictEqual(t.getBlockType(0, 0, 0), 1, "getBlockType failed"), 
    assert.strictEqual(t.getBlockType(1, 0, 0), 2, "getBlockType failed"), assert.strictEqual(t.getBlockType(2, 0, 0), 3, "getBlockType failed"), 
    assert.strictEqual(t.getBlockType(0, 1, 0), 4, "getBlockType failed");
}

function test_Chunk() {
    var t = new Chunk(0, 0);
    t.setBlockType(0, 0, 0, 1), t.setBlockType(1, 0, 0, 2), t.setBlockType(2, 0, 0, 3), 
    t.setBlockType(0, 1, 0, 4), assert.strictEqual(t.getBlockType(0, 0, 0), 1, "getBlockType failed"), 
    assert.strictEqual(t.getBlockType(1, 0, 0), 2, "getBlockType failed"), assert.strictEqual(t.getBlockType(2, 0, 0), 3, "getBlockType failed"), 
    assert.strictEqual(t.getBlockType(0, 1, 0), 4, "getBlockType failed");
}

module.exports.WorldData = WorldData, module.exports.CHUNK_WIDTH = CHUNK_WIDTH, 
module.exports.CHUNK_HEIGHT = CHUNK_HEIGHT, module.exports.CHUNK_DEPTH = CHUNK_DEPTH, 
run_tests();
