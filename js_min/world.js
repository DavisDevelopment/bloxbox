var nj = require("numjs"), _ = require("underscore"), vd = require("./blockdata"), Material = vd.Material, BlockData = vd.BlockData, wd = require("./blockdata"), gen = require("./worldgen");

let geom = require("./geometry"), BlockSelection = require("./blockselection").BlockSelection;
// import {BlockSelection} from './blockselection';

class World {
    constructor(t) {
        t = (t = _.defaults(t = null == t ? {} : t, {
            size: [ 500, 500, 75 ]
        })).size;
        this.data = new wd.WorldData(Math.floor(t[0] / wd.CHUNK_WIDTH), Math.floor(t[1] / wd.CHUNK_HEIGHT)), 
        this.entities = new Array(), 
        //TODO set all blocks to grass
        // Mapping from villager uids to the BlockSelections that comprise their respective property claims
        this.villagerPropertyClaims = {};
    }
    getBlock(t, e, a) {
        return this.data.getBlockType(t, e, a);
    }
    getWidth() {
        return this.data.width;
    }
    getHeight() {
        return this.data.height;
    }
    getDepth() {
        return this.data.depth;
    }
    initialize_flatgrass() {
        let r = this.data;
        var t = r.width, i = r.height, l = r.depth, o = (console.log(`World dimensions - Width: ${t}, Height: ${i}, Depth: ` + l), 
        (t, e, a, i) => {
            r.setBlockType(t, e, a, i);
        }
        // put down the blocks of the world
        );
        for (let a = 0; a < t; a++) for (let e = 0; e < i; e++) for (let t = 0; t < l; t++) t <= 3 ? o(a, e, t, Material.AIR) : 4 === t ? o(a, e, t, Material.GRASS) : 4 < t ? o(a, e, t, Material.STONE) : t === l - 1 && o(a, e, t, Material.WATER);
    }
    /**
    * Handle moment-to-moment world logic, like the growing of trees
    * and the processing of game ticks for Entities roaming about in our world
    * 
    * @param {int} n number of frames to process
    */
    tick(e) {
        // block-related logic
        for (let a = 0; a < this.data.chunks.length; a++) for (let e = 0; e < this.data.chunks[a].length; e++) for (let t = 0; t < this.data.chunks[a][e].length; t++) {
            var i, r = this.data.chunks[a][e][t];
            // occasionally plant saplings on top of 'sunlit' grass blocks
            r == Material.GRASS && Math.random() < 2e-6 && (i = this.data.coords(a, e, t), 
            this.data.isSunlit(i[0], i[1], i[2] + 1)) && 
            // plant the sapling
            this.data.setBlockType(i[0], i[1], i[2] + 1, Material.SAPLING), 
            // occasionally grow saplings into trees
            r == Material.SAPLING && Math.random() < .013 && (i = this.data.coords(a, e, t), 
            gen.grow_tree(this, i[0], i[1], i[2]));
        }
        // entity-related logic
        for (let t = 0; t < this.entities.length; t++) {
            var a = this.entities[t];
            "function" == typeof a.tick && a.tick(this, e);
        }
    }
}

function test_world() {
    var i = new World();
    console.log(`World Dimensions - Width: ${i.getWidth()}, Height: ${i.getHeight()}, Depth: ` + i.getDepth()), 
    i.data.forEachBlock({}, (t, e, a) => {
        5 === a ? i.data.setBlockType(t, e, a, Material.GRASS) : i.data.setBlockType(t, e, a, Material.AIR);
    }), i.tick(1);
}

module.exports.World = World, module.exports.Material = Material;
