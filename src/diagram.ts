import { Vector2 } from './linear_algebra.js';

function assert(condition : boolean, message : string) : void {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

export enum DiagramType {
    Polygon = 'polygon',
    Curve   = 'curve',
    Diagram = 'diagram',
}

export enum Anchor {
    TopLeft      = 'top-left',
    TopCenter    = 'top-center',
    TopRight     = 'top-right',
    CenterLeft   = 'center-left',
    CenterCenter = 'center-center',
    CenterRight  = 'center-right',
    BottomLeft   = 'bottom-left',
    BottomCenter = 'bottom-center',
    BottomRight  = 'bottom-right',
}

/**
 * Make sure that every function return a new Diagram
 * Diagram is immutable to the user
 */

/**
* Diagram Class 
*
* Diagram is a tree structure
* Diagram can be a polygon, a curve, or a diagram
* Polygon is a closed path
* Curve is an open path
* Diagram is a tree of Diagrams
*/
export class Diagram {
    type : DiagramType;
    children : {[key : string]: Diagram} = {};
    paths : {[key : string]: Path} = {};
    /** position of the origin of the diagram */
    origin       : Vector2 = new Vector2(0, 0);
    color_stroke : string | undefined = undefined ;
    color_fill   : string | undefined = undefined ;

    constructor(type_ : DiagramType){
        this.type = type_;
    }
    add_childs(childs : Diagram[], names : string[]){
        // TODO : check for name collision
        for (let i in childs) { this.children[names[i]] = childs[i]; }
    }
    add_paths(paths : Path[], names : string[]){
        if (this.type == DiagramType.Diagram) {
            throw new Error("Diagram cannot have paths");
        }
        // TODO : check for name collision
        for (let i in paths) { this.paths[names[i]] = paths[i]; }
    }

    /**
     * Copy the diagram
     */
    public copy() : Diagram {
        // do deepcopy with JSON
        let newd : Diagram = JSON.parse(JSON.stringify(this));
        // turn newd into Diagram
        Object.setPrototypeOf(newd, Diagram.prototype);
        // convert position and origin_offset to Vector2
        newd.origin = Object.setPrototypeOf(newd.origin, Vector2.prototype);
        // make sure all of the children are Diagram
        for (let c in newd.children) {
            Object.setPrototypeOf(newd.children[c], Diagram.prototype)
            newd.children[c] = newd.children[c].copy();
        }
        // make sure all of the paths are Path
        for (let p in newd.paths) {
            Object.setPrototypeOf(newd.paths[p], Path.prototype)
            newd.paths[p] = newd.paths[p].copy();
        }
        return newd;
    }

    /**
     * Set the fill color of the diagram
     * @param color color of the fill
     */
    public fill(color : string) : Diagram { 
        let newd : Diagram = this.copy();
        switch (newd.type) {
            case DiagramType.Polygon:
                newd.color_fill = color;
                break;
            case DiagramType.Curve:
                // curve have no fill
                break;
            default:
                // recursively set fill for all children
                for (let c in newd.children) {
                    newd.children[c].fill(color);
                }
        }
        return newd;
    }

    /**
     * Set the stroke color of the diagram
     * @param color color of the stroke
     */
    public stroke(color : string) : Diagram {
        let newd : Diagram = this.copy();
        switch (newd.type) {
            case DiagramType.Polygon:
                newd.color_stroke = color;
                break;
            case DiagramType.Curve:
                newd.color_stroke = color;
                break;
            default:
                // recursively set stroke for all children
                for (let c in newd.children) {
                    newd.children[c].stroke(color);
                }
        }
        return newd;
    }

    /**
     * Get the bounding box of the diagram
     * @returns [min, max] where min is the top left corner and max is the bottom right corner
     */
    public bounding_box() : [Vector2, Vector2] {
        let minx = Infinity, miny = Infinity;
        let maxx = -Infinity, maxy = -Infinity;
        switch (this.type) {
            case DiagramType.Polygon:
                for (let p in this.paths) {
                    let path = this.paths[p];
                    for (let point of path.points) {
                        minx = Math.min(minx, point.x);
                        miny = Math.min(miny, point.y);
                        maxx = Math.max(maxx, point.x);
                        maxy = Math.max(maxy, point.y);
                    }
                }
                return [new Vector2(minx, miny), new Vector2(maxx, maxy)];
            case DiagramType.Curve:
                for (let p in this.paths) {
                    let path = this.paths[p];
                    for (let point of path.points) {
                        minx = Math.min(minx, point.x);
                        miny = Math.min(miny, point.y);
                        maxx = Math.max(maxx, point.x);
                        maxy = Math.max(maxy, point.y);
                    }
                }
                return [new Vector2(minx, miny), new Vector2(maxx, maxy)];
            case DiagramType.Diagram:
                for (let c in this.children) {
                    let child = this.children[c];
                    let [min, max] = child.bounding_box();
                    minx = Math.min(minx, min.x);
                    miny = Math.min(miny, min.y);
                    maxx = Math.max(maxx, max.x);
                    maxy = Math.max(maxy, max.y);
                }
                return [new Vector2(minx, miny), new Vector2(maxx, maxy)];
            default:
                throw new Error("Unreachable");
        }
    }

    /**
     * Translate the diagram by a vector
     * @param v vector to translate
     */
    public translate(v : Vector2) : Diagram {
        let newd : Diagram = this.copy();
        newd.origin = newd.origin.add(v);
        // recursively translate all children
        for (let c in newd.children) {
            newd.children[c] = newd.children[c].translate(v);
        }
        // recursively translate all paths
        for (let p in newd.paths) {
            newd.paths[p] = newd.paths[p].translate(v);
        }
        return newd;
    }

    /**
     * move the diagram to a position
     * @param v position to move to
     */
    public position(v : Vector2) : Diagram {
        let dv = v.sub(this.origin)
        let newd = this.translate(dv);
        return newd;
    }

    /**
     * Rotate the diagram by an angle around a pivot
     * @param angle angle to rotate
     * @param pivot pivot point, if left undefined, rotate around the origin
     */
    public rotate(angle : number, pivot : Vector2 | undefined = undefined) : Diagram {
        let newd : Diagram = this.copy();
      
        if (pivot == undefined) { pivot = newd.origin; }

        // rotate all children
        for (let c in newd.children) {
            newd.children[c] = newd.children[c].rotate(angle, pivot);
        }
        // rotate all paths
        for (let p in newd.paths) { 
            newd.paths[p] = newd.paths[p].rotate(angle, pivot);
        }
        return newd;
    }

    public get_anchor(anchor : Anchor) : Vector2 {
        let [min, max] = this.bounding_box();
        let minx = min.x, miny = min.y;
        let maxx = max.x, maxy = max.y;
        let midx = (minx + maxx) / 2;
        let midy = (miny + maxy) / 2;
        switch (anchor) {
            case Anchor.TopLeft      : return new Vector2(minx, miny);
            case Anchor.TopCenter    : return new Vector2(midx, miny);
            case Anchor.TopRight     : return new Vector2(maxx, miny);
            case Anchor.CenterLeft   : return new Vector2(minx, midy);
            case Anchor.CenterCenter : return new Vector2(midx, midy);
            case Anchor.CenterRight  : return new Vector2(maxx, midy);
            case Anchor.BottomLeft   : return new Vector2(minx, maxy);
            case Anchor.BottomCenter : return new Vector2(midx, maxy);
            case Anchor.BottomRight  : return new Vector2(maxx, maxy);
            default: throw new Error("Unknown anchor " + anchor);
        }
    }
        
        
}

export class Path {
    // for now just do linear path
    constructor(public points : Vector2[]) { }

    /**
     * Get the point on the path at t 
     * Path can be described parametrically in the form of (x(t), y(t))
     * Path start at t=0 and ends at t=1
     * @param t parameter
     * @returns the position of the point
    */
    get_parametric_point(t : number) : Vector2 {
        if (this.points.length > 2) { throw Error("Get Parametric Point For n>2 is Not Implemented yet"); }
        // for now assume Path is linear
        let end   = this.points.slice(-1)[0];
        let start = this.points[0];
        let dir : Vector2 = end.sub(start);
        return start.add(dir.scale(t));
    }

    copy() : Path {
        // let start = new Vector2(this.start.x, this.start.y);
        // let end = new Vector2(this.end.x, this.end.y);
        let newpoints = this.points.map(p => new Vector2(p.x, p.y));
        return new Path(newpoints);
    }

    /**
     * Translate the path by a vector
     * @param v vector to translate
     */
    public translate(v : Vector2) : Path {
        let newp : Path = this.copy();
        // translate all the points
        newp.points = newp.points.map(p => p.add(v));
        return newp;
    }

    /**
     * Rotate the path by an angle around a pivot
     * @param angle angle to rotate
     * @param pivot pivot point
     */
    public rotate(angle : number, pivot : Vector2) : Path {
        let newp : Path = this.copy();
        // rotate all the points
        newp.points = newp.points.map(p => p.sub(pivot).rotate(angle).add(pivot));
        return newp;
    }
}

/**
 * Create a polygon from a list of points
 * @param points list of points
 * @param names list of names for each path
 * @returns a polygon diagram
 */
export function polygon(points: Vector2[], names : string[] = []) : Diagram {
    assert(points.length >= 3, "Polygon must have at least 3 points");
    let paths : Path[] = [];

    for (let i = 0; i < points.length - 1; i++) {
        paths.push(new Path([points[i], points[i+1]]));
    }

    // create names ['path1', 'path2', ...]
    let path_names : string[] = [];
    for (let i in paths) { path_names.push('path' + i.toString()); }

    // put custom names
    let imax = Math.min(path_names.length, names.length);
    for (let i = 0; i < imax; i++) { path_names[i] = names[i] as string; }

    // create diagram
    let polygon = new Diagram(DiagramType.Polygon);
    polygon.add_paths(paths, path_names);
    return polygon;
}
