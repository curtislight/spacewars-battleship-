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
 * The four rotations of the T-shaped X-wing as [row, col] offsets.
 * @memberof Battleship
 * @constant {number[][][]}
 */
Battleship.XWING_ROTATIONS = Object.freeze([
    Object.freeze([
        [0, 0], [1, 0], [2, 0], [1, 1], [1, 2]
    ]),
    Object.freeze([
        [0, 0], [1, 0], [2, 0], [1, -1], [1, -2]
    ]),
    Object.freeze([
        [0, 0], [0, 1], [0, 2], [1, 1], [2, 1]
    ]),
    Object.freeze([
        [2, 0], [2, 1], [2, 2], [1, 1], [0, 1]
    ])
]);

/**
 * The four rotations of the Millennium Falcon (2x3 block).
 * @memberof Battleship
 * @constant {number[][][]}
 */
Battleship.FALCON_ROTATIONS = Object.freeze([
    Object.freeze([
        [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]
    ]),
    Object.freeze([
        [0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]
    ]),
    Object.freeze([
        [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]
    ]),
    Object.freeze([
        [0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]
    ])
]);

/**
 * The fleet every player must place.
 * @memberof Battleship
 * @constant {Object[]}
 */
Battleship.ships = Object.freeze([
    Object.freeze({"name": "TIE Fighter", "shape": "line", "size": 2}),
    Object.freeze({"name": "Jedi Starfighter", "shape": "line", "size": 2}),
    Object.freeze({"name": "Slave I", "shape": "line", "size": 3}),
    Object.freeze({"name": "X-wing", "shape": "xwing", "size": 5}),
    Object.freeze({"name": "Millennium Falcon", "shape": "falcon", "size": 6})
]);

/**
 * A coordinate on the board, written as a [row, column] pair.
 * Both counted from 0: top-left is [0, 0].
 * @memberof Battleship
 * @typedef {number[]} Coordinate
 */

/**
 * A ship that has been placed on a board.
 * @memberof Battleship
 * @typedef {Object} PlacedShip
 * @property {Battleship.Coordinate[]} cells The cells occupied.
 * @property {string} name The ship name.
 * @property {string} shape "line", "xwing", or "falcon".
 * @property {number} size How many cells occupied.
 */

/**
 * A player's board.
 * @memberof Battleship
 * @typedef {Object} Board
 * @property {Battleship.PlacedShip[]} fleet Ships on this board.
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
 * Compute cells for a straight-line ship.
 * @memberof Battleship
 * @function
 * @param {number} row First cell row.
 * @param {number} col First cell column.
 * @param {number} size Ship length.
 * @param {string} orientation "horizontal" or "vertical".
 * @returns {Battleship.Coordinate[]} Cells occupied.
 */
Battleship.ship_cells = function (row, col, size, orientation) {
    return range(size).map(function (offset) {
        return (
            orientation === "horizontal"
            ? [row, col + offset]
            : [row + offset, col]
        );
    });
};

/**
 * Compute cells for the T-shaped X-wing.
 * @memberof Battleship
 * @function
 * @param {number} row Origin row.
 * @param {number} col Origin column.
 * @param {number} rotation Index 0-3 into XWING_ROTATIONS.
 * @returns {Battleship.Coordinate[]} The five cells.
 */
Battleship.xwing_cells = function (row, col, rotation) {
    return Battleship.XWING_ROTATIONS[rotation].map(function (offset) {
        return [row + offset[0], col + offset[1]];
    });
};

/**
 * Compute cells for the Millennium Falcon (2x3 block).
 * @memberof Battleship
 * @function
 * @param {number} row Origin row.
 * @param {number} col Origin column.
 * @param {number} rotation Index 0-3 into FALCON_ROTATIONS.
 * @returns {Battleship.Coordinate[]} The six cells.
 */
Battleship.falcon_cells = function (row, col, rotation) {
    return Battleship.FALCON_ROTATIONS[rotation].map(function (offset) {
        return [row + offset[0], col + offset[1]];
    });
};

/**
 * Returns true if a coordinate is inside the 10x10 grid.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate} coord The coordinate to check.
 * @returns {boolean} Whether on the board.
 */
Battleship.is_on_board = function (coord) {
    return (
        coord[0] >= 0
        && coord[0] < Battleship.GRID_SIZE
        && coord[1] >= 0
        && coord[1] < Battleship.GRID_SIZE
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
 * @param {Battleship.Board} board The board.
 * @returns {Battleship.Coordinate[]} Every occupied cell.
 */
Battleship.occupied_cells = function (board) {
    return board.fleet.flatMap(function (ship) {
        return ship.cells;
    });
};

/**
 * Returns whether a proposed set of cells is legal to place.
 * Legal means all cells are on the board and none overlap existing ships.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate[]} cells Cells to check.
 * @param {Battleship.Board} board Board to check against.
 * @returns {boolean} Whether placement is legal.
 */
Battleship.can_place = function (cells, board) {
    if (!cells.every(Battleship.is_on_board)) {
        return false;
    }
    const occupied = Battleship.occupied_cells(board);
    return !cells.some(function (cell) {
        return occupied.some(function (taken) {
            return coords_equal(cell, taken);
        });
    });
};

/**
 * Returns a new board with one ship added, or undefined if illegal.
 * The original board is never modified.
 * @memberof Battleship
 * @function
 * @param {string} name Ship name.
 * @param {string} shape Ship shape.
 * @param {number} size Ship size.
 * @param {Battleship.Coordinate[]} cells Cells to place on.
 * @param {Battleship.Board} board Board to place into.
 * @returns {Battleship.Board|undefined} New board or undefined.
 */
Battleship.place_ship = function (name, shape, size, cells, board) {
    if (!Battleship.can_place(cells, board)) {
        return undefined;
    }
    return {
        "fleet": [...board.fleet, {
            "cells": cells,
            "name": name,
            "shape": shape,
            "size": size
        }],
        "shots": board.shots
    };
};

/**
 * Returns a random integer in [0, max).
 * @function
 * @param {number} max Upper bound exclusive.
 * @returns {number} Random integer.
 */
const random_int = function (max) {
    return Math.floor(Math.random() * max);
};

/**
 * Returns a board with all ships placed randomly.
 * This is the only intentionally impure function in the module,
 * as it relies on Math.random().
 * @memberof Battleship
 * @function
 * @returns {Battleship.Board} A fully placed board.
 */
 Battleship.random_board = function () {
        return Battleship.ships.reduce(function (board, ship) {
        let placed;
        while (placed === undefined) {
            const row = random_int(Battleship.GRID_SIZE);
            const col = random_int(Battleship.GRID_SIZE);
            let cells;
            if (ship.shape === "xwing") {
                cells = Battleship.xwing_cells(row, col, random_int(4));
            } else if (ship.shape === "falcon") {
                cells = Battleship.falcon_cells(row, col, random_int(4));
            } else {
                const orientation = (
                    random_int(2) === 0
                    ? "horizontal"
                    : "vertical"
                );
                cells = Battleship.ship_cells(row, col, ship.size, orientation);
            }
            placed = Battleship.place_ship(
                ship.name,
                ship.shape,
                ship.size,
                cells,
                board
            );
        }
        return placed;
    }, Battleship.empty_board());
};

/**
 * Returns whether a coordinate has already been shot at.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate} coord Coordinate to check.
 * @param {Battleship.Board} board Board to check.
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
 * @param {Battleship.Coordinate} coord Coordinate fired at.
 * @param {Battleship.Board} board Board fired at.
 * @returns {boolean} Whether a hit.
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
 * @param {Battleship.PlacedShip} ship Ship to check.
 * @param {Battleship.Board} board Board the ship is on.
 * @returns {boolean} Whether sunk.
 */
Battleship.is_sunk = function (ship, board) {
    return ship.cells.every(function (cell) {
        return Battleship.already_shot(cell, board);
    });
};

/**
 * Fire a shot at a coordinate.
 * Returns a new board or undefined if the shot is illegal.
 * The original board is never modified.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate} coord Coordinate to fire at.
 * @param {Battleship.Board} board Board being fired at.
 * @returns {Battleship.Board|undefined} Updated board or undefined.
 */
Battleship.fire = function (coord, board) {
    if (!Battleship.is_on_board(coord)) {
        return undefined;
    }
    if (Battleship.already_shot(coord, board)) {
        return undefined;
    }
    return {"fleet": board.fleet, "shots": [...board.shots, coord]};
};

/**
 * Returns whether all ships on a board are sunk.
 * @memberof Battleship
 * @function
 * @param {Battleship.Board} board Board to check.
 * @returns {boolean} Whether defeated.
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
