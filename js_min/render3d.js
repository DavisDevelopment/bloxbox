var glm = require("gl-matrix"), mat4 = glm.mat4, vd = require("./blockdata"), Material = vd.Material;

class Renderer3d {
    /**
    * Initializes the 3D renderer with the specified canvas and world.
    * @param {HTMLCanvasElement} canvas - The HTML canvas element to render to.
    * @param {Object} world - The world object containing the scene data.
    */
    constructor(t, i) {
        this.canvas = t, this.initCanvas(), 
        // Initialize WebGL context
        this.gl = t.getContext("webgl"), this.gl || (console.error("WebGL not supported, falling back on experimental-webgl"), 
        this.gl = t.getContext("experimental-webgl")), this.gl || alert("Your browser does not support WebGL"), 
        this.world = i, 
        // Setup shaders and buffers
        this.shaderProgram = this.initShaders(), this.positionBuffer = this.gl.createBuffer(), 
        this.colorBuffer = this.gl.createBuffer(), 
        // Set the viewport to match the canvas dimensions
        this.gl.viewport(0, 0, t.width, t.height), 
        // Initialize projection and view matrices
        this.projectionMatrix = new Float32Array(16), this.viewMatrix = new Float32Array(16), 
        // Define basic camera settings
        this.cameraPosition = [ 0, 0, 5 ], this.cameraDirection = [ 0, 0, -1 ], 
        this.up = [ 0, 1, 0 ], 
        // Begin rendering the scene
        this.render();
    }
    initCanvas() {
        // Get the size of the actual browser viewport, and resize the canvas element to fill that space
        let t = this.canvas;
        var i = () => {
            t.width = window.innerWidth, t.height = window.innerHeight;
        };
        window.addEventListener("resize", i), i(), window.addEventListener("mousemove", t => this.handle_mousemove(t)), 
        window.addEventListener("keydown", t => this.handle_keydown(t));
    }
    initShaders() {
        var t = this.loadShader(this.gl.VERTEX_SHADER, `
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
        `), i = this.loadShader(this.gl.FRAGMENT_SHADER, `
            precision mediump float;
            varying vec3 vColor;

            void main(void) {
                gl_FragColor = vec4(vColor, 1.0);
            }
        `), e = this.gl.createProgram();
        return this.gl.attachShader(e, t), this.gl.attachShader(e, i), this.gl.linkProgram(e), 
        this.gl.getProgramParameter(e, this.gl.LINK_STATUS) || console.error("Unable to initialize the shader program: " + this.gl.getProgramInfoLog(e)), 
        this.gl.useProgram(e), e;
    }
    loadShader(t, i) {
        t = this.gl.createShader(t);
        return this.gl.shaderSource(t, i), this.gl.compileShader(t), this.gl.getShaderParameter(t, this.gl.COMPILE_STATUS) ? t : (console.error("An error occurred compiling the shaders: " + this.gl.getShaderInfoLog(t)), 
        this.gl.deleteShader(t), null);
    }
    render() {
        // Clear the canvas
        this.gl.clearColor(0, 0, 0, 1), this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT), 
        this.gl.enable(this.gl.DEPTH_TEST), 
        // Prepare matrices
        this._tick_camera(), mat4.perspective(this.projectionMatrix, Math.PI / 4, this.canvas.width / this.canvas.height, .1, 100), 
        mat4.lookAt(this.viewMatrix, this.cameraPosition, this.cameraPosition.map((t, i) => t + this.cameraDirection[i]), this.up), 
        this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.shaderProgram, "projectionMatrix"), !1, this.projectionMatrix), 
        this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.shaderProgram, "viewMatrix"), !1, this.viewMatrix), 
        this.drawWorld(), requestAnimationFrame(() => this.render());
    }
    handle_keydown(t) {
        switch (t.code) {
          case "ArrowUp":
            this.cameraPosition[1] += 1;
            break;

          case "ArrowDown":
            --this.cameraPosition[1];
            break;

          case "ArrowLeft":
            --this.cameraPosition[0];
            break;

          case "ArrowRight":
            this.cameraPosition[0] += 1;

            //TODO 'fly' upward when spacebar is pressed
        }
    }
    handle_mousemove(t) {
        // Calculate the mouse position relative to the canvas
        let i = this.canvas.getBoundingClientRect();
        void 0 === i && (e = getComputedStyle(this.canvas), i = {
            left: parseFloat(e.left),
            top: parseFloat(e.top),
            width: parseFloat(e.width),
            height: parseFloat(e.height)
        });
        var e = t.clientX - i.left, t = (i.top, e / this.canvas.width * 2 - 1), e = (this.canvas.height, 
        Math.cos(t)), t = Math.sin(t), r = this.cameraDirection[0] * e - this.cameraDirection[2] * t, t = this.cameraDirection[0] * t + this.cameraDirection[2] * e, e = Math.PI / 2, a = Math.atan2(t, r);
        Math.abs(a) > e && (r = Math.sign(r) * Math.cos(e), t = Math.sign(t) * Math.sin(e)), 
        // Update the camera direction
        this.cameraDirection[0] = r, this.cameraDirection[2] = t;
    }
    _tick_camera() {
        // Define a rotation speed
        var t = Math.cos(.01), i = Math.sin(.01), e = this.cameraDirection[0] * t - this.cameraDirection[2] * i, i = this.cameraDirection[0] * i + this.cameraDirection[2] * t;
        // Calculate new camera direction by rotating around the Y-axis
        this.cameraDirection[0] = e, this.cameraDirection[2] = i;
    }
    drawWorld() {
        var r = [], a = [];
        for (let e = 0; e < this.world.getWidth(); e++) for (let i = 0; i < this.world.getHeight(); i++) for (let t = 0; t < this.world.getDepth(); t++) {
            var o = this.world.getBlockType(e, i, t);
            o !== Material.AIR && (o = this.getColorFromMaterial(o), this.addCubeData(r, a, e, i, t, o));
        }
        // Bind position buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer), this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(r), this.gl.STATIC_DRAW);
        var t = this.gl.getAttribLocation(this.shaderProgram, "position"), t = (this.gl.vertexAttribPointer(t, 3, this.gl.FLOAT, !1, 0, 0), 
        this.gl.enableVertexAttribArray(t), 
        // Bind color buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer), this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(a), this.gl.STATIC_DRAW), 
        this.gl.getAttribLocation(this.shaderProgram, "color")), t = (this.gl.vertexAttribPointer(t, 3, this.gl.FLOAT, !1, 0, 0), 
        this.gl.enableVertexAttribArray(t), r.length / 3);
        // 3 components per position
        this.gl.drawArrays(this.gl.TRIANGLES, 0, t);
    }
    /**
    * @param {number} material - The material type to get the color from
    * @returns {number[]} - An array of RGB values between 0 and 1
    */
    getColorFromMaterial(t) {
        // Get the color from the material dictionary
        t = Material.getColorOf(t);
        // Convert the hex color to a number
        parseInt(t.slice(1), 16);
        // Normalize the RGB values to be between 0 and 1
        // return [r / 255, g / 255, b / 255];
        return [ 1, 0, 0 ];
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
    addCubeData(t, i, e, r, a, o) {
        e = [ 
        // Front face
        e - .5, r - .5, a + .5, e + .5, r - .5, a + .5, e + .5, r + .5, a + .5, e + .5, r + .5, a + .5, e - .5, r + .5, a + .5, e - .5, r - .5, a + .5, 
        // Back face
        e - .5, r - .5, a - .5, e + .5, r - .5, a - .5, e + .5, r + .5, a - .5, e + .5, r + .5, a - .5, e - .5, r + .5, a - .5, e - .5, r - .5, a - .5, 
        // Top face
        e - .5, r + .5, a - .5, e + .5, r + .5, a - .5, e + .5, r + .5, a + .5, e + .5, r + .5, a + .5, e - .5, r + .5, a + .5, e - .5, r + .5, a - .5, 
        // Bottom face
        e - .5, r - .5, a - .5, e + .5, r - .5, a - .5, e + .5, r - .5, a + .5, e + .5, r - .5, a + .5, e - .5, r - .5, a + .5, e - .5, r - .5, a - .5, 
        // Right face
        e + .5, r - .5, a - .5, e + .5, r + .5, a - .5, e + .5, r + .5, a + .5, e + .5, r + .5, a + .5, e + .5, r - .5, a + .5, e + .5, r - .5, a - .5, 
        // Left face
        e - .5, r - .5, a - .5, e - .5, r + .5, a - .5, e - .5, r + .5, a + .5, e - .5, r + .5, a + .5, e - .5, r - .5, a + .5, e - .5, r - .5, a - .5 ];
        // Push vertices to positions
        t.push(...e), i.push(...Array(e.length / 3).fill(o).flat());
    }
}

module.exports.Renderer3d = Renderer3d;
