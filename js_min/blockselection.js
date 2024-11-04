var __generator = this && this.__generator || function(r, n) {
    var c, a, i, l = {
        label: 0,
        sent: function() {
            if (1 & i[0]) throw i[1];
            return i[1];
        },
        trys: [],
        ops: []
    }, u = Object.create(("function" == typeof Iterator ? Iterator : Object).prototype);
    return u.next = t(0), u.throw = t(1), u.return = t(2), "function" == typeof Symbol && (u[Symbol.iterator] = function() {
        return this;
    }), u;
    function t(o) {
        return function(t) {
            var e = [ o, t ];
            if (c) throw new TypeError("Generator is already executing.");
            for (;l = u && e[u = 0] ? 0 : l; ) try {
                if (c = 1, a && (i = 2 & e[0] ? a.return : e[0] ? a.throw || ((i = a.return) && i.call(a), 
                0) : a.next) && !(i = i.call(a, e[1])).done) return i;
                switch (a = 0, (e = i ? [ 2 & e[0], i.value ] : e)[0]) {
                  case 0:
                  case 1:
                    i = e;
                    break;

                  case 4:
                    return l.label++, {
                        value: e[1],
                        done: !1
                    };

                  case 5:
                    l.label++, a = e[1], e = [ 0 ];
                    continue;

                  case 7:
                    e = l.ops.pop(), l.trys.pop();
                    continue;

                  default:
                    if (!(i = 0 < (i = l.trys).length && i[i.length - 1]) && (6 === e[0] || 2 === e[0])) {
                        l = 0;
                        continue;
                    }
                    if (3 === e[0] && (!i || e[1] > i[0] && e[1] < i[3])) l.label = e[1]; else if (6 === e[0] && l.label < i[1]) l.label = i[1], 
                    i = e; else {
                        if (!(i && l.label < i[2])) {
                            i[2] && l.ops.pop(), l.trys.pop();
                            continue;
                        }
                        l.label = i[2], l.ops.push(e);
                    }
                }
                e = n.call(r, l);
            } catch (t) {
                e = [ 6, t ], a = 0;
            } finally {
                c = i = 0;
            }
            if (5 & e[0]) throw e[1];
            return {
                value: e[0] ? e[1] : void 0,
                done: !0
            };
        };
    }
};

(() => {
    // const geom = require('./geometry');
    var t = require("./geometry"), b = t.Rect3D, h = t.Mesh, e = (
    /**
         * Add a block to the selection
         * @param x
         * @param y
         * @param z
         */
    o.prototype.addBlock = function(t, e, o) {
        this.blocks.add("".concat(t, ",").concat(e, ",").concat(o));
    }, 
    /**
         * Remove a block from the selection
         * @param x
         * @param y
         * @param z
         */
    o.prototype.removeBlock = function(t, e, o) {
        this.blocks.delete("".concat(t, ",").concat(e, ",").concat(o));
    }, 
    /**
         * Check if a block is in the selection
         * @param x
         * @param y
         * @param z
         */
    o.prototype.containsBlock = function(t, e, o) {
        return this.blocks.has("".concat(t, ",").concat(e, ",").concat(o));
    }, 
    /**
         * Get all blocks in the selection as an array of [x, y, z]
         */
    o.prototype.getBlocks = function() {
        return Array.from(this.blocks).map(function(t) {
            return t.split(",").map(Number);
        });
    }, o.prototype[Symbol.iterator] = function() {
        var e, o;
        return __generator(this, function(t) {
            switch (t.label) {
              case 0:
                e = 0, o = this.getBlocks(), t.label = 1;

              case 1:
                return e < o.length ? [ 4 /*yield*/, o[e] ] : [ 3 /*break*/, 4 ];

              case 2:
                t.sent(), t.label = 3;

              case 3:
                return e++, [ 3 /*break*/, 1 ];

              case 4:
                return [ 2 /*return*/ ];
            }
        });
    }, o);
    /*
       the RegionBuffer efficiently stores a selection of voxel coordinates which can
       be dynamically edited via addBlock, removeBlock, containsBlock, etc. methods
    */
    function o() {
        this.blocks = new Set();
    }
    function r() {
        this.b = new e();
    }
    Object.defineProperty(r.prototype, "length", {
        get: function() {
            return this.b.blocks.size;
        },
        enumerable: !1,
        configurable: !0
    }), r.prototype.add = function(t, e, o) {
        this.b.addBlock(t, e, o);
    }, r.prototype.addRect3D = function(t) {
        for (var e = t.x; e < t.x + t.length; e++) for (var o = t.y; o < t.y + t.width; o++) for (var r = t.z; r < t.z + t.height; r++) this.b.addBlock(e, o, r);
    }, r.prototype.remove = function(t, e, o) {
        this.b.removeBlock(t, e, o);
    }, r.prototype.contains = function(t, e, o) {
        return this.b.containsBlock(t, e, o);
    }, r.prototype.all = function() {
        return this.b.getBlocks();
    }, 
    /*
        combines all 'selected' blocks into a single 3D shape
        */
    r.prototype.getMesh = function() {
        for (var t = new Float32Array(3 * this.b.getBlocks().length * 3 * 3 * 8), e = 0, o = 0, r = this.b.getBlocks(); o < r.length; o++) for (var n = r[o], c = n[0], a = n[1], i = n[2], l = 0; l < 3; l++) for (var u = 0; u < 3; u++) for (var s = 0; s < 3; s++) {
            var p = a + u - 1, f = i + s - 1;
            t[e++] = c + l - 1, t[e++] = p, t[e++] = f;
        }
        return new h(t, new Uint32Array(3 * this.b.getBlocks().length * 3 * 3 * 12));
    }, 
    /*
        Calculates the geom.Rect3D which contains all selected blocks
         */
    r.prototype.getContainingRect = function(t) {
        var e = this.b.getBlocks();
        if (0 === e.length) return null;
        for (var o = Number.MAX_VALUE, r = Number.MAX_VALUE, n = Number.MAX_VALUE, c = Number.MIN_VALUE, a = Number.MIN_VALUE, i = Number.MIN_VALUE, l = 0, u = e; l < u.length; l++) {
            var s = u[l], p = s[0], f = s[1], s = s[2];
            p < o && (o = p), f < r && (r = f), s < n && (n = s), c < p && (c = p), 
            a < f && (a = f), i < s && (i = s);
        }
        var e = "number" == typeof t ? t : t.x || 0, h = "number" == typeof t ? t : t.y || 0, t = "number" == typeof t ? t : t.z || 0;
        return new b(o - e, r - h, n - t, c - o + 1 + 2 * e, a - r + 1 + 2 * h, i - n + 1 + 2 * t);
    }, r.prototype.expandToContainingRect = function() {
        this.addRect3D(this.getContainingRect(0));
    }, module.exports.BlockSelection = r;
})();
