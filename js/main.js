
var nj = require('numjs');
const $ = require('jquery');

var w = require('./world');
const Material = w.Material;
const World = w.World;

class Rect {
   constructor(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
   }
}

class ViewRect extends Rect {
   constructor(x, y, width, height, zoomFactor=1.0) {
      super(x, y, width, height);
      this.zoomFactor = zoomFactor;
   }
}

class TopDownRenderer {
   constructor(world) {
      this.canvasElem = document.getElementById('box-canvas');
      this.context = this.canvasElem.getContext('2d');

      if (!world) {
         world = new world();
      }
      
      this.world = world;
      this.viewRect = new ViewRect(0, 0, world.getWidth(), world.getHeight());

      this.topBlocks = nj.zeros([world.getWidth(), world.getHeight()]);
      this._disposalRoutines = [];

      this.initCanvas();
   }

   initCanvas() {
      const me = this;
      const canvas = me.canvasElem;
      console.log(canvas);

      function onResize() {
         canvas.width = window.innerWidth;
         canvas.height = window.innerHeight;
         me.viewRect.width = canvas.width;
         me.viewRect.height = canvas.height;
      }
      $(window).on('resize', onResize);
      onResize();

      function onMouseClick(e) {
         let rect = canvas.getBoundingClientRect();
         let x = e.clientX - rect.left;
         let y = e.clientY - rect.top;
         me.onCanvasClicked(x, y);
      }
      $(canvas).on('click', onMouseClick);

      function onMouseWheel(e) {
         /**
          * How much the mouse wheel was scrolled.
          * @type {Number}
          */
         let delta = e.originalEvent.deltaY;
         // Update the zoom factor
         let oldZoomFactor = me.viewRect.zoomFactor;
         me.viewRect.zoomFactor += delta * 0.002;

         // Clamp the zoom factor to a range
         me.viewRect.zoomFactor = Math.max(0.1, me.viewRect.zoomFactor);
         me.viewRect.zoomFactor = Math.min(200.0, me.viewRect.zoomFactor);

         // Calculate the change in zoom factor
         let zoomFactorChange = me.viewRect.zoomFactor - oldZoomFactor;

         // Move the view to center the change in zoom factor
         me.viewRect.x -= zoomFactorChange * (canvas.width / 2);
         me.viewRect.y -= zoomFactorChange * (canvas.height / 2);

         console.log('new zoom factor: ', me.viewRect.zoomFactor);

         var newBlockSize = (2.0 * me.viewRect.zoomFactor);
         console.log(`new block size: ${newBlockSize}x${newBlockSize}`);
      }

      $(canvas).on('mousewheel', onMouseWheel);

      const deltaP = 20;
      function onKeydown(e) {
         switch (e.key) {
            case 'w':
               me.viewRect.y -= deltaP;
               break;
            case 'a':
               me.viewRect.x -= deltaP;
               break;
            case 's':
               me.viewRect.y += deltaP;
               break;
            case 'd':
               me.viewRect.x += deltaP;
               break;
         }
      }
      $(window).on('keydown', onKeydown);

      function unbindEventHandlers() {
         $(window).off('resize', onResize);
         $(window).off('keydown', onKeydown);
         $(canvas).off('click', onMouseClick);
         $(canvas).off('mousewheel', onMouseWheel);
      }
      me._disposalRoutines.push(unbindEventHandlers);
   }

   onCanvasClicked(x, y) {
      const me = this;
      const vmd = me.world.voxelMaterialData;
      const blockType = 1; // Example block type
      let blockSize = 2.0 * this.viewRect.zoomFactor;
      let worldX = Math.floor((x - me.viewRect.x) / blockSize);
      let worldY = Math.floor((y - me.viewRect.y) / blockSize);

      // Select the block at the clicked position
      const z = this.topBlocks.get(worldX, worldY);

      const selectedBlock = this.world.getBlock(worldX, worldY, z);

      if (selectedBlock !== 0) { // Assuming 0 represents an empty block
         vmd.setBlock(worldX, worldY, z, Material.AIR); // Place a block of specified type
         if (z - 1 >= 0) {
            me.topBlocks.set(worldX, worldY, z-1);
         }

         console.log(`Removed block at (${worldX}, ${worldY})`);
      } 
      else {
         console.log(`No block exists at (${worldX}, ${worldY})`);
      }
   }

   render_loop() {
      const me = this;
      this.sample_voxels_topdown();

      requestAnimationFrame(() => {
         me.render_loop();
      });
   }

   sample_voxels_topdown() {
      let world_shape = this.world.voxelMaterialData.shape;
      let vmd = this.world.voxelMaterialData;
      let width = vmd.width, height = vmd.height, depth = vmd.depth;

      let c = this.context;
      c.clearRect(0, 0, this.canvasElem.width, this.canvasElem.height);

      var blockSize = 2;
      blockSize *= (this.viewRect.zoomFactor);

      //TODO probably need to improve caching logic
      for (let x = 0; x < width; x++) {
         for (let y = 0; y < height; y++) {
            let z = this.topBlocks.get(x, y);

            if (z === 0) {
               z = vmd.getSunlitBlockAt(x, y);
               this.topBlocks.set(x, y, z);
            }
            
            if (typeof z === 'undefined') {
               z = 0;
            }
            
            let material = vmd.getBlock(x, y, z);

            let cell_color = Material.getColorOf(material);

            if (cell_color === '#000000') {
               continue;
            }
            
            c.fillStyle = cell_color;
            // console.log(c.fillStyle);

            let displX = (x * blockSize) + this.viewRect.x;
            let diplY = (y * blockSize) + this.viewRect.y;

            c.fillRect(displX, diplY, blockSize, blockSize);
         }
      }
   }
}


let world = new World({
   size: [500, 500, 75]
});

console.log(world);


let renderer = new TopDownRenderer(world);

window['renderer'] = renderer;

const numSamples = 50;

var totalTime = 0;
for (let i = 0; i < numSamples; i++) {
   const startTime = performance.now();
   renderer.sample_voxels_topdown();
   const endTime = performance.now();
   totalTime += endTime - startTime;
}
const averageTime = totalTime / numSamples;
console.log(`Average time: ${averageTime}ms`);

// begin the actual render-loop
renderer.render_loop();

/*
var Renderer3d = require('./render3d').Renderer3d;

let canvas = document.getElementById('box-canvas');
let renderer = new Renderer3d(canvas, world);
*/
