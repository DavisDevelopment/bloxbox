
var nj = require('numjs');
const $ = require('jquery');
const w = require('./world');
var World = w.World;
var Material = w.Material;
var TopDownRenderer = require('./render2d').TopDownRenderer;

let world = new World({
   size: [500, 500, 64*2]
});
world.data.forEachBlock({}, (x, y, z) => {
   if (z === 5) {
      world.data.setBlockType(x, y, z, Material.GRASS);
   } 
   else {
      world.data.setBlockType(x, y, z, Material.AIR);
   }
});
console.log(world.data.getBlockType(33, 33, 5));

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
