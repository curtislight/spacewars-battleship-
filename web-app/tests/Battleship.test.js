import Battleship from "../Battleship.js";

// ── invariant checker ────────────────────────────────────────────────────────
// A valid board must always satisfy these rules regardless of how it was made.
// If any rule is broken, the game state is corrupt.

const throw_if_invalid = function (board) {
    if (!Array.isArray(board.fleet) || !Array.isArray(board.shots)) {
        throw new Error("A board must have a fleet and a shots list.");
    }
    board.fleet.forEach(function (ship) {
        if (typeof ship.name !== "string") {
            throw new Error("Every ship must have a name.");
        }
        if (!Array.isArray(ship.cells) || ship.cells.length !== ship.size) {
            throw new Error(
                ship.name + " has " + ship.cells.length +
                " cells but size " + ship.size + "."
            );
        }
        ship.cells.forEach(function (cell) {
            if (!Battleship.is_on_board(cell)) {
                throw new Error(
                    ship.name + " has a cell off the board: " +
                    JSON.stringify(cell)
                );
            }
        });
    });
    // No two ships may share a cell.
    const all_cells = Battleship.occupied_cells(board);
    all_cells.forEach(function (cell, i) {
        all_cells.forEach(function (other, j) {
            if (i !== j && cell[0] === other[0] && cell[1] === other[1]) {
                throw new Error(
                    "Two ships overlap at " + JSON.stringify(cell)
                );
            }
        });
    });
    // Every shot must be on the board and unique.
    board.shots.forEach(function (shot, i) {
        if (!Battleship.is_on_board(shot)) {
            throw new Error("A shot is off the board: " + JSON.stringify(shot));
        }
        board.shots.forEach(function (other, j) {
            if (i !== j && shot[0] === other[0] && shot[1] === other[1]) {
                throw new Error(
                    "The same square was shot twice: " + JSON.stringify(shot)
                );
            }
        });
    });
};

// Helper: build a board from a given fleet definition quickly
const place_all = function (placements) {
    return placements.reduce(function (board, p) {
        const result = Battleship.place_ship(
            p.name, p.shape, p.size, p.cells, board
        );
        if (result === undefined) {
            throw new Error("Failed to place " + p.name + " during test setup.");
        }
        return result;
    }, Battleship.empty_board());
};

// ── At the start of the game ─────────────────────────────────────────────────

describe("At the start of the game", function () {
    it("The board is empty — no ships have been placed and no shots fired.", function () {
        const board = Battleship.empty_board();
        throw_if_invalid(board);
        if (board.fleet.length !== 0 || board.shots.length !== 0) {
            throw new Error(
                "A new game should start with an empty board."
            );
        }
    });

    it("A player cannot have already won before any ships are placed.", function () {
        if (Battleship.is_defeated(Battleship.empty_board())) {
            throw new Error(
                "An empty board should not count as defeated."
            );
        }
    });

    it("A randomly set-up board is always a valid starting position.", function () {
        throw_if_invalid(Battleship.random_board());
    });

    it("A randomly set-up board always contains all five ships.", function () {
        const board = Battleship.random_board();
        if (board.fleet.length !== Battleship.ships.length) {
            throw new Error(
                "The fleet should have " + Battleship.ships.length +
                " ships but has " + board.fleet.length + "."
            );
        }
    });

    it("A randomly set-up board has no shots fired yet.", function () {
        if (Battleship.random_board().shots.length !== 0) {
            throw new Error("A fresh board should have no shots.");
        }
    });
});

// ── Placing ships ────────────────────────────────────────────────────────────

describe("Placing ships", function () {
    it(
        `A player can place a ship on any empty square — 
the resulting board is a valid game state.`,
        function () {
            const board = Battleship.empty_board();
            const cells = Battleship.ship_cells(0, 0, 3, "horizontal");
            const next  = Battleship.place_ship("Slave I", "line", 3, cells, board);
            throw_if_invalid(next);
        }
    );

    it(
        `A player cannot place a ship on top of a ship that is already there.`,
        function () {
            const board = Battleship.empty_board();
            const cells = Battleship.ship_cells(3, 3, 3, "horizontal");
            const with_ship = Battleship.place_ship(
                "Slave I", "line", 3, cells, board
            );
            const overlap = Battleship.ship_cells(3, 4, 2, "horizontal");
            const result  = Battleship.place_ship(
                "TIE Fighter", "line", 2, overlap, with_ship
            );
            if (result !== undefined) {
                throw new Error(
                    "Placing a ship on an occupied square should be refused."
                );
            }
        }
    );

    it(
        `A player cannot place a ship so that it hangs off the right edge of the grid.`,
        function () {
            const board = Battleship.empty_board();
            const cells = Battleship.ship_cells(0, 8, 4, "horizontal");
            if (Battleship.can_place(cells, board)) {
                throw new Error(
                    "A ship that extends off the right edge should be refused."
                );
            }
        }
    );

    it(
        `A player cannot place a ship so that it hangs off the bottom edge of the grid.`,
        function () {
            const board = Battleship.empty_board();
            const cells = Battleship.ship_cells(8, 0, 4, "vertical");
            if (Battleship.can_place(cells, board)) {
                throw new Error(
                    "A ship that extends off the bottom edge should be refused."
                );
            }
        }
    );

    it(
        `Placing a ship does not change the board it was placed on —
the original board is unaffected.`,
        function () {
            const board = Battleship.empty_board();
            const cells = Battleship.ship_cells(0, 0, 3, "horizontal");
            Battleship.place_ship("Slave I", "line", 3, cells, board);
            if (board.fleet.length !== 0) {
                throw new Error(
                    "Placing a ship should return a new board, not modify the old one."
                );
            }
        }
    );

    it(
        `The X-wing can be placed in any of its four T-shaped orientations 
without breaking the board.`,
        function () {
            [0, 1, 2, 3].forEach(function (rotation) {
                const board = Battleship.empty_board();
                const cells = Battleship.xwing_cells(4, 4, rotation);
                const next  = Battleship.place_ship(
                    "X-wing", "xwing", 5, cells, board
                );
                if (next === undefined) {
                    throw new Error(
                        "X-wing rotation " + rotation + " at [4,4] should be a legal placement."
                    );
                }
                throw_if_invalid(next);
            });
        }
    );

    it(
        `The X-wing cannot be placed when any part of its T-shape is off the grid.`,
        function () {
            const board = Battleship.empty_board();
            // Rotation 1 has cells going left; placing at col 0 sends some off the grid.
            const cells = Battleship.xwing_cells(0, 0, 1);
            if (Battleship.can_place(cells, board)) {
                throw new Error(
                    "An X-wing with cells off the grid should be refused."
                );
            }
        }
    );

    it(
        `The Millennium Falcon can be placed in all four orientations 
without breaking the board.`,
        function () {
            [0, 1, 2, 3].forEach(function (rotation) {
                const board = Battleship.empty_board();
                const cells = Battleship.falcon_cells(3, 3, rotation);
                const next  = Battleship.place_ship(
                    "Millennium Falcon", "falcon", 6, cells, board
                );
                if (next === undefined) {
                    throw new Error(
                        "Falcon rotation " + rotation + " at [3,3] should be a legal placement."
                    );
                }
                throw_if_invalid(next);
            });
        }
    );

    it(
        `The Millennium Falcon cannot be placed when it would go off the grid.`,
        function () {
            const board = Battleship.empty_board();
            const cells = Battleship.falcon_cells(9, 9, 0);
            if (Battleship.can_place(cells, board)) {
                throw new Error(
                    "A Falcon that extends off the grid should be refused."
                );
            }
        }
    );
});

// ── Firing shots ─────────────────────────────────────────────────────────────

describe("Firing shots", function () {
    it(
        `When a player fires at a square that contains an enemy ship, it is a hit.`,
        function () {
            const board = Battleship.empty_board();
            const cells = Battleship.ship_cells(5, 5, 2, "horizontal");
            const with_ship = Battleship.place_ship(
                "TIE Fighter", "line", 2, cells, board
            );
            if (!Battleship.is_hit([5, 5], with_ship)) {
                throw new Error(
                    "Firing at a square containing a ship should register as a hit."
                );
            }
        }
    );

    it(
        `When a player fires at a square with no ship, it is a miss.`,
        function () {
            const board = Battleship.empty_board();
            const cells = Battleship.ship_cells(5, 5, 2, "horizontal");
            const with_ship = Battleship.place_ship(
                "TIE Fighter", "line", 2, cells, board
            );
            if (Battleship.is_hit([0, 0], with_ship)) {
                throw new Error(
                    "Firing at an empty square should register as a miss."
                );
            }
        }
    );

    it(
        `A player cannot fire at the same square twice.`,
        function () {
            const board      = Battleship.empty_board();
            const after_once = Battleship.fire([3, 3], board);
            const after_twice = Battleship.fire([3, 3], after_once);
            if (after_twice !== undefined) {
                throw new Error(
                    "Firing at a square that has already been shot should be refused."
                );
            }
        }
    );

    it(
        `A player cannot fire at a square outside the grid.`,
        function () {
            const board = Battleship.empty_board();
            if (Battleship.fire([10, 0], board) !== undefined) {
                throw new Error(
                    "Firing off the grid should be refused."
                );
            }
        }
    );

    it(
        `Firing does not modify the original board — 
the shot is recorded on a new board only.`,
        function () {
            const board = Battleship.empty_board();
            Battleship.fire([0, 0], board);
            if (board.shots.length !== 0) {
                throw new Error(
                    "Firing should return a new board, not modify the original."
                );
            }
        }
    );

    it(
        `After firing, the resulting board is always a valid game state.`,
        function () {
            const board = Battleship.empty_board();
            const cells = Battleship.ship_cells(2, 2, 3, "horizontal");
            const with_ship = Battleship.place_ship(
                "Slave I", "line", 3, cells, board
            );
            const after_miss = Battleship.fire([0, 0], with_ship);
            const after_hit  = Battleship.fire([2, 2], with_ship);
            throw_if_invalid(after_miss);
            throw_if_invalid(after_hit);
        }
    );
});

// ── Sinking ships ────────────────────────────────────────────────────────────

describe("Sinking ships", function () {
    it(
        `A ship is sunk only when every one of its squares has been hit.`,
        function () {
            let board = Battleship.empty_board();
            const cells = Battleship.ship_cells(0, 0, 2, "horizontal");
            board = Battleship.place_ship("TIE Fighter", "line", 2, cells, board);
            board = Battleship.fire([0, 0], board);
            if (Battleship.is_sunk(board.fleet[0], board)) {
                throw new Error(
                    "A ship with only one hit should not be sunk yet."
                );
            }
            board = Battleship.fire([0, 1], board);
            if (!Battleship.is_sunk(board.fleet[0], board)) {
                throw new Error(
                    "A ship with every square hit should be sunk."
                );
            }
        }
    );

    it(
        `A player wins only when every enemy ship has been sunk.`,
        function () {
            let board = Battleship.empty_board();
            const cells = Battleship.ship_cells(0, 0, 2, "horizontal");
            board = Battleship.place_ship("TIE Fighter", "line", 2, cells, board);
            board = Battleship.fire([0, 0], board);
            if (Battleship.is_defeated(board)) {
                throw new Error(
                    "A player should not win while ships are still afloat."
                );
            }
            board = Battleship.fire([0, 1], board);
            if (!Battleship.is_defeated(board)) {
                throw new Error(
                    "A player should win once every enemy ship is sunk."
                );
            }
        }
    );

    it(
        `A player has not won at the start of the game, 
even with no ships placed.`,
        function () {
            if (Battleship.is_defeated(Battleship.empty_board())) {
                throw new Error(
                    "An empty board should not count as a win."
                );
            }
        }
    );

    it(
        `Hitting a ship on the Millennium Falcon does not sink the 
whole ship — every cell must be hit.`,
        function () {
            let board = Battleship.empty_board();
            const cells = Battleship.falcon_cells(2, 2, 0);
            board = Battleship.place_ship(
                "Millennium Falcon", "falcon", 6, cells, board
            );
            // Hit 5 of 6 cells
            board = Battleship.fire([2, 2], board);
            board = Battleship.fire([2, 3], board);
            board = Battleship.fire([2, 4], board);
            board = Battleship.fire([3, 2], board);
            board = Battleship.fire([3, 3], board);
            if (Battleship.is_sunk(board.fleet[0], board)) {
                throw new Error(
                    "The Falcon should not be sunk until all 6 cells are hit."
                );
            }
            // Hit the final cell
            board = Battleship.fire([3, 4], board);
            if (!Battleship.is_sunk(board.fleet[0], board)) {
                throw new Error(
                    "The Falcon should be sunk once all 6 cells are hit."
                );
            }
        }
    );
});
