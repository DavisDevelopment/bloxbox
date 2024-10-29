
var nj = require('numjs');
const $ = require('jquery');
const w = require('./world');
var World = w.World;
var Material = w.Material;
var TopDownRenderer = require('./render2d').TopDownRenderer;

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
function noisyAltitude(noiseScale=0.1, heightFactor=25) {
   // Assuming you have a Perlin noise function imported as `perlinNoise`
   // or from a library like `simplex-noise`
   // import SimplexNoise from 'simplex-noise';
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

   // You can now use `terrain[x][y]` to set the height of voxels in your world.
   console.log(terrain);

   return terrain;
}

var hillZ = noisyAltitude();
for (let x = 0; x < world.data.width; x++) {
   for (let y = 0; y < world.data.height; y++) {
      let z = hillZ[x][y];
      world.data.setBlockType(x, y, z, Material.GRASS);
   }
}

let renderer = new TopDownRenderer(world);

window['renderer'] = renderer;

// const numSamples = 50;

// var totalTime = 0;
// for (let i = 0; i < numSamples; i++) {
//    const startTime = performance.now();
//    renderer.sample_voxels_topdown();
//    const endTime = performance.now();
//    totalTime += endTime - startTime;
// }
// const averageTime = totalTime / numSamples;
// console.log(`Average time: ${averageTime}ms`);

// begin the actual render-loop
renderer.render_loop();

/*
var Renderer3d = require('./render3d').Renderer3d;

let canvas = document.getElementById('box-canvas');
let renderer = new Renderer3d(canvas, world);
*/
