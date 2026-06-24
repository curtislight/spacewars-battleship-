/**
 * Battleship.js is a module to model and play a Battleship style game.
 * https://en.wikipedia.org/wiki/Battleship_(game)
 * It exposes pure functions that act on plain game-state objects.
 * @namespace Battleship
 * @author Curtis
 * @version 2025/26
 */
const Battleship = Object.create(null);

/**
 * The size (width and height) of a standard board: 10 by 10.
 * @memberof Battleship
 * @constant {number}
 */
Battleship.GRID_SIZE = 10;

/**
 * The four rotations of the T-shaped X-wing, as cell offsets from an origin.
 * Each rotation is an array of [row, col] offsets.
 * @memberof Battleship
 * @constant {number[][][]}
 */
Battleship.XWING_ROTATIONS = Object.freeze([
    // T pointing right: stem goes down, bar goes right
    Object.freeze([[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]]),
    // T pointing left: stem goes down, bar goes left
    Object.freeze([[0, 0], [1, 0], [2, 0], [1, -1], [1, -2]]),
    // T pointing down: stem goes right, bar goes down
    Object.freeze([[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]]),
    // T pointing up: stem goes right, bar goes up
    Object.freeze([[2, 0], [2, 1], [2, 2], [1, 1], [0, 1]])
]);

/**
 * The fleet every player must place.
 * @memberof Battleship
 * @constant {Object[]}
 */
Battleship.ships = Object.freeze([
    Object.freeze({"name": "TIE Fighter", "size": 2, "shape": "line"}),
    Object.freeze({"name": "Jedi Starfighter", "size": 2, "shape": "line"}),
    Object.freeze({"name": "Slave I", "size": 3, "shape": "line"}),
    Object.freeze({"name": "X-wing", "size": 5, "shape": "xwing"}),
    Object.freeze({"name": "Millennium Falcon", "size": 4, "shape": "line"})
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
 * @property {string} name The ship's name.
 * @property {number} size How many cells the ship occupies.
 * @property {string} shape Either "line" or "xwing".
 * @property {Battleship.Coordinate[]} cells The cells the ship occupies.
 */

/**
 * A single player's board.
 * @memberof Battleship
 * @typedef {Object} Board
 * @property {Battleship.PlacedShip[]} fleet The ships on this board.
 * @property {Battleship.Coordinate[]} shots Cells the opponent has fired at.
 */

/**
 * Create a new empty board.
 * @memberof Battleship
 * @function
 * @returns {Battleship.Board} A fresh empty board.
 */
Battleship.empty_board = function () {
    return {"fleet": [], "shots": []};
};

/**
 * Produce the list [0, 1, ..., n - 1].
 * @function
 * @param {number} n How many numbers to produce.
 * @returns {number[]} The range.
 */
const range = function (n) {
    return Array.from({"length": n}, function (ignore, i) {
        return i;
    });
};

/**
 * Work out which cells a straight-line ship would occupy.
 * @memberof Battleship
 * @function
 * @param {number} row The row of the first cell.
 * @param {number} col The column of the first cell.
 * @param {number} size How many cells long.
 * @param {string} orientation Either "horizontal" or "vertical".
 * @returns {Battleship.Coordinate[]} The cells occupied.
 */
Battleship.ship_cells = function (row, col, size, orientation) {
    return range(size).map(function (offset) {
        if (orientation === "horizontal") {
            return [row, col + offset];
        }
        return [row + offset, col];
    });
};

/**
 * Work out which cells the T-shaped X-wing would occupy.
 * @memberof Battleship
 * @function
 * @param {number} row The origin row.
 * @param {number} col The origin column.
 * @param {number} rotation Index into XWING_ROTATIONS (0-3).
 * @returns {Battleship.Coordinate[]} The five cells occupied.
 */
Battleship.xwing_cells = function (row, col, rotation) {
    return Battleship.XWING_ROTATIONS[rotation].map(function (offset) {
        return [row + offset[0], col + offset[1]];
    });
};

/**
 * Returns true if a coordinate is inside the 10x10 grid.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate} coord The coordinate to check.
 * @returns {boolean} Whether the coordinate is on the board.
 */
Battleship.is_on_board = function (coord) {
    return (
        coord[0] >= 0 &&
        coord[0] < Battleship.GRID_SIZE &&
        coord[1] >= 0 &&
        coord[1] < Battleship.GRID_SIZE
    );
};

/**
 * Returns true if two coordinates are equal.
 * @function
 * @param {Battleship.Coordinate} a First coordinate.
 * @param {Battleship.Coordinate} b Second coordinate.
 * @returns {boolean} Whether equal.
 */
const coords_equal = function (a, b) {
    return a[0] === b[0] && a[1] === b[1];
};

/**
 * Returns all cells occupied by ships on a board.
 * @memberof Battleship
 * @function
 * @param {Battleship.Board} board The board to inspect.
 * @returns {Battleship.Coordinate[]} Every occupied cell.
 */
Battleship.occupied_cells = function (board) {
    return board.fleet.flatMap(function (ship) {
        return ship.cells;
    });
};

/**
 * Returns whether a proposed set of cells is legal to place.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate[]} cells The cells to check.
 * @param {Battleship.Board} board The board to check against.
 * @returns {boolean} Whether placement is legal.
 */
Battleship.can_place = function (cells, board) {
    const all_on_board = cells.every(Battleship.is_on_board);
    if (!all_on_board) {
        return false;
    }
    const occupied = Battleship.occupied_cells(board);
    const any_overlap = cells.some(function (cell) {
        return occupied.some(function (taken) {
            return coords_equal(cell, taken);
        });
    });
    return !any_overlap;
};

/**
 * Returns a new board with one ship added.
 * Returns undefined if placement is illegal.
 * @memberof Battleship
 * @function
 * @param {string} name The ship name.
 * @param {number} size The ship size.
 * @param {string} shape The ship shape.
 * @param {Battleship.Coordinate[]} cells The cells to place on.
 * @param {Battleship.Board} board The board to place into.
 * @returns {Battleship.Board|undefined} New board or undefined.
 */
Battleship.place_ship = function (name, size, shape, cells, board) {
    if (!Battleship.can_place(cells, board)) {
        return undefined;
    }
    return {
        "fleet": [
            ...board.fleet,
            {"name": name, "size": size, "shape": shape, "cells": cells}
        ],
        "shots": board.shots
    };
};

/**
 * Returns a random integer from 0 up to (not including) max.
 * @function
 * @param {number} max Upper bound exclusive.
 * @returns {number} Random integer.
 */
const random_int = function (max) {
    return Math.floor(Math.random() * max);
};

/**
 * Returns a board with all ships placed randomly.
 * @memberof Battleship
 * @function
 * @returns {Battleship.Board} A fully placed board.
 */
Battleship.random_board = function () {
    return Battleship.ships.reduce(function (board, ship) {
        let placed = undefined;
        while (placed === undefined) {
            const row = random_int(Battleship.GRID_SIZE);
            const col = random_int(Battleship.GRID_SIZE);
            let cells;
            if (ship.shape === "xwing") {
                const rotation = random_int(4);
                cells = Battleship.xwing_cells(row, col, rotation);
            } else {
                const orientation = (
                    random_int(2) === 0 ? "horizontal" : "vertical"
                );
                cells = Battleship.ship_cells(row, col, ship.size, orientation);
            }
            placed = Battleship.place_ship(
                ship.name, ship.size, ship.shape, cells, board
            );
        }
        return placed;
    }, Battleship.empty_board());
};

/**
 * Returns whether a coordinate has already been shot at.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate} coord The coordinate to check.
 * @param {Battleship.Board} board The board to check.
 * @returns {boolean} Whether already shot.
 */
Battleship.already_shot = function (coord, board) {
    return board.shots.some(function (shot) {
        return coords_equal(shot, coord);
    });
};

/**
 * Returns whether a shot hits any ship.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate} coord The coordinate fired at.
 * @param {Battleship.Board} board The board fired at.
 * @returns {boolean} Whether it is a hit.
 */
Battleship.is_hit = function (coord, board) {
    return Battleship.occupied_cells(board).some(function (cell) {
        return coords_equal(cell, coord);
    });
};

/**
 * Returns whether all cells of a ship have been shot.
 * @memberof Battleship
 * @function
 * @param {Battleship.PlacedShip} ship The ship to check.
 * @param {Battleship.Board} board The board the ship is on.
 * @returns {boolean} Whether the ship is sunk.
 */
Battleship.is_sunk = function (ship, board) {
    return ship.cells.every(function (cell) {
        return Battleship.already_shot(cell, board);
    });
};

/**
 * Fire a shot at a coordinate. Returns new board or undefined if illegal.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate} coord The coordinate to fire at.
 * @param {Battleship.Board} board The board being fired at.
 * @returns {Battleship.Board|undefined} Updated board or undefined.
 */
Battleship.fire = function (coord, board) {
    if (!Battleship.is_on_board(coord)) {
        return undefined;
    }
    if (Battleship.already_shot(coord, board)) {
        return undefined;
    }
    return {
        "fleet": board.fleet,
        "shots": [...board.shots, coord]
    };
};

/**
 * Returns whether all ships on a board have been sunk.
 * @memberof Battleship
 * @function
 * @param {Battleship.Board} board The board to check.
 * @returns {boolean} Whether all ships are sunk.
 */
Battleship.is_defeated = function (board) {
    if (board.fleet.length === 0) {
        return false;
    }
    return board.fleet.every(function (ship) {
        return Battleship.is_sunk(ship, board);
    });
};

export default Object.freeze(Battleship);
