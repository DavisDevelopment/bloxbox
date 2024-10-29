var nj = require('numjs');
const $ = require('jquery');

var w = require('./world');
var Person = require('./person').Person;
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

      try {
         // // Select the block at the clicked position
         const z = this.topBlocks.get(worldX, worldY);
  
         var guy = new Person();
         guy.setPos(worldX, worldY, z);
         me.world.entities.push(guy);
      }
      catch (error) {
         console.error(error);
         return ;
      }
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
            vmd.setBlock(worldX, worldY, z, Material.AIR); // Place a block of specified type
            
            if (z - 1 >= 0) {
               me.topBlocks.set(worldX, worldY, z - 1);
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

   // Function to adjust color brightness based on depth
   adjustColorForDepth(baseColor, z, zmin=null, zmax=null) {
      zmax = zmax || this.world.data.depth;
      zmin = zmin || 0;

      if (typeof baseColor === 'string') {
         baseColor = parseColor(baseColor);
      }

      let color = baseColor;

      // Calculate a depth factor between 0 and 1, where Z=0 is fully bright, and maxZ is darkest
      const depthFactor = (z - zmin) / (zmax - zmin);

      // Adjust the RGB channels based on the depth factor
      const r = Math.floor(color.r * depthFactor);
      const g = Math.floor(color.g * depthFactor);
      const b = Math.floor(color.b * depthFactor);

      // Convert to string
      return `rgb(${r}, ${g}, ${b})`;
   }

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
               //TODO
            }
         }
      }

      return colormap;
   }

   sample_voxels_topdown() {
      let world_shape = this.world.data.shape;
      let vmd = this.world.data;
      let width = vmd.width, height = vmd.height, depth = vmd.depth;

      let c = this.context;
      c.clearRect(0, 0, this.canvasElem.width, this.canvasElem.height);

      var blockSize = 3;
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
      this.world.entities.forEach(entity => {
         let displX = (entity.pos.x * blockSize) + this.viewRect.x;
         let diplY = (entity.pos.y * blockSize) + this.viewRect.y;
         
         c.beginPath();
         c.arc(displX + blockSize / 2, diplY + blockSize / 2, blockSize / 2, 0, 2 * Math.PI);
         c.fillStyle = 'red'; // Example color for the person
         c.fill();

         // Draw a sequence of lines to visualize the path of the person
         if (entity._activePath) {
            c.strokeStyle = 'blue'; // Example color for the path
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
      });
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