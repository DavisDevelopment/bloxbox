class WebGLCube {
    constructor(t) {
        this.canvas = t, this.gl = t.getContext("webgl"), this.gl || (console.error("WebGL not supported, falling back on experimental-webgl"), 
        this.gl = t.getContext("experimental-webgl")), this.gl ? this.init() : alert("Your browser does not support WebGL.");
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
    `, this.fragmentShaderSource = `
      varying lowp vec4 vColor;

      void main(void) {
        gl_FragColor = vColor;
      }
    `, this.shaderProgram = this.initShaderProgram(this.vertexShaderSource, this.fragmentShaderSource), 
        this.programInfo = {
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition"),
                vertexColor: this.gl.getAttribLocation(this.shaderProgram, "aVertexColor")
            },
            uniformLocations: {
                projectionMatrix: this.gl.getUniformLocation(this.shaderProgram, "uProjectionMatrix"),
                modelViewMatrix: this.gl.getUniformLocation(this.shaderProgram, "uModelViewMatrix")
            }
        }, this.buffers = this.initBuffers(), this.rotation = 0, this.cameraPos = [ 0, 0, -6 ], 
        this.cameraSpeed = .05, this.initControls(), this.render();
    }
    initShaderProgram(t, e) {
        var t = this.loadShader(this.gl.VERTEX_SHADER, t), e = this.loadShader(this.gl.FRAGMENT_SHADER, e), i = this.gl.createProgram();
        return this.gl.attachShader(i, t), this.gl.attachShader(i, e), this.gl.linkProgram(i), 
        this.gl.getProgramParameter(i, this.gl.LINK_STATUS) ? i : (console.error("Unable to initialize the shader program:", this.gl.getProgramInfoLog(i)), 
        null);
    }
    loadShader(t, e) {
        t = this.gl.createShader(t);
        return this.gl.shaderSource(t, e), this.gl.compileShader(t), this.gl.getShaderParameter(t, this.gl.COMPILE_STATUS) ? t : (console.error("An error occurred compiling the shaders:", this.gl.getShaderInfoLog(t)), 
        this.gl.deleteShader(t), null);
    }
    initBuffers() {
        var t = [ [ 1, 0, 0, 1 ], [ 0, 1, 0, 1 ], [ 0, 0, 1, 1 ], [ 1, 1, 0, 1 ], [ 1, 0, 1, 1 ], [ 0, 1, 1, 1 ] ].reduce((t, e) => t.concat(e, e, e, e), []), e = this.gl.createBuffer(), i = (this.gl.bindBuffer(this.gl.ARRAY_BUFFER, e), 
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([ -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1 ]), this.gl.STATIC_DRAW), 
        this.gl.createBuffer()), t = (this.gl.bindBuffer(this.gl.ARRAY_BUFFER, i), 
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(t), this.gl.STATIC_DRAW), 
        this.gl.createBuffer());
        return this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, t), this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 3, 5, 0, 5, 4, 1, 7, 6, 1, 6, 2, 3, 2, 6, 3, 6, 5, 0, 4, 7, 0, 7, 1 ]), this.gl.STATIC_DRAW), 
        {
            position: e,
            color: i,
            indices: t
        };
    }
    initControls() {
        document.addEventListener("keydown", t => {
            switch (t.key) {
              case "w":
                this.cameraPos[2] += this.cameraSpeed;
                break;

              case "s":
                this.cameraPos[2] -= this.cameraSpeed;
                break;

              case "a":
                this.cameraPos[0] += this.cameraSpeed;
                break;

              case "d":
                this.cameraPos[0] -= this.cameraSpeed;
            }
        }), this.canvas.addEventListener("mousemove", t => {
            var e = .01 * t.movementY, t = .01 * t.movementX;
            mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, e, [ 1, 0, 0 ]), 
            mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, t, [ 0, 1, 0 ]);
        });
    }
    render() {
        this.gl.clearColor(0, 0, 0, 1), this.gl.clearDepth(1), this.gl.enable(this.gl.DEPTH_TEST), 
        this.gl.depthFunc(this.gl.LEQUAL);
        var t = mat4.create(), t = (mat4.perspective(t, 45 * Math.PI / 180, this.canvas.width / this.canvas.height, .1, 100), 
        this.modelViewMatrix = mat4.create(), mat4.translate(this.modelViewMatrix, this.modelViewMatrix, this.cameraPos), 
        mat4.rotate(this.modelViewMatrix, this.modelViewMatrix, this.rotation, [ 0, 1, 1 ]), 
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT), this.gl.useProgram(this.shaderProgram), 
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position), this.gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, this.gl.FLOAT, !1, 0, 0), 
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition), 
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.color), this.gl.vertexAttribPointer(this.programInfo.attribLocations.vertexColor, 4, this.gl.FLOAT, !1, 0, 0), 
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexColor), 
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices), 
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, !1, t), 
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelViewMatrix, !1, this.modelViewMatrix), 
        this.gl.UNSIGNED_SHORT);
        this.gl.drawElements(this.gl.TRIANGLES, 36, t, 0), this.rotation += .01, 
        requestAnimationFrame(this.render.bind(this));
    }
}
// Usage:

let canvas = document.getElementById("box-canvas"), webGLCube = new WebGLCube(canvas);
