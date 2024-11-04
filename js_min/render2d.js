var nj = require("numjs");

let $ = require("jquery");

var w = require("./world"), Person = require("./person").Person;

let Material = w.Material, World = w.World, Rect3D = require("./geometry").Rect3D;

class Rect {
    constructor(e, t, o, i) {
        this.x = e, this.y = t, this.width = o, this.height = i;
    }
}

class ViewRect extends Rect {
    constructor(e, t, o, i, s = 1) {
        super(e, t, o, i), this.zoomFactor = s;
    }
}

class TopDownRenderer {
    constructor(e) {
        this.canvasElem = document.getElementById("box-canvas"), this.context = this.canvasElem.getContext("2d"), 
        e = e || new World(), this.world = e, this.viewRect = new ViewRect(0, 0, e.getWidth(), e.getHeight()), 
        // 2D matrix used to cache the highest non-air blocks
        this.topBlocks = nj.zeros([ e.getWidth(), e.getHeight() ]), this._disposalRoutines = [], 
        // fields related to FPS monitoring
        this._lastSecondStart = null, this._framesThisSecond = 0, this._fpslog = [], 
        // initialize the canvas for our render loop
        this.initCanvas();
    }
    initCanvas() {
        let i = this, s = i.canvasElem;
        function e() {
            s.width = window.innerWidth, s.height = window.innerHeight, i.viewRect.width = s.width, 
            i.viewRect.height = s.height;
        }
        function t(e) {
            var t = s.getBoundingClientRect(), o = e.clientX - t.left, e = e.clientY - t.top;
            i.onCanvasClicked(o, e);
        }
        function o(e) {
            var t = s.getBoundingClientRect(), o = e.clientX - t.left, t = e.clientY - t.top;
            i.onCanvasRightClicked(o, t), e.preventDefault();
        }
        function a(e) {
            /**
          * How much the mouse wheel was scrolled.
          * @type {Number}
          */
            var e = e.originalEvent.deltaY, t = i.viewRect.zoomFactor, e = (i.viewRect.zoomFactor += .002 * e, 
            // Clamp the zoom factor to a range
            i.viewRect.zoomFactor = Math.max(.1, i.viewRect.zoomFactor), i.viewRect.zoomFactor = Math.min(200, i.viewRect.zoomFactor), 
            i.viewRect.zoomFactor - t), t = (
            // Move the view to center the change in zoom factor
            i.viewRect.x -= e * (s.width / 2), i.viewRect.y -= e * (s.height / 2), 
            console.log("new zoom factor: ", i.viewRect.zoomFactor), 2 * i.viewRect.zoomFactor);
            // Update the zoom factor
            console.log(`new block size: ${t}x` + t);
        }
        console.log(s), $(window).on("resize", e), e(), $(s).on("click", t), $(s).on("contextmenu", o), 
        $(s).on("mousewheel", a);
        let r = 20;
        function l(e) {
            switch (e.key) {
              case "w":
                i.viewRect.y -= r;
                break;

              case "a":
                i.viewRect.x -= r;
                break;

              case "s":
                i.viewRect.y += r;
                break;

              case "d":
                i.viewRect.x += r;
            }
        }
        $(window).on("keydown", l), i._disposalRoutines.push(function() {
            $(window).off("resize", e), $(window).off("keydown", l), $(s).off("click", t), 
            $(s).off("contextmenu", o), $(s).off("mousewheel", a);
        });
    }
    onCanvasRightClicked(e, t) {
        var o = this, i = (o.world.data, 2 * this.viewRect.zoomFactor), e = Math.floor((e - o.viewRect.x) / i), t = Math.floor((t - o.viewRect.y) / i);
        try {
            // // Select the block at the clicked position
            var s = this.topBlocks.get(e, t), a = new Person(o.world);
            a.setPos(e, t, s), o.world.entities.push(a), a.inventory.addItem({
                block_type: "sapling"
            }, "sapling", 25), a.buildHome();
        } catch (e) {
            console.error(e);
        }
    }
    onCanvasClicked(e, t) {
        var o = this, i = o.world.data, s = 2 * this.viewRect.zoomFactor, e = Math.floor((e - o.viewRect.x) / s), t = Math.floor((t - o.viewRect.y) / s);
        try {
            // Select the block at the clicked position
            var a = this.topBlocks.get(e, t);
            0 !== i.getBlockType(e, t, a) ? (// Assuming 0 represents an empty block
            i.setBlockType(e, t, a, Material.AIR), // Place a block of specified type
            0 <= a - 1 && o.topBlocks.set(e, t, a + 1), console.log(`Removed block at (${e}, ${t})`)) : console.log(`No block exists at (${e}, ${t})`);
        } catch (e) {
            console.error(e);
        }
    }
    render_loop() {
        let e = this;
        this.sample_voxels_topdown(), requestAnimationFrame(() => {
            e.render_loop();
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
        var o = this.world.data, i = this.topBlocks, s = [];
        for (let t = 0; t < i.shape[0]; t++) {
            s[t] = [];
            for (let e = 0; e < i.shape[1]; e++) {
                var a = o.getBlockType(t, e, i.get(t, e)), a = Material.getColorOf(a);
                s[t][e] = a;
            }
        }
        for (let t = 1; t < i.shape[1] - 1; t++) for (let e = 0; e < i.shape[0]; e++) {
            var r, l = i.get(e, t), c = i.get(e, t - 1), n = i.get(e, t + 1);
            c < l ? (c = 1 - .05 * (l - c), (r = parseColor(s[e][t])).r += r.r * c, 
            r.g += r.g * c, r.b += r.b * c, s[e][t] = `rgb(${r.r}, ${r.g}, ${r.b})`) : l < n && (c = 1 + .05 * (n - l), 
            (r = parseColor(s[e][t])).r *= c, r.g *= c, r.b *= c, s[e][t] = `rgb(${r.r}, ${r.g}, ${r.b})`);
        }
        return s;
    }
    renderLandscape() {
        var o, i = this.world.data;
        if (this._landscapeCanvas) t = this._landscapeCanvas, o = this._landscapeCtx; else {
            try {
                o = (t = new OffscreenCanvas(30 * i.width, 30 * i.height)).getContext("2d");
            } catch (e) {
                t.width = 30 * i.width, t.height = 30 * i.height, o = t.getContext("2d");
            }
            this._landscapeCanvas = t, this._landscapeCtx = o;
        }
        this.getColorMap();
        // once practical, only redraw when a change has been made to the world
        for (let t = 0; t < i.width; t++) for (let e = 0; e < i.height; e++) {
            var s = this.topBlocks.get(t, e), s = i.getBlockType(t, e, s), s = Material.getColorOf(s);
            o.fillStyle = s, o.fillRect(30 * t, 30 * e, 30, 30);
        }
        // return offscreenCanvas;
        var t = {
            image: t,
            blockSize: 30
        };
        return console.log(t), t;
    }
    drawLandscapeToGlobalCanvas() {
        // We have our landscape image, but now we need to draw it onto the global canvas that we're rendering to.
        // To do this, we need to:
        // 1. Scale the landscape image according to the user's zoom level.
        // 2. Center the landscape image horizontally and vertically on the canvas.
        // 3. Draw the landscape image onto the canvas at the calculated position and size.
        var e = this.context, t = this.renderLandscape(), o = 3 * this.viewRect.zoomFactor, i = this.viewRect, t = (i.x, 
        t.image);
        e.drawImage(t, 0, 0, t.width, t.height, i.x, i.y, t.width / 30 * o, t.height / 30 * o);
    }
    sample_voxels_topdown() {
        // do some frames-per-second calculations
        var e = performance.now(), i = ((null == this._lastSecondStart || 1e3 <= e - this._lastSecondStart) && (null != this._lastSecondStart && this._fpslog.push(this._framesThisSecond), 
        this._lastSecondStart = e, this._framesThisSecond = 0), this.world.data.shape, 
        this.world.data), t = i.width, s = i.height;
        let a = this.context, r = (
        // erase the canvas so that it can be repainted
        a.clearRect(0, 0, this.canvasElem.width, this.canvasElem.height), 3);
        r *= this.viewRect.zoomFactor, this.world.tick(1);
        this.topBlocks.min(), this.topBlocks.max();
        var l, c, n = this.getColorMap();
        for (let o = 0; o < t; o++) for (let t = 0; t < s; t++) {
            let e = this.topBlocks.get(o, t);
            0 === e && (e = i.getSunlitBlockAt(o, t), this.topBlocks.set(o, t, e)), 
            void 0 === e && (e = 0), null != i.getBlockType(o, t, e) && (l = n[o][t], 
            a.fillStyle = l, l = o * r + this.viewRect.x, c = t * r + this.viewRect.y, 
            a.fillRect(l, c, r, r));
        }
        // Draw little circles to represent the Persons in `this.world.entities`
        for (var o = 0; o < this.world.entities.length; o++) {
            var h = this.world.entities[o], d = h.pos.x * r + this.viewRect.x, w = h.pos.y * r + this.viewRect.y;
            // calculate where to put the circle
            // Draw a sequence of lines to visualize the path of the person
            if (
            // draw the circle
            a.beginPath(), a.arc(d + r / 2, w + r / 2, r / 2, 0, 2 * Math.PI), a.fillStyle = "red", 
            // Example color for the person
            a.fill(), h._activePath) {
                // Example color for the path
                a.strokeStyle = "blue", a.lineWidth = 2, a.beginPath(), a.moveTo(d + r / 2, w + r / 2);
                for (let e = 0; e < h._activePath.length; e++) {
                    var v = h._activePath[e], g = v.x * r + this.viewRect.x, v = v.y * r + this.viewRect.y;
                    a.lineTo(g + r / 2, v + r / 2);
                }
                a.stroke();
            }
            // Draw an outline around the boundaries of this Person's claimed_blocks
            h.claimed_blocks && 0 < h.claimed_blocks.length && (a.strokeStyle = "black", 
            // Example color for the outline
            a.lineWidth = .75, a.beginPath(), h.claimed_blocks.forEach(e => {
                var t = e.x * r + this.viewRect.x, e = e.y * r + this.viewRect.y;
                a.rect(t, e, r, r);
            }), a.stroke());
        }
        // draw the frames-per-second to top-right corner of the canvas
        1 < this._fpslog.length && (a.font = "12px Arial", a.fillStyle = "black", 
        a.textAlign = "right", a.fillText("FPS: " + this._fpslog[this._fpslog.length - 1], this.canvasElem.width - 30, 24)), 
        // increment the frame-count
        this._framesThisSecond++;
    }
}

function parseColor(e) {
    if ("string" == typeof e) {
        if ("#" === e.charAt(0)) return {
            r: (o = parseInt(e.slice(1), 16)) >> 16 & 255,
            g: o >> 8 & 255,
            b: 255 & o
        };
        {
            // Attempt to parse CSS color function
            let t = e.match(/(rgb|argb|rgba)\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d+(?:\.\d+)?))?\s*\)/i);
            if (t) {
                var o = t[1], i = t[5] ? 3 : 4, s = _.range(i).map(e => parseFloat(t[2 + e])), a = o.split(""), r = {};
                for (let e = 0; e < a.length; e++) r[a[e]] = s[e];
                return r;
            }
            return null;
        }
    }
    if (!(e instanceof Object)) throw new Error("Unrecognized color value");
    if (void 0 !== e.r && void 0 !== e.g && void 0 !== e.b) e.r; else {
        if (void 0 === e.a || void 0 === e.r || void 0 === e.g || void 0 === e.b) throw new Error("Unrecognized color object");
        e.a;
    }
}

module.exports.TopDownRenderer = TopDownRenderer;
// module.exports
