/**
 * Battleship.js is a module to model and play a Battleship style game.
 * https://en.wikipedia.org/wiki/Battleship_(game)
 * It exposes pure functions that act on plain game-state objects.
 * @namespace Battleship
 * @author Curtis
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
 * A small helper: produce the list [0, 1, ..., n - 1].
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
 * Does not check whether those cells are on the board or free.
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
 * Returns true if two coordinates refer to the same cell.
 * @function
 * @param {Battleship.Coordinate} a First coordinate.
 * @param {Battleship.Coordinate} b Second coordinate.
 * @returns {boolean} Whether the coordinates are equal.
 */
const coords_equal = function (a, b) {
    return a[0] === b[0] && a[1] === b[1];
};

/**
 * Returns all cells currently occupied by ships on a board.
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
 * Returns whether a proposed set of cells is legal to place on a board.
 * Legal means: every cell is on the grid, and none overlap an existing ship.
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
 * Returns a new board with one ship added at the given cells.
 * If placement is illegal, returns undefined.
 * The original board is never modified.
 * @memberof Battleship
 * @function
 * @param {string} name The ship's name.
 * @param {number} size The ship's size.
 * @param {Battleship.Coordinate[]} cells The cells to place the ship on.
 * @param {Battleship.Board} board The board to place into.
 * @returns {Battleship.Board|undefined} The new board, or undefined if illegal.
 */
Battleship.place_ship = function (name, size, cells, board) {
    if (!Battleship.can_place(cells, board)) {
        return undefined;
    }
    return {
        "fleet": [...board.fleet, {"name": name, "size": size, "cells": cells}],
        "shots": board.shots
    };
};

/**
 * Returns a random integer from 0 up to (but not including) max.
 * @function
 * @param {number} max Upper bound (exclusive).
 * @returns {number} A random integer in [0, max).
 */
const random_int = function (max) {
    return Math.floor(Math.random() * max);
};

/**
 * Returns a board with all ships from the standard fleet placed randomly.
 * Ships are placed one at a time; if a random position is illegal,
 * a new one is tried until a legal position is found.
 * @memberof Battleship
 * @function
 * @returns {Battleship.Board} A board with all five ships placed.
 */
Battleship.random_board = function () {
    return Battleship.ships.reduce(function (board, ship) {
        let placed = undefined;
        while (placed === undefined) {
            const orientation = (
                random_int(2) === 0
                ? "horizontal"
                : "vertical"
            );
            const row = random_int(Battleship.GRID_SIZE);
            const col = random_int(Battleship.GRID_SIZE);
            const cells = Battleship.ship_cells(row, col, ship.size, orientation);
            placed = Battleship.place_ship(ship.name, ship.size, cells, board);
        }
        return placed;
    }, Battleship.empty_board());
};

/**
 * Returns whether a coordinate has already been shot at on a board.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate} coord The coordinate to check.
 * @param {Battleship.Board} board The board to check.
 * @returns {boolean} Whether that cell has been shot at.
 */
Battleship.already_shot = function (coord, board) {
    return board.shots.some(function (shot) {
        return coords_equal(shot, coord);
    });
};

/**
 * Returns whether a shot at the given coordinate hits any ship on the board.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate} coord The coordinate being fired at.
 * @param {Battleship.Board} board The board being fired at.
 * @returns {boolean} Whether the shot is a hit.
 */
Battleship.is_hit = function (coord, board) {
    return Battleship.occupied_cells(board).some(function (cell) {
        return coords_equal(cell, coord);
    });
};

/**
 * Returns whether all cells of a ship have been shot at.
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
 * Fire a shot at a coordinate on a board.
 * Returns a new board with the shot recorded.
 * Returns undefined if the coordinate is off the board or already shot at.
 * @memberof Battleship
 * @function
 * @param {Battleship.Coordinate} coord The coordinate to fire at.
 * @param {Battleship.Board} board The board being fired at.
 * @returns {Battleship.Board|undefined} The updated board, or undefined if illegal.
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
 * Returns whether the game is over for this board,
 * i.e. every ship in the fleet has been sunk.
 * @memberof Battleship
 * @function
 * @param {Battleship.Board} board The board to check.
 * @returns {boolean} Whether all ships are sunk.
 */
Battleship.is_defeated = function (board) {
    return board.fleet.every(function (ship) {
        return Battleship.is_sunk(ship, board);
    });
};

export default Object.freeze(Battleship);
