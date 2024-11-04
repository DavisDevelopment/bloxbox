var nj = require('numjs');
const $ = require('jquery');

var w = require('./world');
var Person = require('./person').Person;
const Material = w.Material;
const World = w.World;

const {Rect3D} = require('./geometry');
const assert = require('assert');

class Rect {
   constructor(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
   }
}

class ViewRect extends Rect {
   constructor(x, y, width, height, zoomFactor = 1.0) {
      super(x, y, width, height);
      this.zoomFactor = zoomFactor;
   }
}

class TopDownRenderer {
   constructor(world) {
      this.canvasElem = document.getElementById('box-canvas');
      this.context = this.canvasElem.getContext('2d');

      if (!world) {
         world = new World();
      }

      this.world = world;

      this.viewRect = new ViewRect(0, 0, world.getWidth(), world.getHeight());

      // 2D matrix used to cache the highest non-air blocks
      this.topBlocks = nj.zeros([world.getWidth(), world.getHeight()]);
      this._disposalRoutines = [];

      // fields related to FPS monitoring
      this._lastSecondStart = null;
      this._framesThisSecond = 0;
      this._fpslog = [];

      // initialize the canvas for our render loop
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

      function onMouseRightClick(e) {
         let rect = canvas.getBoundingClientRect();
         let x = e.clientX - rect.left;
         let y = e.clientY - rect.top;
         me.onCanvasRightClicked(x, y);
         e.preventDefault();
      }
      $(canvas).on('contextmenu', onMouseRightClick);

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
         $(canvas).off('contextmenu', onMouseRightClick);
         $(canvas).off('mousewheel', onMouseWheel);
      }
      me._disposalRoutines.push(unbindEventHandlers);
   }

   onCanvasRightClicked(x, y) {
      const me = this;
      const vmd = me.world.data;
      const blockType = 1; // Example block type
      let blockSize = 2.0 * this.viewRect.zoomFactor;
      let worldX = Math.floor((x - me.viewRect.x) / blockSize);
      let worldY = Math.floor((y - me.viewRect.y) / blockSize);

      // try {
         // // Select the block at the clicked position
         const z = this.topBlocks.get(worldX, worldY);
         
         var guy = new Person(me.world);
         guy.setPos(worldX, worldY, z);
         me.world.entities.push(guy);

         // give guy two stacks of grass blocks to start
         guy.inventory.addItem({block_type:Material.GRASS}, 'grass', 64 * 2);
         assert(guy.inventory.getCount('grass') == (64 * 2));
         guy.inventory.addItem({block_type:Material.STONE}, 'stone', 64*2);

         guy.buildHome();
      // }
      // catch (error) {
      //    console.error(error);
      //    return ;
      // }
   }

   onCanvasClicked(x, y) {
      const me = this;
      const vmd = me.world.data;
      const blockType = 1; // Example block type
      let blockSize = 2.0 * this.viewRect.zoomFactor;
      let worldX = Math.floor((x - me.viewRect.x) / blockSize);
      let worldY = Math.floor((y - me.viewRect.y) / blockSize);

      try {
         // Select the block at the clicked position
         const z = this.topBlocks.get(worldX, worldY);

         const selectedBlock = vmd.getBlockType(worldX, worldY, z);
         if (selectedBlock !== 0) { // Assuming 0 represents an empty block
            vmd.setBlockType(worldX, worldY, z, Material.AIR); // Place a block of specified type

            if (z - 1 >= 0) {
               me.topBlocks.set(worldX, worldY, z + 1);
            }
   
            console.log(`Removed block at (${worldX}, ${worldY})`);
         }
         else {
            console.log(`No block exists at (${worldX}, ${worldY})`);
         }
      }
      catch (error) {
         console.error(error);
         return ;
      }
   }

   render_loop() {
      const me = this;
      this.sample_voxels_topdown();

      requestAnimationFrame(() => {
         me.render_loop();
      });
   }

   /**
    * Generates a color map for the top layer of blocks in the world.
    * 
    * This function iterates over the top blocks in the world data, retrieves their material type, 
    * and assigns a color based on the material. It adjusts the brightness of the block's color 
    * based on the relative height differences with its northern and southern neighbors, simulating 
    * shading effects.
    * 
    * @returns {Array} A 2D array representing the color map where each element is the color of the block
    *                  in RGB string format.
    */
   getColorMap() {
      const wd = this.world.data;
      const topBlocks = this.topBlocks;
      const colormap = [];

      for (let x = 0; x < topBlocks.shape[0]; x++) {
         colormap[x] = [];
         
         for (let y = 0; y < topBlocks.shape[1]; y++) {
            let material = wd.getBlockType(x, y, topBlocks.get(x, y));
            var cell_color = Material.getColorOf(material);

            colormap[x][y] = cell_color;
         }
      }

      for (let y = 1; y < topBlocks.shape[1] - 1; y++) {
         for (let x = 0; x < topBlocks.shape[0]; x++) {
            var z = topBlocks.get(x, y);
            var z_north = topBlocks.get(x, y - 1), z_south = topBlocks.get(x, y + 1);

            if (z_north < z) {
               let darkenFactor = 1 - ((z - z_north) * 0.05);
               let color = parseColor(colormap[x][y]);
               color.r += (color.r * darkenFactor);
               color.g += (color.g * darkenFactor);
               color.b += (color.b * darkenFactor);

               colormap[x][y] = `rgb(${color.r}, ${color.g}, ${color.b})`;
            }
            else if (z_south > z) {
               let lightenFactor = 1 + ((z_south - z) * 0.05);
               let color = parseColor(colormap[x][y]);
               color.r *= lightenFactor;
               color.g *= lightenFactor;
               color.b *= lightenFactor;

               colormap[x][y] = `rgb(${color.r}, ${color.g}, ${color.b})`;
            }
         }
      }

      return colormap;
   }

   renderLandscape() {
      const wd = this.world.data;
      const blockSize = 30;

      var offscreenCanvas;
      var offscreenCtx;

      if (!this._landscapeCanvas) {
         try {
            offscreenCanvas = new OffscreenCanvas(wd.width * blockSize, wd.height * blockSize);
            offscreenCtx = offscreenCanvas.getContext('2d');
         }
         catch (error) {
            offscreenCanvas.width = wd.width * blockSize;
            offscreenCanvas.height = wd.height * blockSize;
            offscreenCtx = offscreenCanvas.getContext('2d');
         }

         this._landscapeCanvas = offscreenCanvas;
         this._landscapeCtx = offscreenCtx;
      }
      else {
         offscreenCanvas = this._landscapeCanvas;
         offscreenCtx = this._landscapeCtx;
      }

      const colorMap = this.getColorMap();
      
      // once practical, only redraw when a change has been made to the world
      for (let x = 0; x < wd.width; x++) {
         for (let y = 0; y < wd.height; y++) {
            let z = this.topBlocks.get(x, y);
            let material = wd.getBlockType(x, y, z);

            // let cell_color = colorMap[x][y];
            let cell_color = Material.getColorOf(material);
            
            offscreenCtx.fillStyle = cell_color;
            offscreenCtx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
         }
      }
         
      // return offscreenCanvas;
      var result = {
         image: offscreenCanvas,
         blockSize: blockSize
      };

      console.log(result);

      return result;
   }

   drawLandscapeToGlobalCanvas() {
      // We have our landscape image, but now we need to draw it onto the global canvas that we're rendering to.
      // To do this, we need to:
      // 1. Scale the landscape image according to the user's zoom level.
      // 2. Center the landscape image horizontally and vertically on the canvas.
      // 3. Draw the landscape image onto the canvas at the calculated position and size.

      const c = this.context;
      let landscape = this.renderLandscape();

      let globalBlockSize = (3 * this.viewRect.zoomFactor);
      let localBlockSize = 30;
      let globalViewRect = this.viewRect;
      
      let cropX = (globalViewRect.x * localBlockSize);
      let cropY = (globalViewRect.y * localBlockSize);
      
      let img = landscape.image;

      c.drawImage(
         img, 
         0, 0, img.width, img.height, 
         globalViewRect.x, globalViewRect.y, (img.width / localBlockSize) * globalBlockSize, (img.height / localBlockSize) * globalBlockSize
      );
   }

   sample_voxels_topdown() {
      // do some frames-per-second calculations
      let now = performance.now();
      if (this._lastSecondStart == null || (now - this._lastSecondStart >= 1000)) {
         if (this._lastSecondStart != null) {
            this._fpslog.push(this._framesThisSecond);
         }

         this._lastSecondStart = now;
         this._framesThisSecond = 0;
      }

      let world_shape = this.world.data.shape;
      let vmd = this.world.data;
      let width = vmd.width, height = vmd.height, depth = vmd.depth;

      let c = this.context;

      // erase the canvas so that it can be repainted
      c.clearRect(0, 0, this.canvasElem.width, this.canvasElem.height);

      // self explanatory
      // this.drawLandscapeToGlobalCanvas();

      // render all other items onto c
      let blockSize = 3;
      blockSize *= (this.viewRect.zoomFactor);

      this.world.tick(1);
      var zmin = this.topBlocks.min();
      var zmax = this.topBlocks.max();
      let colormap = this.getColorMap();

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

            let material = vmd.getBlockType(x, y, z);
            if (material == null) {
               continue;
            }

            var cell_color = colormap[x][y];

            c.fillStyle = cell_color;

            let displX = (x * blockSize) + this.viewRect.x;
            let diplY = (y * blockSize) + this.viewRect.y;

            c.fillRect(displX, diplY, blockSize, blockSize);
         }
      }

      // Draw little circles to represent the Persons in `this.world.entities`
      for (var i = 0; i < this.world.entities.length; i++) {
         let entity = this.world.entities[i];

         // calculate where to put the circle
         let displX = (entity.pos.x * blockSize) + this.viewRect.x;
         let diplY = (entity.pos.y * blockSize) + this.viewRect.y;
         
         // draw the circle
         c.beginPath();
         c.arc(displX + blockSize / 2, diplY + blockSize / 2, blockSize / 2, 0, 2 * Math.PI);
         c.fillStyle = 'red'; // Example color for the person
         c.fill();

         // Draw a sequence of lines to visualize the path of the person
         if (entity._activePath) {
            // Example color for the path
            c.strokeStyle = 'blue'; 
            c.lineWidth = 2;

            c.beginPath();
            c.moveTo(displX + blockSize / 2, diplY + blockSize / 2);
            for (let i = 0; i < entity._activePath.length; i++) {
               let pos = entity._activePath[i];
               let displX = (pos.x * blockSize) + this.viewRect.x;
               let diplY = (pos.y * blockSize) + this.viewRect.y;
               c.lineTo(displX + blockSize / 2, diplY + blockSize / 2);
            }
            c.stroke();
         }

         // Draw an outline around the boundaries of this Person's claimed_blocks
         if (entity.claimed_blocks && entity.claimed_blocks.length > 0) {
            c.strokeStyle = 'black'; // Example color for the outline
            c.lineWidth = 0.75;

            c.beginPath();
            entity.claimed_blocks.forEach(block => {
               let displX = (block.x * blockSize) + this.viewRect.x;
               let diplY = (block.y * blockSize) + this.viewRect.y;
               c.rect(displX, diplY, blockSize, blockSize);
            });
            c.stroke();
         }
      }

      // draw the frames-per-second to top-right corner of the canvas
      if (this._fpslog.length > 1) {
         c.font = '12px Arial';
         c.fillStyle = 'black';
         c.textAlign = 'right';
         c.fillText("FPS: " + this._fpslog[this._fpslog.length - 1], this.canvasElem.width - 30, 24);
      }

      // increment the frame-count
      this._framesThisSecond++;
   }
}

function parseColor(baseColor) {
   if (typeof baseColor === 'string') {
      if (baseColor.charAt(0) === '#') { // hex color
         // Parse hex color and convert to RGB object
         const bigint = parseInt(baseColor.slice(1), 16);
         var color = {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255
         };

         return color;
      }
      else {
         // Attempt to parse CSS color function
         const match = baseColor.match(/(rgb|argb|rgba)\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d+(?:\.\d+)?))?\s*\)/i);
         if (match) {
            var space = match[1];
            var num_args = match[5] ? 3 : 4;
            var args = _.range(num_args).map(i => parseFloat(match[2+i]));
            var argnames = space.split('');
            var color = {};
            for (let i = 0; i < argnames.length; i++) {
               color[argnames[i]] = args[i];
            }

            return color;
         }

         return null;
      }
   }
   else {
      if (baseColor instanceof Object) {
         if (baseColor.r !== undefined && baseColor.g !== undefined && baseColor.b !== undefined) {
            color = {
               r: baseColor.r,
               g: baseColor.g,
               b: baseColor.b
            };
         }
         else if (baseColor.a !== undefined && baseColor.r !== undefined && baseColor.g !== undefined && baseColor.b !== undefined) {
            color = {
               a: baseColor.a,
               r: baseColor.r,
               g: baseColor.g,
               b: baseColor.b
            };
         }
         else {
            throw new Error('Unrecognized color object');
         }
      }
      else {
         throw new Error('Unrecognized color value');
      }
   }
}

module.exports['TopDownRenderer'] = TopDownRenderer;
// module.exports