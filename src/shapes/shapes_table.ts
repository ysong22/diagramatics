import { Diagram, diagram_combine } from '../diagram.js';
import { rectangle_corner } from '../shapes.js';
import { V2, Vector2 } from '../vector.js';
import { transpose } from '../utils.js';

enum TableOrientation {
    ROWS    = 'rows',
    COLUMNS = 'columns',
}

/**
 * Create a table with diagrams inside
 * @param diagrams 2D array of diagrams
 * @param orientation orientation of the table (default: 'rows')
 * can be 'rows' or 'columns'
 * @param min_rowsize minimum size of each row
 * @param min_colsize minimum size of each column
 * @returns a diagram of the table with the diagrams inside
 */
export function table(diagrams : Diagram[][], padding : number = 0, orientation : TableOrientation = TableOrientation.ROWS, 
    min_rowsize : number = 0, min_colsize : number = 0) : Diagram {
    // if the orientation is columns, then we just transpose the rows and columns
    let diagram_rows = orientation == TableOrientation.ROWS ? diagrams : transpose(diagrams);

    function f_size(d? : Diagram) : [number, number] {
        if (d == undefined) return [min_colsize, min_rowsize];
        let [bottomleft, topright] = d.bounding_box();
        let width  = topright.x - bottomleft.x + 2*padding;
        let height = topright.y - bottomleft.y + 2*padding;
        return [width, height];
    }

    let row_count = diagram_rows.length;
    let col_count = Math.max(...diagram_rows.map(row => row.length));
    let rowsizes : number[] = Array(row_count).fill(min_rowsize);
    let colsizes : number[] = Array(col_count).fill(min_colsize);
    // find the maximum size of each row and column
    for (let r = 0; r < row_count; r++) {
        for (let c = 0; c < col_count; c++) {
            let [w, h] = f_size(diagram_rows[r][c]);
            rowsizes[r] = Math.max(rowsizes[r], h);
            colsizes[c] = Math.max(colsizes[c], w);
        }
    }

    return fixed_size(diagrams, rowsizes, colsizes, orientation);
}

/**
 * Create a table with fixed size
 * @param diagrams 2D array of diagrams
 * @param rowsizes size of each row
 * if `rowsizes.length` is less than `diagrams.length`, the last value will be repeated
 * e.g. [1,2,3] -> [1,2,3,3,3]
 * @param colsizes size of each column
 * if `colsizes.length` is less than `diagrams[0].length`, the last value will be repeated
 * @param orientation orientation of the table (default: 'rows')
 * can be 'rows' or 'columns'
 * @returns a diagram of the table with the diagrams inside
 */
export function fixed_size(diagrams : Diagram[][], rowsizes : number[], colsizes : number[]
    , orientation : TableOrientation = TableOrientation.ROWS ) : Diagram 
{
    // if the orientation is columns, then we just transpose the rows and columns
    let diagram_rows = orientation == TableOrientation.ROWS ? diagrams : transpose(diagrams);
    let row_count = diagram_rows.length;
    let col_count = Math.max(...diagram_rows.map(row => row.length));

    let table = empty_fixed_size(row_count, col_count, rowsizes, colsizes);
    let points = get_points(table);

    let diagram_grid : Diagram[] = [];
    for (let r = 0; r < row_count; r++) {
        for (let c = 0; c < col_count; c++) {
            let d = diagram_rows[r][c];
            if (d == undefined) continue;
            d = d.position(points[r][c]);
            diagram_grid.push(d);
        }
    }
    let diagram_grid_combined = diagram_combine(...diagram_grid);
    return diagram_combine(table, diagram_grid_combined).append_tag('contain_table');
}

/**
 * Create an empty table with fixed size
 * @param row_count number of rows
 * @param col_count number of columns
 * @param rowsizes size of each row
 * if `rowsizes.length` is less than `row_count`, the last value will be repeated
 * e.g. [1,2,3] -> [1,2,3,3,3]
 * @param colsizes size of each column
 * if `colsizes.length` is less than `col_count`, the last value will be repeated
 */
export function empty_fixed_size(row_count : number, col_count : number, 
    rowsizes : number[], colsizes : number[]) : Diagram 
{
    while (rowsizes.length < row_count) { rowsizes.push(rowsizes[rowsizes.length-1]); }
    while (colsizes.length < col_count) { colsizes.push(colsizes[colsizes.length-1]); }

    let rows : Diagram[] = [];
    let y_top = 0;
    for (let r = 0; r < row_count; r++) {
        let y_bot   = y_top + rowsizes[r];
        let x_left = 0;
        let cols : Diagram[] = [];
        for (let c = 0; c < col_count; c++) {
            let x_right = x_left + colsizes[c];
            let x_mid = (x_left + x_right) / 2;
            let y_mid = (y_top + y_bot) / 2;

            //TODO: draw line instead of recangles
            let rect = rectangle_corner(V2(x_left, y_bot), V2(x_right, y_top)).move_origin(V2(x_mid, y_mid));
            cols.push(rect);
            x_left = x_right;
        }
        rows.push(diagram_combine(...cols));
        y_top = y_bot;
    }

    return diagram_combine(...rows).append_tag('table');
}

/**
 * Get the midpoints of the cells from a table diagram
 * @param table_diagram a table diagram
 * @returns a 2D array of points
 * the first index is the row, the second index is the column
 */
export function get_points(table_diagram : Diagram) : Vector2[][] {
    let table_diagram_ = table_diagram;
    if (table_diagram.tags.includes('contain_table')) {
        for (let d of table_diagram.children){
            if (d.tags.includes('table')) {
                table_diagram_ = d;
                break;
            }
        }
    }
    if (!table_diagram_.tags.includes('table')) return [];

    let rows : Vector2[][] = [];
    for (let row of table_diagram_.children){
        let cols : Vector2[] = [];
        for (let cell of row.children){
            cols.push(cell.origin);
        }
        rows.push(cols);
    }
    return rows;
}
