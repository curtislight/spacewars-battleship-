/*jslint browser */
import Battleship from "./Battleship.js";
import Images from "./images.js";

// --- constants 
const ROW_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const COL_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

const SHIP_IMAGES = {
    "TIE Fighter": Images.tie_fighter,
    "Jedi Starfighter": Images.jedi_starfighter,
    "Slave I": Images.slave1,
    "X-wing": Images.xwing,
    "Millennium Falcon": Images.millennium_falcon
};

// --- state 

let player_names = ["Player 1", "Player 2"];
let boards = [Battleship.empty_board(), Battleship.empty_board()];
let placement_player = 0;
let placement_board = Battleship.empty_board();
let selected_ship_index = null;
let orientation = "horizontal";
let xwing_rotation = 0;
let active_player = 0;
let waiting_for_continue = false;

// --- helpers

const el = (id) => document.getElementById(id);

const show_screen = function (id) {
    document.querySelectorAll(".screen").forEach(function (s) {
        s.classList.remove("active");
    });
    el(id).classList.add("active");
    el("main") && document.querySelector("main").focus();
};

const placed_names = () => placement_board.fleet.map((s) => s.name);
const unplaced_ships = () => Battleship.ships.filter(
    (s) => !placed_names().includes(s.name)
);

// --- grid builders 
const build_labels = function (col_el, row_el) {
    col_el.innerHTML = "";
    row_el.innerHTML = "";
    COL_LABELS.forEach(function (label) {
        const d = document.createElement("div");
        d.className = "col-label";
        d.textContent = label;
        col_el.appendChild(d);
    });
    ROW_LABELS.forEach(function (label) {
        const d = document.createElement("div");
        d.className = "row-label";
        d.textContent = label;
        row_el.appendChild(d);
    });
};

const build_grid = function (grid_el, on_click, on_hover_enter, on_hover_leave) {
    grid_el.innerHTML = "";
    for (let row = 0; row < Battleship.GRID_SIZE; row = row + 1) {
        for (let col = 0; col < Battleship.GRID_SIZE; col = col + 1) {
            const cell = document.createElement("button");
            cell.className = "cell";
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.setAttribute(
                "aria-label",
                ROW_LABELS[row] + COL_LABELS[col]
            );
            cell.setAttribute("role", "gridcell");
            if (on_click) {
                cell.addEventListener("click", function () {
                    on_click(row, col, cell);
                });
            }
            if (on_hover_enter) {
                cell.addEventListener("mouseenter", function () {
                    on_hover_enter(row, col);
                });
            }
            if (on_hover_leave) {
                cell.addEventListener("mouseleave", on_hover_leave);
            }
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
            grid_el.appendChild(cell);
        }
    }
};

const get_cell = function (grid_el, row, col) {
    return grid_el.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
    );
};

// --- placement UI 

const get_preview_cells = function () {
    const remaining = unplaced_ships();
    if (selected_ship_index === null || !remaining[selected_ship_index]) {
        return null;
    }
    return selected_ship_index;
};

const compute_placement_cells = function (row, col) {
    const remaining = unplaced_ships();
    if (selected_ship_index === null || !remaining[selected_ship_index]) {
        return null;
    }
    const ship = remaining[selected_ship_index];
    if (ship.shape === "xwing") {
        return Battleship.xwing_cells(row, col, xwing_rotation);
    }
    return Battleship.ship_cells(row, col, ship.size, orientation);
};

const clear_preview = function () {
    el("placement-grid").querySelectorAll(".preview,.preview-invalid").forEach(
        function (c) {
            c.classList.remove("preview", "preview-invalid");
        }
    );
};

const on_placement_hover = function (row, col) {
    clear_preview();
    const cells = compute_placement_cells(row, col);
    if (!cells) {
        return;
    }
    const valid = Battleship.can_place(cells, placement_board);
    cells.forEach(function (c) {
        const target = get_cell(el("placement-grid"), c[0], c[1]);
        if (target) {
            target.classList.add(valid ? "preview" : "preview-invalid");
        }
    });
};

const on_placement_click = function (row, col) {
    const cells = compute_placement_cells(row, col);
    if (!cells) {
        el("placement-status").textContent = "Select a ship from the list first.";
        return;
    }
    const remaining = unplaced_ships();
    const ship = remaining[selected_ship_index];
    const next = Battleship.place_ship(
        ship.name, ship.size, ship.shape, cells, placement_board
    );
    if (next === undefined) {
        el("placement-status").textContent = "Can't place there – try another spot.";
        return;
    }
    placement_board = next;
    selected_ship_index = null;
    refresh_placement_ui();
};

const refresh_placement_grid = function () {
    const occupied = Battleship.occupied_cells(placement_board);
    el("placement-grid").querySelectorAll(".cell").forEach(function (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        const is_ship = occupied.some((c) => c[0] === row && c[1] === col);
        cell.classList.toggle("ship", is_ship);
    });
};

const refresh_ship_list = function () {
    const list = el("ship-list");
    list.innerHTML = "";
    const placed = placed_names();
    const remaining = unplaced_ships();

    Battleship.ships.forEach(function (ship) {
        const li = document.createElement("li");
        li.setAttribute("tabindex", "0");

        const entry = document.createElement("div");
        entry.className = "ship-entry";

        const top = document.createElement("div");
        top.className = "ship-entry-top";

        const img = document.createElement("img");
        img.className = "ship-img";
        img.src = SHIP_IMAGES[ship.name] || "";
        img.alt = ship.name;

        const name_el = document.createElement("span");
        name_el.className = "ship-name";
        name_el.textContent = ship.name;

        top.appendChild(img);
        top.appendChild(name_el);

        const bar = document.createElement("div");
        bar.className = "health-bar";
        for (let i = 0; i < ship.size; i = i + 1) {
            const hc = document.createElement("div");
            hc.className = "health-cell";
            bar.appendChild(hc);
        }

        entry.appendChild(top);
        entry.appendChild(bar);
        li.appendChild(entry);

        if (placed.includes(ship.name)) {
            entry.classList.add("placed");
            entry.setAttribute("aria-label", ship.name + " placed");
        } else {
            const remaining_index = remaining.findIndex((s) => s.name === ship.name);
            entry.addEventListener("click", function () {
                selected_ship_index = remaining_index;
                refresh_ship_list();
            });
            li.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    entry.click();
                }
            });
            if (selected_ship_index === remaining_index) {
                entry.classList.add("active-ship");
                entry.setAttribute("aria-selected", "true");
            }
        }

        list.appendChild(li);
    });
};

const refresh_placement_ui = function () {
    refresh_placement_grid();
    refresh_ship_list();

    const remaining = unplaced_ships();
    el("btn-ready").disabled = remaining.length > 0;

    if (remaining.length === 0) {
        el("placement-status").textContent = "All ships placed! Press Ready.";
        selected_ship_index = null;
    } else if (selected_ship_index !== null && remaining[selected_ship_index]) {
        const ship = remaining[selected_ship_index];
        el("placement-status").textContent = (
            `Placing ${ship.name} – click the grid.`
        );
    } else {
        el("placement-status").textContent = "Select a ship from the list.";
    }

    const is_xwing_selected = (
        selected_ship_index !== null &&
        unplaced_ships()[selected_ship_index] &&
        unplaced_ships()[selected_ship_index].shape === "xwing"
    );

    el("orientation-label").textContent = is_xwing_selected
        ? `X-wing rotation: ${xwing_rotation + 1}/4`
        : (orientation === "horizontal" ? "Orientation: Horizontal →" : "Orientation: Vertical ↓");

    el("placement-grid-label").textContent = `${player_names[placement_player]}'s Board`;
    el("placement-title").textContent = `${player_names[placement_player]}: Place Your Fleet`;
};

// --- battle UI 
const refresh_enemy_fleet = function () {
    const defender = 1 - active_player;
    const board = boards[defender];
    const list = el("enemy-fleet-list");
    list.innerHTML = "";

    Battleship.ships.forEach(function (ship_def) {
        const placed_ship = board.fleet.find((s) => s.name === ship_def.name);
        const li = document.createElement("li");

        const entry = document.createElement("div");
        entry.className = "ship-entry";

        const top = document.createElement("div");
        top.className = "ship-entry-top";

        const img = document.createElement("img");
        img.className = "ship-img";
        img.src = SHIP_IMAGES[ship_def.name] || "";
        img.alt = ship_def.name;

        const name_el = document.createElement("span");
        name_el.className = "ship-name";
        name_el.textContent = ship_def.name;

        top.appendChild(img);
        top.appendChild(name_el);
        entry.appendChild(top);

        if (placed_ship) {
            const bar = document.createElement("div");
            bar.className = "health-bar";
            placed_ship.cells.forEach(function (cell) {
                const hc = document.createElement("div");
                hc.className = "health-cell";
                if (Battleship.already_shot(cell, board)) {
                    hc.classList.add(
                        Battleship.is_sunk(placed_ship, board)
                        ? "sunk-cell"
                        : "hit-cell"
                    );
                }
                bar.appendChild(hc);
            });
            entry.appendChild(bar);

            if (Battleship.is_sunk(placed_ship, board)) {
                entry.classList.add("sunk-ship");
                name_el.textContent += " – SUNK";
            }
        }

        li.appendChild(entry);
        list.appendChild(li);
    });
};

const refresh_enemy_grid = function (locked) {
    const defender = 1 - active_player;
    const board = boards[defender];

    el("enemy-grid").querySelectorAll(".cell").forEach(function (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        const coord = [row, col];
        cell.className = "cell";
        cell.textContent = "";
        cell.disabled = locked;

        if (Battleship.already_shot(coord, board)) {
            const hit = Battleship.is_hit(coord, board);
            if (hit) {
                const ship = board.fleet.find(
                    (s) => s.cells.some((c) => c[0] === row && c[1] === col)
                );
                if (ship && Battleship.is_sunk(ship, board)) {
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

        cell.setAttribute(
            "aria-label",
            ROW_LABELS[row] + COL_LABELS[col] + (
                cell.classList.contains("hit") ? " hit" :
                cell.classList.contains("miss") ? " miss" :
                cell.classList.contains("sunk") ? " sunk" : ""
            )
        );
    });
};

const refresh_own_grid = function () {
    const own_board = boards[active_player];

    el("own-grid").querySelectorAll(".cell").forEach(function (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        const coord = [row, col];
        cell.className = "cell";
        cell.textContent = "";
        cell.disabled = true;

        if (Battleship.is_hit(coord, own_board)) {
            cell.classList.add("ship");
        }
        if (Battleship.already_shot(coord, own_board)) {
            const hit = Battleship.is_hit(coord, own_board);
            if (hit) {
                const ship = own_board.fleet.find(
                    (s) => s.cells.some((c) => c[0] === row && c[1] === col)
                );
                cell.classList.add(
                    ship && Battleship.is_sunk(ship, own_board) ? "sunk" : "hit"
                );
                cell.textContent = ship && Battleship.is_sunk(ship, own_board)
                    ? "💥"
                    : "🔥";
            } else {
                cell.classList.add("miss");
                cell.textContent = "·";
            }
        }
    });
};

const refresh_battle_ui = function (locked) {
    refresh_enemy_grid(locked);
    refresh_own_grid();
    refresh_enemy_fleet();
    el("battle-title").textContent = `${player_names[active_player]}'s Turn`;
    el("enemy-grid-title").textContent = `${player_names[1 - active_player]}'s Waters`;
    el("own-grid-title").textContent = `${player_names[active_player]}'s Waters`;
    el("enemy-fleet-label").textContent = `${player_names[1 - active_player]}'s Fleet`;
};

// --- event wiring 

el("logo").src = Images.logo;

el("btn-start-placement").addEventListener("click", function () {
    player_names[0] = el("name-p1").value.trim() || "Player 1";
    player_names[1] = el("name-p2").value.trim() || "Player 2";
    boards = [Battleship.empty_board(), Battleship.empty_board()];
    placement_player = 0;
    start_placement();
});

el("btn-rotate").addEventListener("click", function () {
    const remaining = unplaced_ships();
    const ship = remaining[selected_ship_index];
    if (ship && ship.shape === "xwing") {
        xwing_rotation = (xwing_rotation + 1) % 4;
    } else {
        orientation = (orientation === "horizontal" ? "vertical" : "horizontal");
    }
    refresh_placement_ui();
});

el("btn-randomise").addEventListener("click", function () {
    placement_board = Battleship.random_board();
    selected_ship_index = null;
    refresh_placement_ui();
});

el("btn-ready").addEventListener("click", function () {
    boards[placement_player] = placement_board;
    if (placement_player === 0) {
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
        el("pass-title").textContent = "Ready for Battle!";
        el("pass-message").textContent = (
            `Both fleets are placed. Pass to ${player_names[0]} to fire first.`
        );
        show_screen("pass-screen");
        active_player = 0;
        el("btn-pass").onclick = function () {
            start_battle();
        };
    }
});

el("btn-continue-turn").addEventListener("click", function () {
    if (Battleship.is_defeated(boards[1 - active_player])) {
        el("result-winner").textContent = (
            `${player_names[active_player]} wins! The galaxy is saved. 🏆`
        );
        show_screen("result-screen");
        return;
    }
    const next_player = 1 - active_player;
    el("pass-title").textContent = "Pass the Device";
    el("pass-message").textContent = (
        `${player_names[active_player]}'s turn is done. ` +
        `Cover the screen and pass to ${player_names[next_player]}.`
    );
    show_screen("pass-screen");
    el("btn-pass").onclick = function () {
        active_player = next_player;
        el("shot-result").textContent = "";
        el("btn-continue-turn").style.display = "none";
        waiting_for_continue = false;
        refresh_battle_ui(false);
        show_screen("battle-screen");
    };
});

el("btn-play-again").addEventListener("click", function () {
    show_screen("name-screen");
});

// --- screen starters 

const start_placement = function () {
    placement_board = Battleship.empty_board();
    selected_ship_index = null;
    orientation = "horizontal";
    xwing_rotation = 0;

    build_labels(
        el("placement-col-labels"),
        el("placement-row-labels")
    );
    build_grid(
        el("placement-grid"),
        on_placement_click,
        on_placement_hover,
        clear_preview
    );
    refresh_placement_ui();
    show_screen("placement-screen");
};

const start_battle = function () {
    build_labels(el("enemy-col-labels"), el("enemy-row-labels"));
    build_labels(el("own-col-labels"), el("own-row-labels"));

    build_grid(el("enemy-grid"), function (row, col) {
        if (waiting_for_continue) {
            return;
        }
        const defender = 1 - active_player;
        const next_board = Battleship.fire([row, col], boards[defender]);
        if (next_board === undefined) {
            return;
        }
        boards[defender] = next_board;

        const hit = Battleship.is_hit([row, col], boards[defender]);
        const ship = hit
            ? boards[defender].fleet.find(
                (s) => s.cells.some((c) => c[0] === row && c[1] === col)
            )
            : null;
        const sunk = ship && Battleship.is_sunk(ship, boards[defender]);

        if (sunk) {
            el("shot-result").style.color = "#e53935";
            el("shot-result").textContent = `💥 ${ship.name} SUNK!`;
        } else if (hit) {
            el("shot-result").style.color = "#FFE81A";
            el("shot-result").textContent = "🔥 HIT!";
        } else {
            el("shot-result").style.color = "#546e7a";
            el("shot-result").textContent = "· Miss.";
        }

        waiting_for_continue = true;
        refresh_battle_ui(true);

        const just_fired = get_cell(el("enemy-grid"), row, col);
        if (just_fired) {
            just_fired.classList.add("just-fired");
        }

        el("btn-continue-turn").style.display = "inline-block";
    }, null, null);

    build_grid(el("own-grid"), null, null, null);
    el("own-grid").querySelectorAll(".cell").forEach((c) => { c.disabled = true; });

    waiting_for_continue = false;
    el("btn-continue-turn").style.display = "none";
    el("shot-result").textContent = "";
    refresh_battle_ui(false);
    show_screen("battle-screen");
};
