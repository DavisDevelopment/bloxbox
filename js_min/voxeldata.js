// get reference to the most efficient available array-container for unsigned integers
let UInt32 = "undefined" != typeof Uint32Array ? Uint32Array : "undefined" != typeof Buffer ? Buffer : Array, Material = module.exports.Material = {
    AIR: 0,
    STONE: 1,
    DIRT: 2,
    GRASS: 3,
    WOOD: 4,
    LEAVES: 5,
    SAPLING: 6,
    WATER: 7,
    all() {
        var e, r = [];
        for (e in Material) e === e.toUpperCase() && "number" == typeof Material[e] && r.push(e);
        return r;
    },
    getMaterialName(e) {
        for (var r in Material) if (Material[r] === e) return r;
        return null;
    },
    getMaterialByName(e) {
        e = ("" + e).toUpperCase();
        return Material[e];
    },
    getColorOf(e) {
        switch (
        // return material_color(material);
        e = "string" == typeof e ? Material.getMaterialByName(e) : e) {
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
            throw new Error(`"${e}"`);
        }
    },
    validateMaterial(e) {
        if ("number" != typeof (e = "string" == typeof e ? Material.getMaterialByName(e) : e)) throw new Error(`"${e}"`);
        if (!Object.values(Material).includes(e)) throw new Error(`"${e}" is not a valid material id`);
    }
};

throw new Error("has been replaced");

class BlockData {}

// Example usage
let width, height, depth, world, blockType, geom;

/*
 ChunkSection class
*/
class ChunkSection {
    //TODO override the relevant BlockData methods to transform the 
}

class Chunk {}
