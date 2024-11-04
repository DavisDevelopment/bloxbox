var Rect3D = /** @class */ (() => {
    function t(t, e, i, h, n, s) {
        this.x = t, this.y = e, this.z = i, this.length = h, this.width = n, this.height = s;
    }
    return t.prototype.volume = function() {
        return this.length * this.width * this.height;
    }, t.prototype.contains = function(t) {
        var e = t[0], i = t[1], t = t[2];
        return e >= this.x && e <= this.x + this.length && i >= this.y && i <= this.y + this.width && t >= this.z && t <= this.z + this.height;
    }, t.prototype.surfaceArea = function() {
        return 2 * (this.length * this.width + this.width * this.height + this.height * this.length);
    }, t;
})();

function ptdiff(t, e) {
    return {
        x: t.x - e.x,
        y: t.y - e.y,
        z: t.z - e.z
    };
}

function ptsum(t, e) {
    return {
        x: t.x + e.x,
        y: t.y + e.y,
        z: t.z + e.z
    };
}

module.exports.Rect3D = Rect3D, module.exports.ptdiff = ptdiff, module.exports.ptsum = ptsum;

var Mesh = /** @class */ (() => {
    function t(t, e) {
        this.vertices = t, this.indices = e;
    }
    return Object.defineProperty(t.prototype, "numVertices", {
        get: function() {
            return this.vertices.length / 3;
        },
        enumerable: !1,
        configurable: !0
    }), Object.defineProperty(t.prototype, "numIndices", {
        get: function() {
            return this.indices.length;
        },
        enumerable: !1,
        configurable: !0
    }), t;
})();

module.exports.Mesh = Mesh;
