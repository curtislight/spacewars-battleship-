/**
 * Battleship.js is a module to model and play a Battleship style game.
 * https://en.wikipedia.org/wiki/Battleship_(game)
 * It exposes pure functions that act on plain game-state objects.
 * @namespace Battleship
 * @author Curtis Light
 */
const Battleship = Object.create(null);

/**
 * The size (width and height) of a standard board: 10 by 10.
 * @memberof Battleship
 * @constant {number}
 */
Battleship.GRID_SIZE = 10;

/**
 * The fleet every player must place: the five ships and their lengths.
 * Themed after Star Wars craft, sized by the classic Battleship rules.
 * @memberof Battleship
 * @constant {Object[]}
 */
Battleship.ships = Object.freeze([
    Object.freeze({"name": "Death Star", "size": 5}),
    Object.freeze({"name": "Star Destroyer", "size": 4}),
    Object.freeze({"name": "Millennium Falcon", "size": 3}),
    Object.freeze({"name": "X-wing", "size": 3}),
    Object.freeze({"name": "TIE Fighter", "size": 2})
]);

/**
 * A coordinate on the board, written as a [row, column] pair.
 * Both are counted from 0, so the top-left cell is [0, 0].
 * @memberof Battleship
 * @typedef {number[]} Coordinate
 */

/**
 * A ship that has been placed on a board.
 * @memberof Battleship
 * @typedef {Object} PlacedShip
 * @property {string} name The ship's name, e.g. "X-wing".
 * @property {number} size How many cells long the ship is.
 * @property {Battleship.Coordinate[]} cells The cells the ship occupies.
 */

/**
 * A single player's board: their fleet, and the shots fired at them.
 * @memberof Battleship
 * @typedef {Object} Board
 * @property {Battleship.PlacedShip[]} fleet The ships on this board.
 * @property {Battleship.Coordinate[]} shots Cells the opponent has fired at.
 */

/**
 * Create a new empty board, with no ships placed and no shots fired.
 * @memberof Battleship
 * @function
 * @returns {Battleship.Board} A fresh, empty board.
 */
Battleship.empty_board = function () {
    return {"fleet": [], "shots": []};
};

/**
 * A small helper: produce the list of numbers 0, 1, ..., n - 1.
 * @function
 * @param {number} n How many numbers to produce.
 * @returns {number[]} The list [0, 1, ..., n - 1].
 */
const range = function (n) {
    return Array.from({"length": n}, function (ignore, index) {
        return index;
    });
};

/**
 * Work out which cells a ship would occupy if its first cell were at
 * [row, col] and it extended in the given direction.
 * This does not check whether those cells are on the board or free;
 * it only computes the coordinates.
 * @memberof Battleship
 * @function
 * @param {number} row The row of the ship's first cell.
 * @param {number} col The column of the ship's first cell.
 * @param {number} size How many cells long the ship is.
 * @param {string} orientation Either "horizontal" or "vertical".
 * @returns {Battleship.Coordinate[]} The coordinates the ship would occupy.
 */
Battleship.ship_cells = function (row, col, size, orientation) {
    return range(size).map(function (offset) {
        if (orientation === "horizontal") {
            return [row, col + offset];
        }
        return [row + offset, col];
    });
};

export default Object.freeze(Battleship);
