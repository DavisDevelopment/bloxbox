
var assert = require('assert');

var geom = require('./geometry');
const _ = require('underscore');

const CHUNK_WIDTH = 16;
const CHUNK_HEIGHT = 16;
const CHUNK_DEPTH = 64;
const SECTION_HEIGHT = 16;

// Get reference to the most efficient available array-container for unsigned integers
const UInt32 = (() => {
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
   
   if (typeof Uint32Array !== 'undefined') {
      return Uint32Array;
   } 
   
   if (typeof Buffer !== 'undefined') {
      return Buffer;
   }
   
   else {
      // Return Array as a fallback
      return Array;
   }
})() as Uint32ArrayConstructor | BufferConstructor | ArrayConstructor;


const Material = module.exports.Material = {
   AIR: 0,

   STONE: 1,
   DIRT: 2,
   GRASS: 3,

   WOOD: 4,
   LEAVES: 5,
   SAPLING: 6,

   WATER: 7,

   all():string[] {
      let result:string[] = [];
      for (let k in Object.keys(Material)) {
         if (k === k.toUpperCase() && typeof Material[k] === 'number') {
            result.push(k);
         }
      }

      return result;
   },

   getMaterialName(material_id:number):string|null {
      for (let material_name in Material) {
         if (Material[material_name] === material_id) {
            return material_name;
         }
      }

      throw new Error(`No such material ${material_id}`);
   },

   getMaterialByName(name:string):number {
      let k = ('' + name).toUpperCase();
      return Material[k];
   },

   getColorOf(mat:string|number):string {
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
         case Material.LEAVES:
            return '#006400';
         case Material.WATER:
            return '#0000FF';
         case Material.SAPLING:
            return '#FF00FF';
         default:
            throw new Error(`"${mat}"`);
            return '#000000';
      }
   },

   validateMaterial(mat:string|number) {
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

const block_fields = [
   'type',
   'light_level'
   // 'state_id'
]

class BlockState {}

class BlockData {
   private width: number;
   private height: number;
   private depth: number;

   private data: ArrayLike<number>;
   private block_states:Map<number, null|BlockState>;

   constructor(width: number, height: number, depth: number) {
      this.width = width;
      this.height = height;
      this.depth = depth;

      // Initialize blocks array with zeros
      this.data = new UInt32(width * height * depth);
      for (let i = 0; i < this.data.length; i++) {
         (this.data as any)[i] = 0;
      }
      this.block_states = new Map();
   }

   // Convert 3D coordinates to a 1D index
   private index(x: number, y: number, z:number): number {
      return x + y * this.width + z * this.width * this.height;
   }

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
   private coords(index: number): [number, number, number] {
      const z = this.depth - 1 - Math.floor(index / (this.width * this.height)); // Adjusted for top-down
      const y = Math.floor((index % (this.width * this.height)) / this.width);
      const x = index % this.width;
      return [x, y, z];
   }

   // Get the block type at specified coordinates
   getBlockType(x: number, y: number, z: number): number {
      this.validateCoordinates(x, y, z);
      const i = this.index(x, y, this.depth - 1 - z); // Adjusted for top-down
      if (this.data[i] == null) {
         (this.data as any)[i] = 0;
      }
      return this.data[i];
   }

   // Set the block type at specified coordinates
   setBlockType(x: number, y: number, z: number, blockType: number): void {
      this.validateCoordinates(x, y, z);
      (this.data as unknown as number[])[this.index(x, y, this.depth - 1 - z)] = blockType; // Adjusted for top-down
   }

   // Check if the coordinates are within bounds
   private validateCoordinates(x: number, y: number, z: number): void {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) {
         throw new RangeError("Coordinates out of bounds");
      }
   }

   // Check if the coordinates are valid within bounds
   isValidCoord(x: number, y: number, z: number): boolean {
      return x >= 0 && x < this.width && y >= 0 && y < this.height && z >= 0 && z < this.depth;
   }

   /*
    Return the lowest z-index which has a non-zero value
   */
   getSunlitBlockAt(x: number, y: number): number {
      for (let z = this.depth - 1; z >= 0; z--) {
         if (this.getBlockType(x, y, z) !== 0) {
            return z;
         }
      }
      return 0;
   }

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
   getWidth(): number {
      return this.width;
   }

   getHeight(): number {
      return this.height;
   }

   getDepth(): number {
      return this.depth;
   }
}

class ChunkSection extends BlockData {
   private static readonly SECTION_SIZE = 16;
   pos: { x: number; y: number; z: number; };

   constructor(x, y, z) {
      super(ChunkSection.SECTION_SIZE, ChunkSection.SECTION_SIZE, ChunkSection.SECTION_SIZE);
      this.pos = {x:x, y:y, z:z};
   }
}



class Chunk {
   private static readonly CHUNK_WIDTH = CHUNK_WIDTH;
   private static readonly CHUNK_HEIGHT = CHUNK_DEPTH;
   private static readonly SECTION_HEIGHT = SECTION_HEIGHT;

   sections: ChunkSection[];
   pos: { x: number; y: number; };

   constructor(x, y) {
      this.sections = [];
      const sectionCount = Chunk.CHUNK_HEIGHT / Chunk.SECTION_HEIGHT;
      this.pos = {x:x, y:y};

      for (let i = 0; i < sectionCount; i++) {
         this.sections.push(new ChunkSection(x, y, i * SECTION_HEIGHT));
      }
   }

   getBlockType(x: number, y: number, z: number) {
      // if (x >= this.pos.x && y >= this.pos.y && x < CHUNK_WIDTH && y < CHUNK_HEIGHT) {
      if (this.isWithinBounds(x, y, z)) {
         const sectionIndex = Math.floor(z / Chunk.SECTION_HEIGHT);
         const localZ = z % Chunk.SECTION_HEIGHT;
         return this.sections[sectionIndex].getBlockType(x, y, localZ);
      }
      else {
         // console.error(new RangeError(``))
         throw new RangeError(`${x},${y} out of bounds`);
      }

      return null;
   }

   setBlockType(x: number, y: number, z: number, type) {
      if (this.isWithinBounds(x, y, z)) {
         const sectionIndex = Math.floor(z / Chunk.SECTION_HEIGHT);
         const localZ = z % Chunk.SECTION_HEIGHT;
         this.sections[sectionIndex].setBlockType(x, y, localZ, type);
      }
      else {
         throw new RangeError(`Cannot set chunk[${this.pos.x}, ${this.pos.y}][${x},${y},${z}]`);
      }
   }

   private isWithinBounds(x: number, y: number, z: number): boolean {
      return (
         x >= 0 && x < Chunk.CHUNK_WIDTH &&
         y >= 0 && y < CHUNK_HEIGHT &&
         z >= 0 && z < CHUNK_DEPTH
      );
   }
}

class WorldData {
   private chunks: Chunk[][];
   nc_x: number; // the number of chunks along the x axis
   nc_y: number; // the number of chunks along the y axis

   constructor(nc_x: number, nc_y: number) {
      this.nc_x = nc_x;
      this.nc_y = nc_y;
      
      this.chunks = [];

      var chunkPos = {x:0, y:0, z:0};
      for (let x = 0; x < nc_x; x++) {
         this.chunks[x] = [];
         for (let y = 0; y < nc_y; y++) {
            this.chunks[x][y] = new Chunk(x, y);
         }
      }

   }

   getChunk(chunkX: number, chunkY: number): Chunk {
      /*
      if (!this.chunks[chunkX]) {
         this.chunks[chunkX] = [];
      }
      if (!this.chunks[chunkX][chunkZ]) {
         this.chunks[chunkX][chunkZ] = new Chunk();
      }
      */
      return this.chunks[chunkX][chunkY];
   }

   getBlockType(x: number, y: number, z: number):number|null {
      const chunkX = Math.floor(x / CHUNK_WIDTH);
      const chunkY = Math.floor(y / CHUNK_HEIGHT);
      
      const chunk = this.getChunk(chunkX, chunkY);

      const localX = x % CHUNK_WIDTH;
      const localY = y % CHUNK_HEIGHT;

      const sectionIndex = Math.floor(z / SECTION_HEIGHT);
      const localZ = z % SECTION_HEIGHT;

      const section = chunk.sections[sectionIndex];
      return section.getBlockType(localX, localY, localZ);
   }

   setBlockType(x: number, y: number, z: number, block_type:number) {
      const chunkX = Math.floor(x / CHUNK_WIDTH);
      const chunkY = Math.floor(y / CHUNK_HEIGHT);
      const chunk = this.getChunk(chunkX, chunkY);
      
      // const chunkZ = Math.floor(z / SECTION_HEIGHT);
      const localX = x % CHUNK_WIDTH;
      const localY = y % CHUNK_HEIGHT;
      const sectionIndex = Math.floor(z / SECTION_HEIGHT);
      const localZ = z % SECTION_HEIGHT;
      const section = chunk.sections[sectionIndex];

      return section.setBlockType(localX, localY, localZ, block_type);
   }
   
   isWithinBounds(x, y, z) {
      return x >= 0 && x < this.width &&
         y >= 0 && y < this.height &&
         z >= 0 && z < this.depth;
   }

   /*
    return the lowest z-index which has a non-zero value
   */
   getHighestNonAirBlockAt(x, y) {
      //
      for (let i = 0; i < this.depth; i++) {
         let type = this.getBlockType(x, y, i);
         // if we've found a non-air block
         if (type !== 0) {
            // then this is the first one we've encountered, and is therefore the topmost skyward block at this x,y 
            return i;
         }
      }

      // 
      return 0;
   }

   getSunlitBlockAt(x, y) {
      return this.getHighestNonAirBlockAt(x, y);
   }

   /*
    Check whether the block at the given coordinates has any non-air blocks above it
   */
   isSunlit(x, y, z) {
      return (this.getHighestNonAirBlockAt(x, y) == z);
   }

   get width() {
      return this.nc_x * CHUNK_WIDTH;
   }
   get height() {return this.nc_y * CHUNK_HEIGHT;}
   get depth() {return CHUNK_DEPTH;}

   forEachBlock(options, visit_cb) {
      options = _.defaults(options, {
         x: null, y: null, z: null,
         xmin: null, xmax: null,
         ymin: null, ymax: null,
         zmin: null, zmax: null,
      });

      const xmin = options.xmin ?? 0;
      const xmax = options.xmax ?? this.width - 1;
      const ymin = options.ymin ?? 0;
      const ymax = options.ymax ?? this.height - 1;
      const zmin = options.zmin ?? 0;
      const zmax = options.zmax ?? this.depth - 1;

      /* all blocks - the default case */

      for (let x = xmin; x <= xmax; x++) {
         for (let y = ymin; y <= ymax; y++) {
            for (let z = zmin; z <= zmax; z++) {
               visit_cb(x, y, z);
            }
         }
      }
   }
}

module.exports.WorldData = WorldData;
module.exports.CHUNK_WIDTH = CHUNK_WIDTH;
module.exports.CHUNK_HEIGHT = CHUNK_HEIGHT;
module.exports.CHUNK_DEPTH = CHUNK_DEPTH;

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
   console.log("Running tests...");
   test_BlockData();
   test_Chunk();
}

function test_BlockData() {
   var bd = new BlockData(16, 16, 16);
   bd.setBlockType(0, 0, 0, 1);
   bd.setBlockType(1, 0, 0, 2);
   bd.setBlockType(2, 0, 0, 3);
   bd.setBlockType(0, 1, 0, 4);

   assert.strictEqual(bd.getBlockType(0, 0, 0), 1, "getBlockType failed");
   assert.strictEqual(bd.getBlockType(1, 0, 0), 2, "getBlockType failed");
   assert.strictEqual(bd.getBlockType(2, 0, 0), 3, "getBlockType failed");
   assert.strictEqual(bd.getBlockType(0, 1, 0), 4, "getBlockType failed");
}

function test_Chunk() {
   var chunk = new Chunk(0, 0);
   chunk.setBlockType(0, 0, 0, 1);
   chunk.setBlockType(1, 0, 0, 2);
   chunk.setBlockType(2, 0, 0, 3);
   chunk.setBlockType(0, 1, 0, 4);

   assert.strictEqual(chunk.getBlockType(0, 0, 0), 1, "getBlockType failed");
   assert.strictEqual(chunk.getBlockType(1, 0, 0), 2, "getBlockType failed");
   assert.strictEqual(chunk.getBlockType(2, 0, 0), 3, "getBlockType failed");
   assert.strictEqual(chunk.getBlockType(0, 1, 0), 4, "getBlockType failed");
}

run_tests();