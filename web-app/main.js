/*jslint browser */
import Battleship from "./Battleship.js";

// --- game state 
// All mutable state lives here in one place. The module functions are pure;
// this file owns the side effects (DOM updates, state transitions).

let player_names = ["Player 1", "Player 2"];
let boards = [Battleship.empty_board(), Battleship.empty_board()];
let placement_player = 0;        // which player is currently placing ships
let placement_board = Battleship.empty_board();
let selected_ship_index = null;  // which ship in the fleet list is selected
let orientation = "horizontal";  // current placement orientation
let active_player = 0;           // whose turn it is during battle

// ---screen management 

const show_screen = function (id) {
    document.querySelectorAll(".screen").forEach(function (s) {
        s.classList.remove("active");
    });
    document.getElementById(id).classList.add("active");
    document.querySelector("main").focus();
};

// --- helpers 

const el = (id) => document.getElementById(id);

// Return ships not yet placed on placement_board.
const unplaced_ships = function () {
    const placed_names = placement_board.fleet.map((s) => s.name);
    return Battleship.ships.filter((s) => !placed_names.includes(s.name));
};

// --- placement grid 

const build_placement_grid = function () {
    const grid = el("placement-grid");
    grid.innerHTML = "";
    const size = Battleship.GRID_SIZE;

    for (let row = 0; row < size; row = row + 1) {
        for (let col = 0; col < size; col = col + 1) {
            const cell = document.createElement("button");
            cell.className = "cell";
            cell.setAttribute("aria-label", `Row ${row + 1}, Column ${col + 1}`);
            cell.setAttribute("role", "gridcell");
            cell.dataset.row = row;
            cell.dataset.col = col;

            // Hover: show preview of where ship would land.
            cell.addEventListener("mouseenter", function () {
                clear_preview();
                if (selected_ship_index === null) {
                    return;
                }
                const ship = unplaced_ships()[selected_ship_index];
                if (!ship) {
                    return;
                }
                const cells = Battleship.ship_cells(row, col, ship.size, orientation);
                const valid = Battleship.can_place(cells, placement_board);
                cells.forEach(function (c) {
                    const target = grid.querySelector(
                        `[data-row="${c[0]}"][data-col="${c[1]}"]`
                    );
                    if (target) {
                        target.classList.add(valid ? "preview" : "preview-invalid");
                    }
                });
            });

            cell.addEventListener("mouseleave", clear_preview);

            // Click: place the selected ship.
            cell.addEventListener("click", function () {
                if (selected_ship_index === null) {
                    el("placement-status").textContent = "Select a ship from the list first.";
                    return;
                }
                const ship = unplaced_ships()[selected_ship_index];
                if (!ship) {
                    return;
                }
                const cells = Battleship.ship_cells(row, col, ship.size, orientation);
                const next = Battleship.place_ship(ship.name, ship.size, cells, placement_board);
                if (next === undefined) {
                    el("placement-status").textContent = "Can't place there – try another spot.";
                    return;
                }
                placement_board = next;
                selected_ship_index = null;
                refresh_placement_ui();
            });

            // Keyboard: Enter or Space triggers click.
            cell.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    cell.click();
                }
                if (event.key === "ArrowRight" && cell.nextSibling) {
                    cell.nextSibling.focus();
                }
                if (event.key === "ArrowLeft" && cell.previousSibling) {
                    cell.previousSibling.focus();
                }
            });

            grid.appendChild(cell);
        }
    }
};

const clear_preview = function () {
    document.querySelectorAll(".preview, .preview-invalid").forEach(function (c) {
        c.classList.remove("preview", "preview-invalid");
    });
};

// Repaint the placement grid to reflect current placement_board.
const refresh_placement_grid = function () {
    const occupied = Battleship.occupied_cells(placement_board);
    document.querySelectorAll("#placement-grid .cell").forEach(function (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        const is_occupied = occupied.some((c) => c[0] === row && c[1] === col);
        cell.classList.toggle("ship", is_occupied);
    });
};

// Repaint the ship list sidebar.
const refresh_ship_list = function () {
    const list = el("ship-list");
    list.innerHTML = "";
    const remaining = unplaced_ships();
    const placed_names = placement_board.fleet.map((s) => s.name);

    Battleship.ships.forEach(function (ship, index) {
        const li = document.createElement("li");
        li.setAttribute("tabindex", "0");
        li.setAttribute("role", "option");

        const dots = document.createElement("span");
        dots.className = "ship-size-dots";
        for (let i = 0; i < ship.size; i = i + 1) {
            dots.appendChild(document.createElement("span"));
        }

        li.textContent = ship.name + " ";
        li.appendChild(dots);

        if (placed_names.includes(ship.name)) {
            li.classList.add("placed");
            li.setAttribute("aria-label", ship.name + " – placed");
        } else {
            const remaining_index = remaining.findIndex((s) => s.name === ship.name);
            li.addEventListener("click", function () {
                selected_ship_index = remaining_index;
                refresh_ship_list();
            });
            li.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    li.click();
                }
            });
            if (selected_ship_index === remaining_index) {
                li.classList.add("active-ship");
                li.setAttribute("aria-selected", "true");
            }
        }

        list.appendChild(li);
    });
};

// Full placement UI refresh.
const refresh_placement_ui = function () {
    refresh_placement_grid();
    refresh_ship_list();

    const remaining = unplaced_ships();
    el("btn-ready").disabled = remaining.length > 0;

    if (remaining.length === 0) {
        el("placement-status").textContent = "All ships placed! Press Ready when done.";
        selected_ship_index = null;
    } else if (selected_ship_index !== null && remaining[selected_ship_index]) {
        const ship = remaining[selected_ship_index];
        el("placement-status").textContent = (
            `Placing ${ship.name} (size ${ship.size}) – click the grid.`
        );
    } else {
        el("placement-status").textContent = "Select a ship from the list to place it.";
    }

    el("orientation-label").textContent = (
        orientation === "horizontal"
        ? "Orientation: Horizontal →"
        : "Orientation: Vertical ↓"
    );
    el("placement-grid-label").textContent = (
        `${player_names[placement_player]}'s board`
    );
    el("placement-title").textContent = (
        `${player_names[placement_player]}: Place Your Fleet`
    );
};

// --- battle grid 

const build_battle_grid = function (grid_el, clickable) {
    grid_el.innerHTML = "";
    const size = Battleship.GRID_SIZE;
    for (let row = 0; row < size; row = row + 1) {
        for (let col = 0; col < size; col = col + 1) {
            const cell = document.createElement("button");
            cell.className = "cell";
            cell.setAttribute("role", "gridcell");
            cell.setAttribute(
                "aria-label",
                `Row ${row + 1}, Column ${col + 1}`
            );
            cell.dataset.row = row;
            cell.dataset.col = col;
            if (!clickable) {
                cell.disabled = true;
            }
            grid_el.appendChild(cell);
        }
    }
};

// Repaint a battle grid from a board's perspective.
// enemy_grid shows shots (hits/misses) on the defender's board.
// own_grid shows the active player's board with all ships + incoming shots.
const refresh_battle_grids = function () {
    const attacker = active_player;
    const defender = 1 - active_player;
    const defender_board = boards[defender];
    const own_board = boards[attacker];

    // Enemy grid: show what the attacker has fired.
    const enemy_grid = el("enemy-grid");
    enemy_grid.querySelectorAll(".cell").forEach(function (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        const coord = [row, col];
        cell.className = "cell";
        cell.textContent = "";
        cell.disabled = false;

        if (Battleship.already_shot(coord, defender_board)) {
            if (Battleship.is_hit(coord, defender_board)) {
                // Check if the ship this hit belongs to is now sunk.
                const ship = defender_board.fleet.find(
                    (s) => s.cells.some((c) => c[0] === row && c[1] === col)
                );
                if (ship && Battleship.is_sunk(ship, defender_board)) {
                    cell.classList.add("sunk");
                    cell.textContent = "💥";
                } else {
                    cell.classList.add("hit");
                    cell.textContent = "🔥";
                }
            } else {
                cell.classList.add("miss");
                cell.textContent = "·";
            }
            cell.disabled = true;
        }
        cell.setAttribute("aria-label", `Row ${row + 1}, Col ${col + 1}` + (
            cell.classList.contains("hit") ? " – hit" :
            cell.classList.contains("miss") ? " – miss" :
            cell.classList.contains("sunk") ? " – sunk" : ""
        ));
    });

    // Own grid: show the active player's ships + shots fired at them.
    const own_grid = el("own-grid");
    own_grid.querySelectorAll(".cell").forEach(function (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        const coord = [row, col];
        cell.className = "cell";
        cell.textContent = "";
        cell.disabled = true;

        const is_ship = Battleship.is_hit(coord, own_board);
        if (is_ship) {
            cell.classList.add("ship");
        }
        if (Battleship.already_shot(coord, own_board)) {
            if (is_ship) {
                const ship = own_board.fleet.find(
                    (s) => s.cells.some((c) => c[0] === row && c[1] === col)
                );
                if (ship && Battleship.is_sunk(ship, own_board)) {
                    cell.classList.add("sunk");
                    cell.textContent = "💥";
                } else {
                    cell.classList.add("hit");
                    cell.textContent = "🔥";
                }
            } else {
                cell.classList.add("miss");
                cell.textContent = "·";
            }
        }
    });

    // Fleet tracker.
    const tracker = el("enemy-fleet-tracker");
    tracker.innerHTML = "";
    defender_board.fleet.forEach(function (ship) {
        const li = document.createElement("li");
        li.textContent = ship.name;
        const status = document.createElement("span");
        if (Battleship.is_sunk(ship, defender_board)) {
            status.textContent = "SUNK";
            li.classList.add("sunk-ship");
        } else {
            status.textContent = "Afloat";
            status.style.color = "var(--accent2)";
        }
        li.appendChild(status);
        tracker.appendChild(li);
    });

    el("enemy-label").textContent = `${player_names[defender]}'s Waters`;
    el("own-label").textContent = `${player_names[attacker]}'s Waters`;
    el("battle-title").textContent = `${player_names[attacker]}'s Turn`;
    el("battle-status").textContent = "Click on the enemy grid to fire!";
};

// --- event wiring

// Screen 1: start placement.
el("btn-start-placement").addEventListener("click", function () {
    player_names[0] = el("name-p1").value.trim() || "Player 1";
    player_names[1] = el("name-p2").value.trim() || "Player 2";
    boards = [Battleship.empty_board(), Battleship.empty_board()];
    placement_player = 0;
    start_placement();
});

// Screen 2: rotate button.
el("btn-rotate").addEventListener("click", function () {
    orientation = (orientation === "horizontal" ? "vertical" : "horizontal");
    refresh_placement_ui();
});

// Screen 2: randomise button.
el("btn-randomise").addEventListener("click", function () {
    placement_board = Battleship.random_board();
    selected_ship_index = null;
    refresh_placement_ui();
});

// Screen 2: ready button.
el("btn-ready").addEventListener("click", function () {
    boards[placement_player] = placement_board;
    if (placement_player === 0) {
        // Show pass screen before player 2 places.
        el("pass-title").textContent = "Hand Over the Device";
        el("pass-message").textContent = (
            `${player_names[0]} is done. Cover the screen and pass to ${player_names[1]}.`
        );
        show_screen("pass-screen");
        el("btn-pass").onclick = function () {
            placement_player = 1;
            start_placement();
        };
    } else {
        // Both placed – show pass screen before battle starts.
        el("pass-title").textContent = "Ready for Battle!";
        el("pass-message").textContent = (
            `${player_names[1]} is done. Pass to ${player_names[0]} to fire first.`
        );
        show_screen("pass-screen");
        active_player = 0;
        el("btn-pass").onclick = function () {
            start_battle();
        };
    }
});

// Enemy grid: fire on click.
el("enemy-grid").addEventListener("click", function (event) {
    const cell = event.target.closest(".cell");
    if (!cell) {
        return;
    }
    const row = parseInt(cell.dataset.row, 10);
    const col = parseInt(cell.dataset.col, 10);
    const defender = 1 - active_player;

    const next_board = Battleship.fire([row, col], boards[defender]);
    if (next_board === undefined) {
        return;
    }
    boards[defender] = next_board;

    if (Battleship.is_defeated(boards[defender])) {
        refresh_battle_grids();
        el("result-winner").textContent = (
            `${player_names[active_player]} wins! The galaxy is saved.`
        );
        show_screen("result-screen");
        return;
    }

    // Pass to the other player.
    const next_player = 1 - active_player;
    el("pass-title").textContent = "Pass the Device";
    el("pass-message").textContent = (
        `${player_names[active_player]}'s turn is done. ` +
        `Cover the screen and pass to ${player_names[next_player]}.`
    );
    show_screen("pass-screen");
    el("btn-pass").onclick = function () {
        active_player = next_player;
        refresh_battle_grids();
        show_screen("battle-screen");
    };
});

// Result: play again.
el("btn-play-again").addEventListener("click", function () {
    player_names = [el("name-p1").value || "Player 1", el("name-p2").value || "Player 2"];
    show_screen("name-screen");
});

// --- screen starters 

const start_placement = function () {
    placement_board = Battleship.empty_board();
    selected_ship_index = null;
    orientation = "horizontal";
    build_placement_grid();
    refresh_placement_ui();
    show_screen("placement-screen");
};

const start_battle = function () {
    build_battle_grid(el("enemy-grid"), true);
    build_battle_grid(el("own-grid"), false);
    refresh_battle_grids();
    show_screen("battle-screen");
};
