(function() {

// const geom = require('./geometry');
const {Rect3D, Mesh} = require('./geometry');

/*
   the RegionBuffer efficiently stores a selection of voxel coordinates which can 
   be dynamically edited via addBlock, removeBlock, containsBlock, etc. methods
*/
class RegionBuffer {
   blocks: Set<string> = new Set();

   constructor() {
      
   }

   /**
    * Add a block to the selection
    * @param x
    * @param y
    * @param z
    */
   addBlock(x: number, y: number, z: number) {
      this.blocks.add(`${x},${y},${z}`);
   }

   /**
    * Remove a block from the selection
    * @param x
    * @param y
    * @param z
    */
   removeBlock(x: number, y: number, z: number) {
      this.blocks.delete(`${x},${y},${z}`);
   }

   /**
    * Check if a block is in the selection
    * @param x
    * @param y
    * @param z
    */
   containsBlock(x: number, y: number, z: number) {
      return this.blocks.has(`${x},${y},${z}`);
   }

   /**
    * Get all blocks in the selection as an array of [x, y, z]
    */
   getBlocks() {
      return Array.from(this.blocks).map(s => s.split(',').map(Number));
   }

   *[Symbol.iterator]() {
      for (const coords of this.getBlocks()) {
         yield coords;
      }
   }
}

class BlockSelection {
   b: RegionBuffer;

   constructor() {
      this.b = new RegionBuffer();
   }

   get length():number {
      return this.b.blocks.size;
   }

   add(x: number, y: number, z: number) {
      this.b.addBlock(x, y, z);
   }

   addRect3D(rect) {
      for (let x = rect.x; x < rect.x + rect.length; x++) {
         for (let y = rect.y; y < rect.y + rect.width; y++) {
            for (let z = rect.z; z < rect.z + rect.height; z++) {
               this.b.addBlock(x, y, z);
            }
         }
      }
   }

   remove(x: number, y: number, z: number) {
      this.b.removeBlock(x, y, z);
   }

   contains(x: number, y: number, z: number) {
      return this.b.containsBlock(x, y, z);
   }

   all() {
      return this.b.getBlocks();
   }

   /*
    computes the internal 3D volume of the selected blocks
   */
   getVolume() {
      //TODO
   }

   /*
   combines all 'selected' blocks into a single 3D shape
   */
   getMesh() {
      const vertices = new Float32Array(this.b.getBlocks().length * 3 * 3 * 3 * 8);
      
      let index = 0;
      
      for (const block of this.b.getBlocks()) {
         const [x, y, z] = block;
         for (let dx = 0; dx < 3; dx++) {
            for (let dy = 0; dy < 3; dy++) {
               for (let dz = 0; dz < 3; dz++) {
                  const x2 = x + dx - 1;
                  const y2 = y + dy - 1;
                  const z2 = z + dz - 1;
                  vertices[index++] = x2;
                  vertices[index++] = y2;
                  vertices[index++] = z2;
               }
            }
         }
      }

      return new Mesh(vertices, new Uint32Array(this.b.getBlocks().length * 3 * 3 * 3 * 12));
   }

   /*
   Calculates the geom.Rect3D which contains all selected blocks
    */
   getContainingRect(margin: number | { x?: number; y?: number; z?: number }) {
      const blocks = this.b.getBlocks();

      if (blocks.length === 0) {
         return null;
      }

      let minX = Number.MAX_VALUE, minY = Number.MAX_VALUE, minZ = Number.MAX_VALUE;
      let maxX = Number.MIN_VALUE, maxY = Number.MIN_VALUE, maxZ = Number.MIN_VALUE;

      for (const [x, y, z] of blocks) {
         if (x < minX) minX = x;
         if (y < minY) minY = y;
         if (z < minZ) minZ = z;
         if (x > maxX) maxX = x;
         if (y > maxY) maxY = y;
         if (z > maxZ) maxZ = z;
      }

      const marginX = typeof margin === 'number' ? margin : margin.x || 0;
      const marginY = typeof margin === 'number' ? margin : margin.y || 0;
      const marginZ = typeof margin === 'number' ? margin : margin.z || 0;

      return new Rect3D(
         minX - marginX,
         minY - marginY,
         minZ - marginZ,
         maxX - minX + 1 + 2 * marginX,
         maxY - minY + 1 + 2 * marginY,
         maxZ - minZ + 1 + 2 * marginZ
      );
   }

   expandToContainingRect() {
      this.addRect3D(this.getContainingRect(0));
   }
}

module.exports.BlockSelection = BlockSelection;
})();