
var glm = require('gl-matrix');
var mat4 = glm.mat4;

var vd = require('./blockdata');
var Material = vd.Material;

class Renderer3d {
   /**
    * Initializes the 3D renderer with the specified canvas and world.
    * @param {HTMLCanvasElement} canvas - The HTML canvas element to render to.
    * @param {Object} world - The world object containing the scene data.
    */
   constructor(canvas, world) {
      this.canvas = canvas;
      this.initCanvas();
      // Initialize WebGL context
      this.gl = canvas.getContext('webgl');
      if (!this.gl) {
         console.error("WebGL not supported, falling back on experimental-webgl");
         this.gl = canvas.getContext('experimental-webgl');
      }
      if (!this.gl) {
         alert("Your browser does not support WebGL");
      }

      this.world = world;

      // Setup shaders and buffers
      this.shaderProgram = this.initShaders();
      this.positionBuffer = this.gl.createBuffer();
      this.colorBuffer = this.gl.createBuffer();

      // Set the viewport to match the canvas dimensions
      this.gl.viewport(0, 0, canvas.width, canvas.height);

      // Initialize projection and view matrices
      this.projectionMatrix = new Float32Array(16);
      this.viewMatrix = new Float32Array(16);

      // Define basic camera settings
      this.cameraPosition = [0, 0, 5];
      this.cameraDirection = [0, 0, -1];
      this.up = [0, 1, 0];

      // Begin rendering the scene
      this.render();
   }

   initCanvas() {
      // Get the size of the actual browser viewport, and resize the canvas element to fill that space
      const canvas = this.canvas;
      const resizeCanvas = () => {
         canvas.width = window.innerWidth;
         canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      window.addEventListener('mousemove', (e)=>this.handle_mousemove(e));
      window.addEventListener('keydown', (e)=>this.handle_keydown(e));
   }

   initShaders() {
      const vertexShaderSource = `
            attribute vec3 position;
            attribute vec3 color;
            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            varying vec3 vColor;

            void main(void) {
                gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
                gl_PointSize = 1.0;
                vColor = color;
            }
        `;

      const fragmentShaderSource = `
            precision mediump float;
            varying vec3 vColor;

            void main(void) {
                gl_FragColor = vec4(vColor, 1.0);
            }
        `;

      const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

      const shaderProgram = this.gl.createProgram();
      this.gl.attachShader(shaderProgram, vertexShader);
      this.gl.attachShader(shaderProgram, fragmentShader);
      this.gl.linkProgram(shaderProgram);

      if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
         console.error("Unable to initialize the shader program: " + this.gl.getProgramInfoLog(shaderProgram));
      }

      this.gl.useProgram(shaderProgram);
      return shaderProgram;
   }

   loadShader(type, source) {
      const shader = this.gl.createShader(type);
      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);

      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
         console.error("An error occurred compiling the shaders: " + this.gl.getShaderInfoLog(shader));
         this.gl.deleteShader(shader);
         return null;
      }

      return shader;
   }

   render() {
      // Clear the canvas
      this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      this.gl.enable(this.gl.DEPTH_TEST);

      // Prepare matrices
      this._tick_camera();
      mat4.perspective(this.projectionMatrix, Math.PI / 4, this.canvas.width / this.canvas.height, 0.1, 100);
      mat4.lookAt(this.viewMatrix, this.cameraPosition, this.cameraPosition.map((val, index) => val + this.cameraDirection[index]), this.up);

      this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.shaderProgram, "projectionMatrix"), false, this.projectionMatrix);
      this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.shaderProgram, "viewMatrix"), false, this.viewMatrix);

      this.drawWorld();

      requestAnimationFrame(() => this.render());
   }

   handle_keydown(event) {
      switch (event.code) {
         case 'ArrowUp':
            this.cameraPosition[1] += 1;
            break;
         case 'ArrowDown':
            this.cameraPosition[1] -= 1;
            break;
         case 'ArrowLeft':
            this.cameraPosition[0] -= 1;
            break;
         case 'ArrowRight':
            this.cameraPosition[0] += 1;
            break;

         //TODO 'fly' upward when spacebar is pressed
      }
   }

   handle_mousemove(event) {
      // Calculate the mouse position relative to the canvas
      let rect = this.canvas.getBoundingClientRect();
      if (typeof rect === 'undefined') {
         const styles = getComputedStyle(this.canvas);
         rect = {
            left: parseFloat(styles.left),
            top: parseFloat(styles.top),
            width: parseFloat(styles.width),
            height: parseFloat(styles.height)
         };
      }
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;

      // Calculate the relative mouse movement
      var relX = x / this.canvas.width * 2 - 1;
      var relY = - (y / this.canvas.height * 2 - 1);

      // Update the camera direction based on the mouse movement
      var cosAngle = Math.cos(relX);
      var sinAngle = Math.sin(relX);

      var newDirectionX = this.cameraDirection[0] * cosAngle - this.cameraDirection[2] * sinAngle;
      var newDirectionZ = this.cameraDirection[0] * sinAngle + this.cameraDirection[2] * cosAngle;

      // Keep the camera direction from getting too extreme
      var maxAngle = Math.PI / 2;
      var angleFromYAxis = Math.atan2(newDirectionZ, newDirectionX);
      if (Math.abs(angleFromYAxis) > maxAngle) {
         newDirectionX = Math.sign(newDirectionX) * Math.cos(maxAngle);
         newDirectionZ = Math.sign(newDirectionZ) * Math.sin(maxAngle);
      }

      // Update the camera direction
      this.cameraDirection[0] = newDirectionX;
      this.cameraDirection[2] = newDirectionZ;
   }

   _tick_camera() {
      // Define a rotation speed
      const rotationSpeed = 0.01;

      // Calculate new camera direction by rotating around the Y-axis
      const cosAngle = Math.cos(rotationSpeed);
      const sinAngle = Math.sin(rotationSpeed);

      const newDirectionX = this.cameraDirection[0] * cosAngle - this.cameraDirection[2] * sinAngle;
      const newDirectionZ = this.cameraDirection[0] * sinAngle + this.cameraDirection[2] * cosAngle;

      this.cameraDirection[0] = newDirectionX;
      this.cameraDirection[2] = newDirectionZ;
   }

   drawWorld() {
      const positions = [];
      const colors = [];

      for (let x = 0; x < this.world.getWidth(); x++) {
         for (let y = 0; y < this.world.getHeight(); y++) {
            for (let z = 0; z < this.world.getDepth(); z++) {
               const blockType = this.world.getBlockType(, y, z);
               if (blockType !== Material.AIR) {
                  const color = this.getColorFromMaterial(blockType);
                  this.addCubeData(positions, colors, x, y, z, color);
               }
            }
         }
      }

      // Bind position buffer
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
      const positionLocation = this.gl.getAttribLocation(this.shaderProgram, "position");
      this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(positionLocation);

      // Bind color buffer
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
      const colorLocation = this.gl.getAttribLocation(this.shaderProgram, "color");
      this.gl.vertexAttribPointer(colorLocation, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(colorLocation);

      // Draw the cubes
      const vertexCount = positions.length / 3; // 3 components per position
      this.gl.drawArrays(this.gl.TRIANGLES, 0, vertexCount);
   }

   /**
    * @param {number} material - The material type to get the color from
    * @returns {number[]} - An array of RGB values between 0 and 1
    */
   getColorFromMaterial(material) {
      // Get the color from the material dictionary
      const hexColor = Material.getColorOf(material);

      // Convert the hex color to a number
      const rgb = parseInt(hexColor.slice(1), 16);

      // Extract the RGB values from the number
      const r = (rgb >> 16) & 0xFF;
      const g = (rgb >> 8) & 0xFF;
      const b = rgb & 0xFF;

      // Normalize the RGB values to be between 0 and 1
      // return [r / 255, g / 255, b / 255];
     
      return [1, 0, 0];
   }

   /*
   addCubeData(positions, colors, x, y, z, color) {
      const vertices = [
         // Front face (z+)
         x - 0.5, y - 0.5, z + 0.5,
         x + 0.5, y - 0.5, z + 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x - 0.5, y + 0.5, z + 0.5,
         x - 0.5, y - 0.5, z + 0.5,

         // Back face (z-)
         x - 0.5, y - 0.5, z - 0.5,
         x + 0.5, y - 0.5, z - 0.5,
         x + 0.5, y + 0.5, z - 0.5,
         x + 0.5, y + 0.5, z - 0.5,
         x - 0.5, y + 0.5, z - 0.5,
         x - 0.5, y - 0.5, z - 0.5,

         // Left face (x-)
         x - 0.5, y - 0.5, z - 0.5,
         x - 0.5, y - 0.5, z + 0.5,
         x - 0.5, y + 0.5, z + 0.5,
         x - 0.5, y + 0.5, z + 0.5,
         x - 0.5, y + 0.5, z - 0.5,
         x - 0.5, y - 0.5, z - 0.5,

         // Right face (x+)
         x + 0.5, y - 0.5, z - 0.5,
         x + 0.5, y - 0.5, z + 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x + 0.5, y + 0.5, z - 0.5,
         x + 0.5, y - 0.5, z - 0.5,

         // Top face (y+)
         x - 0.5, y + 0.5, z - 0.5,
         x + 0.5, y + 0.5, z - 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x - 0.5, y + 0.5, z + 0.5,
         x - 0.5, y + 0.5, z - 0.5,

         // Bottom face (y-)
         x - 0.5, y - 0.5, z - 0.5,
         x + 0.5, y - 0.5, z - 0.5,
         x + 0.5, y - 0.5, z + 0.5,
         x + 0.5, y - 0.5, z + 0.5,
         x - 0.5, y - 0.5, z + 0.5,
         x - 0.5, y - 0.5, z - 0.5,
      ];

      positions.push(...vertices);
      colors.push(...Array(vertices.length / 3).fill(color).flat());
   }

   addCubeData(positions, colors, x, y, z, color) {
      const vertices = [
         // Front face
         x - 0.5, y - 0.5, z + 0.5,
         x + 0.5, y - 0.5, z + 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x - 0.5, y + 0.5, z + 0.5,
         x - 0.5, y - 0.5, z + 0.5,
         // Other faces...
         // (Add remaining faces similarly)
      ];

      positions.push(...vertices);
      colors.push(...Array(vertices.length / 3).fill(color).flat());
   }
*/
   

   addCubeData(positions, colors, x, y, z, color) {
      const vertices = [
         // Front face
         x - 0.5, y - 0.5, z + 0.5,
         x + 0.5, y - 0.5, z + 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x - 0.5, y + 0.5, z + 0.5,
         x - 0.5, y - 0.5, z + 0.5,

         // Back face
         x - 0.5, y - 0.5, z - 0.5,
         x + 0.5, y - 0.5, z - 0.5,
         x + 0.5, y + 0.5, z - 0.5,
         x + 0.5, y + 0.5, z - 0.5,
         x - 0.5, y + 0.5, z - 0.5,
         x - 0.5, y - 0.5, z - 0.5,

         // Top face
         x - 0.5, y + 0.5, z - 0.5,
         x + 0.5, y + 0.5, z - 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x - 0.5, y + 0.5, z + 0.5,
         x - 0.5, y + 0.5, z - 0.5,

         // Bottom face
         x - 0.5, y - 0.5, z - 0.5,
         x + 0.5, y - 0.5, z - 0.5,
         x + 0.5, y - 0.5, z + 0.5,
         x + 0.5, y - 0.5, z + 0.5,
         x - 0.5, y - 0.5, z + 0.5,
         x - 0.5, y - 0.5, z - 0.5,

         // Right face
         x + 0.5, y - 0.5, z - 0.5,
         x + 0.5, y + 0.5, z - 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x + 0.5, y + 0.5, z + 0.5,
         x + 0.5, y - 0.5, z + 0.5,
         x + 0.5, y - 0.5, z - 0.5,

         // Left face
         x - 0.5, y - 0.5, z - 0.5,
         x - 0.5, y + 0.5, z - 0.5,
         x - 0.5, y + 0.5, z + 0.5,
         x - 0.5, y + 0.5, z + 0.5,
         x - 0.5, y - 0.5, z + 0.5,
         x - 0.5, y - 0.5, z - 0.5,
      ];

      // Push vertices to positions
      positions.push(...vertices);
      colors.push(...Array(vertices.length / 3).fill(color).flat());
   }
}

module.exports['Renderer3d'] = Renderer3d;