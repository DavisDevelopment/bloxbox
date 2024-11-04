function main() {
    require("numjs"), require("jquery");
    var e = require("./world"), r = e.World, t = e.Material, e = require("./render2d").TopDownRenderer;
    // require('./render3dcube');
    // return ;
    let h = new r({
        size: [ 500, 500, 128 ]
    });
    /**
    * Generates a noisy altitude map for a flat region of a voxel world.
    *
    * @param {number} [noiseScale=0.1] - Controls the scale of the terrain features
    * @param {number} [heightFactor=25] - Maximum height variation for the terrain
    *
    * @returns {number[][]} - A 2D array of altitude values for each block in the region
    */
    // apply the 'noisy altitude' to the map
    var o = ((t, o, e) => {
        let r = require("simplex-noise"), a = r.createNoise2D();
        // Initialize noise generator
        // Generate terrain for a flat region
        var l, i, n = h.data.width, d = h.data.height, f /*: number[][]*/ = []; // Width of the region
        // Stores height map of the terrain
        for (let r = 0; r < n; r++) {
            f[r] = [];
            for (let e = 0; e < d; e++) f[r][e] = (l = r, i = e, l = a(l * t, i * t), 
            Math.floor(.5 * h.getDepth()) + Math.floor((l + 1) / 2 * o));
        }
        // Apply smoothing to the terrain
        if (0 < e) 
        // This algorithm takes each block in the terrain and replaces its height with the average of its height and the heights of its four neighbors (N, S, E, W)
        // This is done in a way that is more efficient than using nested for-loops with (x, y) coordinates
        // Instead, we use a single loop and calculate the new height for each block as the average of the heights of the blocks in its neighborhood
        for (let t = 0; t < n; t++) for (let r = 0; r < d; r++) {
            // Calculate the average height of the block and its neighbors
            // Start with the height of the block itself
            let e = f[t][r];
            // Add the heights of the neighbors to the sum
            // We only add the heights of neighbors that exist (i.e. those that are not out of bounds)
            0 < t && (e += f[t - 1][r]), t < n - 1 && (e += f[t + 1][r]), 0 < r && (e += f[t][r - 1]), 
            r < d - 1 && (e += f[t][r + 1]), 
            // Calculate the average height by dividing the sum by the number of neighbors (plus one for the block itself)
            // Use Math.floor to round down to the nearest integer
            f[t][r] = Math.floor(e / (1 + (0 < t ? 1 : 0) + (t < n - 1 ? 1 : 0) + (0 < r ? 1 : 0) + (r < d - 1 ? 1 : 0)));
        }
        // You can now use `terrain[x][y]` to set the height of voxels in your world.
        return console.log(f), f;
    })(.32, 25, 1);
    for (let r = 0; r < h.data.width; r++) for (let e = 0; e < h.data.height; e++) {
        var a = o[r][e];
        h.data.setBlockType(r, e, a, t.GRASS);
    }
    // instantiate the renderer, top-down by default
    r = new e(h);
    // expose the renderer so that it's accessible from the JavaScript console
    // begin the actual render-loop
    (window.renderer = r).render_loop();
}

main();
