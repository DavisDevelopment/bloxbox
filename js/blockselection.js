var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
(function () {
    // const geom = require('./geometry');
    var _a = require('./geometry'), Rect3D = _a.Rect3D, Mesh = _a.Mesh;
    /*
       the RegionBuffer efficiently stores a selection of voxel coordinates which can
       be dynamically edited via addBlock, removeBlock, containsBlock, etc. methods
    */
    var RegionBuffer = /** @class */ (function () {
        function RegionBuffer() {
            this.blocks = new Set();
        }
        /**
         * Add a block to the selection
         * @param x
         * @param y
         * @param z
         */
        RegionBuffer.prototype.addBlock = function (x, y, z) {
            this.blocks.add("".concat(x, ",").concat(y, ",").concat(z));
        };
        /**
         * Remove a block from the selection
         * @param x
         * @param y
         * @param z
         */
        RegionBuffer.prototype.removeBlock = function (x, y, z) {
            this.blocks.delete("".concat(x, ",").concat(y, ",").concat(z));
        };
        /**
         * Check if a block is in the selection
         * @param x
         * @param y
         * @param z
         */
        RegionBuffer.prototype.containsBlock = function (x, y, z) {
            return this.blocks.has("".concat(x, ",").concat(y, ",").concat(z));
        };
        /**
         * Get all blocks in the selection as an array of [x, y, z]
         */
        RegionBuffer.prototype.getBlocks = function () {
            return Array.from(this.blocks).map(function (s) { return s.split(',').map(Number); });
        };
        RegionBuffer.prototype[Symbol.iterator] = function () {
            var _i, _a, coords;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = this.getBlocks();
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        coords = _a[_i];
                        return [4 /*yield*/, coords];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        };
        return RegionBuffer;
    }());
    var BlockSelection = /** @class */ (function () {
        function BlockSelection() {
            this.b = new RegionBuffer();
        }
        Object.defineProperty(BlockSelection.prototype, "length", {
            get: function () {
                return this.b.blocks.size;
            },
            enumerable: false,
            configurable: true
        });
        BlockSelection.prototype.add = function (x, y, z) {
            this.b.addBlock(x, y, z);
        };
        BlockSelection.prototype.addRect3D = function (rect) {
            for (var x = rect.x; x < rect.x + rect.length; x++) {
                for (var y = rect.y; y < rect.y + rect.width; y++) {
                    for (var z = rect.z; z < rect.z + rect.height; z++) {
                        this.b.addBlock(x, y, z);
                    }
                }
            }
        };
        BlockSelection.prototype.remove = function (x, y, z) {
            this.b.removeBlock(x, y, z);
        };
        BlockSelection.prototype.contains = function (x, y, z) {
            return this.b.containsBlock(x, y, z);
        };
        BlockSelection.prototype.all = function () {
            return this.b.getBlocks();
        };
        /*
         computes the internal 3D volume of the selected blocks
        */
        BlockSelection.prototype.getVolume = function () {
            //TODO
        };
        /*
        combines all 'selected' blocks into a single 3D shape
        */
        BlockSelection.prototype.getMesh = function () {
            var vertices = new Float32Array(this.b.getBlocks().length * 3 * 3 * 3 * 8);
            var index = 0;
            for (var _i = 0, _a = this.b.getBlocks(); _i < _a.length; _i++) {
                var block = _a[_i];
                var x = block[0], y = block[1], z = block[2];
                for (var dx = 0; dx < 3; dx++) {
                    for (var dy = 0; dy < 3; dy++) {
                        for (var dz = 0; dz < 3; dz++) {
                            var x2 = x + dx - 1;
                            var y2 = y + dy - 1;
                            var z2 = z + dz - 1;
                            vertices[index++] = x2;
                            vertices[index++] = y2;
                            vertices[index++] = z2;
                        }
                    }
                }
            }
            return new Mesh(vertices, new Uint32Array(this.b.getBlocks().length * 3 * 3 * 3 * 12));
        };
        /*
        Calculates the geom.Rect3D which contains all selected blocks
         */
        BlockSelection.prototype.getContainingRect = function (margin) {
            var blocks = this.b.getBlocks();
            if (blocks.length === 0) {
                return null;
            }
            var minX = Number.MAX_VALUE, minY = Number.MAX_VALUE, minZ = Number.MAX_VALUE;
            var maxX = Number.MIN_VALUE, maxY = Number.MIN_VALUE, maxZ = Number.MIN_VALUE;
            for (var _i = 0, blocks_1 = blocks; _i < blocks_1.length; _i++) {
                var _a = blocks_1[_i], x = _a[0], y = _a[1], z = _a[2];
                if (x < minX)
                    minX = x;
                if (y < minY)
                    minY = y;
                if (z < minZ)
                    minZ = z;
                if (x > maxX)
                    maxX = x;
                if (y > maxY)
                    maxY = y;
                if (z > maxZ)
                    maxZ = z;
            }
            var marginX = typeof margin === 'number' ? margin : margin.x || 0;
            var marginY = typeof margin === 'number' ? margin : margin.y || 0;
            var marginZ = typeof margin === 'number' ? margin : margin.z || 0;
            return new Rect3D(minX - marginX, minY - marginY, minZ - marginZ, maxX - minX + 1 + 2 * marginX, maxY - minY + 1 + 2 * marginY, maxZ - minZ + 1 + 2 * marginZ);
        };
        BlockSelection.prototype.expandToContainingRect = function () {
            this.addRect3D(this.getContainingRect(0));
        };
        return BlockSelection;
    }());
    module.exports.BlockSelection = BlockSelection;
})();
