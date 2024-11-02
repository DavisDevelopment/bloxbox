class WebGLCube {
   constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl');

      if (!this.gl) {
         console.error("WebGL not supported, falling back on experimental-webgl");
         this.gl = canvas.getContext('experimental-webgl');
      }

      if (!this.gl) {
         alert("Your browser does not support WebGL.");
         return;
      }

      this.init();
   }

   init() {
      // Set up the vertex and fragment shaders
      this.vertexShaderSource = `
      attribute vec4 aVertexPosition;
      attribute vec4 aVertexColor;

      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;

      varying lowp vec4 vColor;

      void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
      }
    `;

      this.fragmentShaderSource = `
      varying lowp vec4 vColor;

      void main(void) {
        gl_FragColor = vColor;
      }
    `;

      this.shaderProgram = this.initShaderProgram(this.vertexShaderSource, this.fragmentShaderSource);
      this.programInfo = {
         attribLocations: {
            vertexPosition: this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
            vertexColor: this.gl.getAttribLocation(this.shaderProgram, 'aVertexColor'),
         },
         uniformLocations: {
            projectionMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uModelViewMatrix'),
         },
      };

      this.buffers = this.initBuffers();
      this.rotation = 0;
      this.cameraPos = [0, 0, -6];
      this.cameraSpeed = 0.05;
      this.initControls();

      this.render();
   }

   initShaderProgram(vsSource, fsSource) {
      const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
      const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);

      const shaderProgram = this.gl.createProgram();
      this.gl.attachShader(shaderProgram, vertexShader);
      this.gl.attachShader(shaderProgram, fragmentShader);
      this.gl.linkProgram(shaderProgram);

      if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
         console.error('Unable to initialize the shader program:', this.gl.getProgramInfoLog(shaderProgram));
         return null;
      }

      return shaderProgram;
   }

   loadShader(type, source) {
      const shader = this.gl.createShader(type);

      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);

      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
         console.error('An error occurred compiling the shaders:', this.gl.getShaderInfoLog(shader));
         this.gl.deleteShader(shader);
         return null;
      }

      return shader;
   }

   initBuffers() {
      const positions = [
         -1.0, -1.0, 1.0,
         1.0, -1.0, 1.0,
         1.0, 1.0, 1.0,
         -1.0, 1.0, 1.0,
         -1.0, -1.0, -1.0,
         -1.0, 1.0, -1.0,
         1.0, 1.0, -1.0,
         1.0, -1.0, -1.0,
      ];

      const colors = [
         [1.0, 0.0, 0.0, 1.0],
         [0.0, 1.0, 0.0, 1.0],
         [0.0, 0.0, 1.0, 1.0],
         [1.0, 1.0, 0.0, 1.0],
         [1.0, 0.0, 1.0, 1.0],
         [0.0, 1.0, 1.0, 1.0],
      ].reduce((acc, val) => acc.concat(val, val, val, val), []);

      const indices = [
         0, 1, 2, 0, 2, 3,
         4, 5, 6, 4, 6, 7,
         0, 3, 5, 0, 5, 4,
         1, 7, 6, 1, 6, 2,
         3, 2, 6, 3, 6, 5,
         0, 4, 7, 0, 7, 1,
      ];

      const positionBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

      const colorBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);

      const indexBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

      return {
         position: positionBuffer,
         color: colorBuffer,
         indices: indexBuffer,
      };
   }

   initControls() {
      document.addEventListener('keydown', (event) => {
         switch (event.key) {
            case 'w':
               this.cameraPos[2] += this.cameraSpeed;
               break;
            case 's':
               this.cameraPos[2] -= this.cameraSpeed;
               break;
            case 'a':
               this.cameraPos[0] += this.cameraSpeed;
               break;
            case 'd':
               this.cameraPos[0] -= this.cameraSpeed;
               break;
         }
      });

      this.canvas.addEventListener('mousemove', (event) => {
         const xRotation = event.movementY * 0.01;
         const yRotation = event.movementX * 0.01;
         mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, xRotation, [1, 0, 0]);
         mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, yRotation, [0, 1, 0]);
      });
   }

   render() {
      this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
      this.gl.clearDepth(1.0);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.depthFunc(this.gl.LEQUAL);

      const projectionMatrix = mat4.create();
      mat4.perspective(projectionMatrix, 45 * Math.PI / 180, this.canvas.width / this.canvas.height, 0.1, 100.0);

      this.modelViewMatrix = mat4.create();
      mat4.translate(this.modelViewMatrix, this.modelViewMatrix, this.cameraPos);
      mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, this.rotation, [0, 1, 1]);

      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      this.gl.useProgram(this.shaderProgram);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
      this.gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.color);
      this.gl.vertexAttribPointer(this.programInfo.attribLocations.vertexColor, 4, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexColor);

      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);

      this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
      this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, false, this.modelViewMatrix);

      const vertexCount = 36;
      const type = this.gl.UNSIGNED_SHORT;
      this.gl.drawElements(this.gl.TRIANGLES, vertexCount, type, 0);

      this.rotation += 0.01;
      requestAnimationFrame(this.render.bind(this));
   }
}

// Usage:
const canvas = document.getElementById("box-canvas");
const webGLCube = new WebGLCube(canvas);
