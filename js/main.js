function main() {
   var nj = require('numjs');
   const $ = require('jquery');
   const w = require('./world');
   var World = w.World;
   var Material = w.Material;
   var TopDownRenderer = require('./render2d').TopDownRenderer;

   // require('./render3dcube');

   // return ;
   let world = new World({
      size: [500, 500, 64*2]
   });


   /**
    * Generates a noisy altitude map for a flat region of a voxel world.
    *
    * @param {number} [noiseScale=0.1] - Controls the scale of the terrain features
    * @param {number} [heightFactor=25] - Maximum height variation for the terrain
    *
    * @returns {number[][]} - A 2D array of altitude values for each block in the region
    */
   function noisyAltitude(noiseScale=0.1, heightFactor=25, smoothingFactor=0) {
      var sn = require('simplex-noise');

      // Initialize noise generator
      const noise = sn.createNoise2D();

      // Function to determine height (Z position) of each block
      function getHeight(x, y) {
         // Generate noise value for (x, y), scaled by `noiseScale`
         const noiseValue = noise(x * noiseScale, y * noiseScale);

         // Map noise value (-1 to 1) to altitude (0 to heightFactor)
         let sea_level = Math.floor(world.getDepth() * 0.5);
         
         return sea_level + Math.floor((noiseValue + 1) / 2 * heightFactor);
      }

      // Generate terrain for a flat region
      const regionWidth = world.data.width;   // Width of the region
      const regionHeight = world.data.height;   // Height of the region
      const terrain/*: number[][]*/ = []; // Stores height map of the terrain

      for (let x = 0; x < regionWidth; x++) {
         terrain[x] = [];

         for (let y = 0; y < regionHeight; y++) {
            terrain[x][y] = getHeight(x, y);
         }
      }

      // Apply smoothing to the terrain
      if (smoothingFactor > 0) {
         // This algorithm takes each block in the terrain and replaces its height with the average of its height and the heights of its four neighbors (N, S, E, W)
         // This is done in a way that is more efficient than using nested for-loops with (x, y) coordinates
         // Instead, we use a single loop and calculate the new height for each block as the average of the heights of the blocks in its neighborhood
         for (let x = 0; x < regionWidth; x++) {
            for (let y = 0; y < regionHeight; y++) {
               // Calculate the average height of the block and its neighbors
               // Start with the height of the block itself
               let heightSum = terrain[x][y];
               
               // Add the heights of the neighbors to the sum
               // We only add the heights of neighbors that exist (i.e. those that are not out of bounds)
               if (x > 0) {
                  heightSum += terrain[x-1][y];
               }
               if (x < regionWidth-1) {
                  heightSum += terrain[x+1][y];
               }
               if (y > 0) {
                  heightSum += terrain[x][y-1];
               }
               if (y < regionHeight-1) {
                  heightSum += terrain[x][y+1];
               }
               
               // Calculate the average height by dividing the sum by the number of neighbors (plus one for the block itself)
               // Use Math.floor to round down to the nearest integer
               terrain[x][y] = Math.floor(heightSum / (1 + (x > 0 ? 1 : 0) + (x < regionWidth-1 ? 1 : 0) + (y > 0 ? 1 : 0) + (y < regionHeight-1 ? 1 : 0)));
            }
         }
      }

      // You can now use `terrain[x][y]` to set the height of voxels in your world.
      console.log(terrain);

      return terrain;
   }

   // apply the 'noisy altitude' to the map
   var hillZ = noisyAltitude(0.32, 25, 1);
   for (let x = 0; x < world.data.width; x++) {
      for (let y = 0; y < world.data.height; y++) {
         let z = hillZ[x][y];
         world.data.setBlockType(x, y, z, Material.GRASS);
      }
   }

   // instantiate the renderer, top-down by default
   let renderer = new TopDownRenderer(world);

   // expose the renderer so that it's accessible from the JavaScript console
   window['renderer'] = renderer;

   // begin the actual render-loop
   renderer.render_loop();

   /*
   var Renderer3d = require('./render3d').Renderer3d;

   let canvas = document.getElementById('box-canvas');
   let renderer = new Renderer3d(canvas, world);
   */
}
main();