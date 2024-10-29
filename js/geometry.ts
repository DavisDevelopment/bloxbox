
class Rect3D {
    x:number;
    y:number;
    z:number;
    length:number;
    width:number;
    height:number;

    constructor(x, y, z, length, width, height) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.length = length;
        this.width = width;
        this.height = height;
    }

    volume() {
        return this.length * this.width * this.height;
    }

    contains(point) {
        const [px, py, pz] = point;
        return px >= this.x && px <= this.x + this.length &&
               py >= this.y && py <= this.y + this.width &&
               pz >= this.z && pz <= this.z + this.height;
    }

    surfaceArea() {
        return 2 * (this.length * this.width + this.width * this.height + this.height * this.length);
    }


}


module.exports.Rect3D = Rect3D;


type Pt3D = {x:number, y:number, z:number};

function ptdiff(a: Pt3D, b: Pt3D): Pt3D {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z
    };
}

function ptsum(a: Pt3D, b: Pt3D): Pt3D {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    };
}

module.exports.ptdiff = ptdiff;
module.exports.ptsum = ptsum;