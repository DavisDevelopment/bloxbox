


// get reference to the most efficient available array-container for unsigned integers
const UInt32 = (function() {
   if (typeof Uint32Array !== 'undefined') {
      return Uint32Array;
   } 
   else if (typeof Buffer !== 'undefined') {
      return Buffer;
   }
   else {
      // throw new Error("No efficient array-container for unsigned 32-bit integers was found");
      return Array;
   }
}());


const Material = module.exports.Material = {
   AIR: 0,

   STONE: 1,
   DIRT: 2,
   GRASS: 3,

   WOOD: 4,

   //TODO many MANY more material types


   getMaterialName(material_id) {
      for (let material_name in Material) {
         if (Material[material_name] === material_id) {
            return material_name;
         }
      }

      return null;
   },

   getMaterialByName(name) {
      let k = ('' + name).toUpperCase();
      return Material[k];
   },

   getColorOf(mat) {
      // return material_color(material);
      if (typeof mat === 'string') {
         mat = Material.getMaterialByName(mat);
      }

      switch (mat) {
         case Material.AIR:
            return '#FFFFFF';
         case Material.STONE:
            return '#808080';
         case Material.DIRT:
            return '#964B00';
         case Material.GRASS:
            return '#32CD32';
         case Material.WOOD:
            return '#A0522D';

         default:
            throw new Error(`"${mat}"`);
            return '#000000';
      }
   },

   validateMaterial(mat) {
      if (typeof mat === 'string') {
         mat = Material.getMaterialByName(mat);
      }

      if (typeof mat !== 'number') {
         throw new Error(`"${mat}"`);
      }

      if (!Object.values(Material).includes(mat)) {
         throw new Error(`"${mat}" is not a valid material id`);
      }
   }
};



class BlockData {
   constructor(width, height, depth) {
      this.width = width;
      this.height = height;
      this.depth = depth;

      this.blocks = new UInt32(width * height * depth); // Flat array for blocks
      for (let i = 0; i < this.blocks.length; i++) {
         this.blocks[i] = 0;
      }
   }

   // Convert 3D coordinates to a 1D index
   index(x, y, z) {
      return x + (y * this.width) + (z * this.width * this.height);
   }

   // Get the block type at specified coordinates
   getBlock(x, y, z) {
      this.validateCoordinates(x, y, z);
      return this.blocks[this.index(x, y, z)];
   }

   // Set the block type at specified coordinates
   setBlock(x, y, z, blockType) {
      this.validateCoordinates(x, y, z);
      // this.validateMaterial(blockType);
      this.blocks[this.index(x, y, z)] = blockType;
   }

   // Check if the coordinates are within bounds
   validateCoordinates(x, y, z) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) {
         throw new RangeError("Coordinates out of bounds");
      }
   }

   /*
    return the lowest z-index which has a non-zero value
   */
   getSunlitBlockAt(x, y) {
      // looks right
      for (let z = this.depth - 1; z >= 0; z--) {
         if (this.getBlock(x, y, z) !== 0) {
            return z;
         }
      }

      return 0;
   }

   // Get the dimensions of the block data
   getWidth() {
      return this.width;
   }

   getHeight() {
      return this.height;
   }

   getDepth() {
      return this.depth;
   }
}

module.exports['BlockData'] = BlockData;

// Example usage
const width = 10, height = 10, depth = 10;
const world = new BlockData(width, height, depth, Uint32Array); // Using Uint32Array

// Set a block type at (1, 2, 3)
world.setBlock(1, 2, 3, 5); // Assume '5' represents a specific block type

// Get the block type at (1, 2, 3)
const blockType = world.getBlock(1, 2, 3);
console.log("Block type at (1, 2, 3):", blockType);
