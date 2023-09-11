import { Diagram, Anchor, polygon, line, curve, text, diagram_combine } from '../diagram.js';
import { Vector2, V2, linspace } from '../linear_algebra.js';
import { arrow2, textvar } from '../shapes.js'

/**
 * Options for axes
 * Since axes, plot, etc. are separate objects.
 * Axes options is used so that it's easier to have consistent
 * setting for multiple objects.
 */
export type axes_options = {
    xrange  : [number, number],
    yrange  : [number, number],
    bbox?   : [Vector2, Vector2],
    xticks? : number[],
    yticks? : number[],
    n?      : number,
}

export let default_axes_options : axes_options = {
    // bbox   : [V2(-100,-100), V2(100,100)],
    bbox   : undefined,
    xrange : [-2, 2],
    yrange : [-2, 2],
    xticks : undefined,
    yticks : undefined,
    n      : 100,
}

export function axes_transform(axes_options? : axes_options) : (v : Vector2) => Vector2 {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.bbox == undefined) {
        // get values from xrange and yrange
        let [xmin, xmax] = opt.xrange;
        let [ymin, ymax] = opt.yrange;
        opt.bbox = [V2(xmin,ymin), V2(xmax,ymax)];
    }

    let [lowerleft, upperright] = opt.bbox;
    let [xmin, xmax] = opt.xrange;
    let [ymin, ymax] = opt.yrange;

    return function(v : Vector2) : Vector2 {
        let x = lowerleft.x + (v.x-xmin)/(xmax-xmin)*(upperright.x-lowerleft.x);
        let y = lowerleft.y + (v.y-ymin)/(ymax-ymin)*(upperright.y-lowerleft.y);
        return V2(x,y);
    }
}
export let ax = axes_transform


/**
 * Draw xy axes without ticks
 * @param axes_options options for the axes
 * example: opt = {
 *    bbox   : [V2(-100,-100), V2(100,100)],
 * }
 * @returns a Diagram object
 */
export function axes_empty(axes_options? : axes_options) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.bbox == undefined) {
        // get values from xrange and yrange
        let [xmin, xmax] = opt.xrange;
        let [ymin, ymax] = opt.yrange;
        opt.bbox = [V2(xmin,ymin), V2(xmax,ymax)];
    }

    let [lowerleft, upperright] = opt.bbox;
    // get the intersection point
    let xorigin = lowerleft.x + (upperright.x-lowerleft.x)/(opt.xrange[1]-opt.xrange[0])*(0-opt.xrange[0]);
    let yorigin = lowerleft.y + (upperright.y-lowerleft.y)/(opt.yrange[1]-opt.yrange[0])*(0-opt.yrange[0]);

    let xaxis = arrow2(V2(lowerleft.x,yorigin), V2(upperright.x,yorigin), 0.05);
    let yaxis = arrow2(V2(xorigin,lowerleft.y), V2(xorigin,upperright.y), 0.05);
    return diagram_combine([xaxis, yaxis]).stroke('gray').fill('gray');
    // return xaxis;
}

/**
 * Create a single tick mark in the x axis
 * @param x x coordinate of the tick mark
 * @param height height of the tick mark
 */
export function xtickmark_empty(x : number, height : number = 0.1) : Diagram {
    return line(V2(x,height/2), V2(x,-height/2)).stroke('gray');
}

export function xtickmark(x : number, str : string, height : number = 0.1) : Diagram {
    let tick = xtickmark_empty(x, height);
    let label = textvar(str).move_origin_text(Anchor.TopCenter).translate(tick.get_anchor(Anchor.BottomCenter)).fill('gray');
    return diagram_combine([tick, label]);
}

export function ytickmark_empty(y : number, height : number = 0.1) : Diagram {
    return line(V2(height/2,y), V2(-height/2,y)).stroke('gray');
}
export function ytickmark(y : number, str : string, height : number = 0.1) : Diagram {
    let tick = ytickmark_empty(y, height);
    let label = textvar(str).move_origin_text(Anchor.CenterRight).translate(tick.get_anchor(Anchor.CenterLeft)).fill('gray');
    return diagram_combine([tick, label]);
}

// ======= BEGIN utility to calculate ticks

function get_tick_interval(min : number, max : number) : number {
    let range = max-min;
    let range_order = Math.floor(Math.log10(range));
    let interval_to_try = [0.1, 0.15, 0.2, 0.5, 1.0].map(x => x*Math.pow(10,range_order));
    let tick_counts = interval_to_try.map(x => Math.floor(range/x));
    // choose the interval so that the number of ticks is between the biggest one but less than 10
    for (let i = 0; i < tick_counts.length; i++) {
        if (tick_counts[i] <= 10) {
            return interval_to_try[i];
        }
    }
    return interval_to_try.slice(-1)[0];
}

function get_tick_numbers_range(min : number, max : number) : number[] {
    let interval = get_tick_interval(min, max);
    // round min and max to the nearest interval
    let new_min = Math.ceil(min/interval)*interval;
    let new_max = Math.floor(max/interval)*interval;
    let new_count = Math.floor((new_max-new_min)/interval);
    return linspace(new_min, new_max, new_count+1);
}
function get_tick_numbers_aroundzero(neg : number, pos : number, nozero : boolean = true) : number[] {
    if (neg > 0) throw new Error('neg must be negative');
    if (pos < 0) throw new Error('pos must be positive');
    let magnitude = Math.max(-neg, pos);
    let interval = get_tick_interval(-magnitude, magnitude);

    // round min and max to the nearest interval
    let new_min = Math.ceil(neg/interval)*interval;
    let new_max = Math.floor(pos/interval)*interval;
    let new_count = Math.floor((new_max-new_min)/interval);
    if (nozero){
        return linspace(new_min, new_max, new_count+1).filter(x => x != 0);
    }else{
        return linspace(new_min, new_max, new_count+1);
    }
}
function get_tick_numbers(min : number, max : number) : number[] {
    if (min < 0 && max > 0) {
        return get_tick_numbers_aroundzero(min, max);
    } else {
        return get_tick_numbers_range(min, max);
    }
}

// ======= END utility to calculate ticks

export function xticks(axes_options : axes_options) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.xticks == undefined) {
        opt.xticks = get_tick_numbers(opt.xrange[0], opt.xrange[1]);
    }

    // remove ticks outside of the range
    // opt.xticks = opt.xticks.filter(x => x >= opt.xrange[0] && x <= opt.xrange[1]);
    opt.xticks = opt.xticks.filter(x => x > opt.xrange[0] && x < opt.xrange[1]);

    let xticks_diagrams = opt.xticks.map(x => xtickmark(x, x.toString()));
    return diagram_combine(xticks_diagrams).transform(axes_transform(opt));
}
export function yticks(axes_options : axes_options) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    if (opt.yticks == undefined) {
        opt.yticks = get_tick_numbers(opt.yrange[0], opt.yrange[1]);
    }

    // remove ticks outside of the range
    // opt.yticks = opt.yticks.filter(y => y >= opt.yrange[0] && y <= opt.yrange[1]);
    opt.yticks = opt.yticks.filter(y => y > opt.yrange[0] && y < opt.yrange[1]);

    let yticks_diagrams = opt.yticks.map(y => ytickmark(y, y.toString()));
    return diagram_combine(yticks_diagrams).transform(axes_transform(opt));
}


// TODO : 
// export function axes(axes_options? : axes_options) : Diagram {
//     let opt = {...default_axes_options, ...axes_options}; // use default if not defined
// }

/**
 * Plot a curve given a list of points
 * @param data list of points
 * @param axes_options options for the axes
 * example: opt = {
 *  bbox   : [V2(-100,-100), V2(100,100)],
 *  xrange : [-2, 2],
 *  yrange : [-2, 2],
 * }
 */
export function plotv(data : Vector2[], axes_options? : axes_options) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    let [xmin, xmax] = opt.xrange;
    let [ymin, ymax] = opt.yrange;

    // split data into segments that are within the range
    let segments : Vector2[][] = [];
    let current_segment : Vector2[] = [];
    for (let i=0; i < data.length; i++) {
        let p = data[i];
        let is_inside = (p.x >= xmin && p.x <= xmax && p.y >= ymin && p.y <= ymax);
        if (!is_inside) {
            if (current_segment.length > 1) segments.push(current_segment);
            current_segment = [];
        } else {
            current_segment.push(p);
        }
    }
    if (current_segment.length > 1) segments.push(current_segment);

    let d : Diagram;
    // create separate paths for each segment
    let path_diagrams = segments.map(segment => curve(segment));
    if (path_diagrams.length == 1){
        d = path_diagrams[0];
    } else {
        d = diagram_combine(path_diagrams).stroke('black').fill('none');
    }

    return d.transform(axes_transform(opt));
}

/**
 * Plot a curve given xdata and ydata
 * @param xdata x coordinates of the data
 * @param ydata y coordinates of the data
 * @param axes_options options for the axes
 * example: opt = {
 *   bbox   : [V2(-100,-100), V2(100,100)],
 *   xrange : [-2, 2],
 *   yrange : [-2, 2],
 * }
 */
export function plot(xdata : number[], ydata : number[], axes_options? : axes_options) : Diagram {
    if (xdata.length != ydata.length) throw new Error('xdata and ydata must have the same length');
    let vdata = xdata.map((x,i) => V2(x,ydata[i]));
    return plotv(vdata, axes_options);
}

/**
 * Plot a function
 * @param f function to plot
 * @param n number of points to plot
 * @param axes_options options for the axes
 */
export function plotf(f : (x:number)=>number, axes_options? : axes_options) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined
    let xdata = linspace(...opt.xrange, opt.n);
    let vdata = xdata.map(x => V2(x,f(x)));
    return plotv(vdata, axes_options);
}

export function under_curvef(f : (x:number)=>number, x_start : number, x_end : number,  axes_options? : axes_options ) : Diagram {
    let opt = {...default_axes_options, ...axes_options}; // use default if not defined

    let new_opt = {...opt}; // copy opt
    new_opt.xrange = [x_start, x_end];
    new_opt.bbox = undefined;

    // draw plot from x_start to x_end
    let fplot = plotf(f, new_opt);
    let area_under = fplot.add_points([V2(x_end,0), V2(x_start,0)]).to_polygon();
    return area_under.transform(axes_transform(opt));
}