/*jslint browser */
import Battleship from "./Battleship.js";
import Images from "./images.js";

// ── constants ────────────────────────────────────────────────────────────────
const ROW_LABELS = ["A","B","C","D","E","F","G","H","I","J"];
const COL_LABELS = ["1","2","3","4","5","6","7","8","9","10"];

const SHIP_IMAGES = {
    "TIE Fighter": Images.tie_fighter,
    "Jedi Starfighter": Images.jedi_starfighter,
    "Slave I": Images.slave1,
    "X-wing": Images.xwing,
    "Millennium Falcon": Images.millennium_falcon
};

// bounding box of each ship shape for footprint display
// {cols, rows} = grid dimensions; offsets = same as Battleship module
const SHIP_FOOTPRINTS = {
    "TIE Fighter":      {cols:2, rows:1, get_cells: (r)=>[[0,0],[0,1]]},
    "Jedi Starfighter": {cols:2, rows:1, get_cells: (r)=>[[0,0],[0,1]]},
    "Slave I":          {cols:3, rows:1, get_cells: (r)=>[[0,0],[0,1],[0,2]]},
    "X-wing":           {cols:3, rows:3, get_cells: (r)=>Battleship.XWING_ROTATIONS[r]},
    "Millennium Falcon":{cols:3, rows:2, get_cells: (r)=>Battleship.FALCON_ROTATIONS[r]}
};

// ── state ────────────────────────────────────────────────────────────────────
let player_names      = ["Player 1", "Player 2"];
let boards            = [Battleship.empty_board(), Battleship.empty_board()];
let placement_player  = 0;
let placement_board   = Battleship.empty_board();
let selected_idx      = null;   // index in unplaced_ships()
let orientation       = "horizontal";
let xwing_rotation    = 0;
let falcon_rotation   = 0;
let active_player     = 0;
let waiting           = false;  // waiting for Continue after a shot

// ── helpers ──────────────────────────────────────────────────────────────────
const el = (id) => document.getElementById(id);

const show_screen = function (id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    el(id).classList.add("active");
};

const placed_names  = () => placement_board.fleet.map((s) => s.name);
const unplaced      = () => Battleship.ships.filter((s) => !placed_names().includes(s.name));

// ── grid builders ────────────────────────────────────────────────────────────
const build_labels = function (col_el, row_el) {
    col_el.innerHTML = "";
    row_el.innerHTML = "";
    COL_LABELS.forEach(function (lbl) {
        const d = document.createElement("div");
        d.className = "col-label";
        d.textContent = lbl;
        col_el.appendChild(d);
    });
    ROW_LABELS.forEach(function (lbl) {
        const d = document.createElement("div");
        d.className = "row-label";
        d.textContent = lbl;
        row_el.appendChild(d);
    });
};

const build_grid = function (grid_el, on_click, on_enter, on_leave) {
    grid_el.innerHTML = "";
    for (let row = 0; row < 10; row = row + 1) {
        for (let col = 0; col < 10; col = col + 1) {
            const cell = document.createElement("button");
            cell.className = "cell";
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.setAttribute("role", "gridcell");
            cell.setAttribute("aria-label", ROW_LABELS[row] + COL_LABELS[col]);
            if (on_click)  { cell.addEventListener("click",      () => on_click(row, col, cell)); }
            if (on_enter)  { cell.addEventListener("mouseenter", () => on_enter(row, col)); }
            if (on_leave)  { cell.addEventListener("mouseleave", on_leave); }
            cell.addEventListener("keydown", function (ev) {
                if (ev.key === "Enter" || ev.key === " ") { cell.click(); }
                if (ev.key === "ArrowRight" && cell.nextSibling)     { cell.nextSibling.focus(); }
                if (ev.key === "ArrowLeft"  && cell.previousSibling) { cell.previousSibling.focus(); }
            });
            grid_el.appendChild(cell);
        }
    }
};

const get_cell = (grid_el, row, col) =>
    grid_el.querySelector(`[data-row="${row}"][data-col="${col}"]`);

// ── footprint widget ──────────────────────────────────────────────────────────
const make_footprint = function (ship_def, placed_ship, board) {
    const fp_info = SHIP_FOOTPRINTS[ship_def.name];
    const container = document.createElement("div");
    container.className = "footprint";
    container.style.gridTemplateColumns = `repeat(${fp_info.cols}, 10px)`;
    container.style.gridTemplateRows    = `repeat(${fp_info.rows}, 10px)`;

    // build a set of occupied offsets
    const rotation = 0; // default preview rotation
    const offsets = fp_info.get_cells(rotation);
    const offset_set = new Set(offsets.map(([r, c]) => `${r},${c}`));

    for (let r = 0; r < fp_info.rows; r = r + 1) {
        for (let c = 0; c < fp_info.cols; c = c + 1) {
            const fp = document.createElement("div");
            fp.className = "fp-cell";
            if (offset_set.has(`${r},${c}`)) {
                fp.classList.add("fp-ship");
                // if placed, colour by hit status
                if (placed_ship && board) {
                    // find actual cell in the placed ship's offset space
                    const actual_offset = offsets.find(([or, oc]) => or === r && oc === c);
                    if (actual_offset) {
                        const origin_row = placed_ship.cells[0][0];
                        const origin_col = placed_ship.cells[0][1];
                        const actual = [origin_row + actual_offset[0], origin_col + actual_offset[1]];
                        if (Battleship.already_shot(actual, board)) {
                            fp.classList.remove("fp-ship");
                            fp.classList.add(
                                Battleship.is_sunk(placed_ship, board) ? "fp-sunk" : "fp-hit"
                            );
                        }
                    }
                }
            }
            container.appendChild(fp);
        }
    }
    return container;
};

// ── placement ─────────────────────────────────────────────────────────────────
const get_current_rotation = function () {
    const ship = unplaced()[selected_idx];
    if (!ship) { return 0; }
    if (ship.shape === "xwing")  { return xwing_rotation; }
    if (ship.shape === "falcon") { return falcon_rotation; }
    return 0;
};

const compute_cells = function (row, col) {
    const remaining = unplaced();
    if (selected_idx === null || !remaining[selected_idx]) { return null; }
    const ship = remaining[selected_idx];
    if (ship.shape === "xwing")  { return Battleship.xwing_cells(row, col, xwing_rotation); }
    if (ship.shape === "falcon") { return Battleship.falcon_cells(row, col, falcon_rotation); }
    return Battleship.ship_cells(row, col, ship.size, orientation);
};

const clear_preview = function () {
    el("placement-grid").querySelectorAll(".preview,.preview-invalid").forEach(function (c) {
        c.classList.remove("preview","preview-invalid");
    });
};

const on_hover = function (row, col) {
    clear_preview();
    const cells = compute_cells(row, col);
    if (!cells) { return; }
    const valid = Battleship.can_place(cells, placement_board);
    cells.forEach(function (c) {
        const t = get_cell(el("placement-grid"), c[0], c[1]);
        if (t) { t.classList.add(valid ? "preview" : "preview-invalid"); }
    });
};

const on_place_click = function (row, col) {
    const cells = compute_cells(row, col);
    if (!cells) {
        el("placement-status").textContent = "Select a ship from the list first.";
        return;
    }
    const ship = unplaced()[selected_idx];
    const next = Battleship.place_ship(ship.name, ship.size, ship.shape, cells, placement_board);
    if (next === undefined) {
        el("placement-status").textContent = "Can't place there – try another spot.";
        return;
    }
    placement_board = next;
    selected_idx = null;
    refresh_placement();
};

const refresh_placement_grid = function () {
    const occupied = Battleship.occupied_cells(placement_board);
    el("placement-grid").querySelectorAll(".cell").forEach(function (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        cell.classList.toggle("ship", occupied.some((c) => c[0] === row && c[1] === col));
    });
};

const refresh_ship_list = function (list_el, for_placement, board_for_status) {
    list_el.innerHTML = "";
    const placed = placed_names();
    const remaining = unplaced();

    Battleship.ships.forEach(function (ship_def) {
        const is_placed = placed.includes(ship_def.name);
        const placed_ship = board_for_status
            ? board_for_status.fleet.find((s) => s.name === ship_def.name)
            : null;

        const li = document.createElement("li");
        const entry = document.createElement("div");
        entry.className = "ship-entry";
        entry.setAttribute("tabindex", "0");

        // top row: image + name
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

        // footprint
        entry.appendChild(make_footprint(ship_def, placed_ship, board_for_status));

        if (for_placement) {
            if (is_placed) {
                entry.classList.add("placed");
            } else {
                const rem_idx = remaining.findIndex((s) => s.name === ship_def.name);
                entry.addEventListener("click", function () {
                    selected_idx = rem_idx;
                    refresh_ship_list(list_el, true, null);
                });
                entry.addEventListener("keydown", function (ev) {
                    if (ev.key === "Enter" || ev.key === " ") { entry.click(); }
                });
                if (selected_idx === rem_idx) {
                    entry.classList.add("active-ship");
                }
            }
        } else {
            // battle sidebar
            if (placed_ship && Battleship.is_sunk(placed_ship, board_for_status)) {
                entry.classList.add("sunk-ship");
                name_el.textContent += " – SUNK";
            }
        }

        li.appendChild(entry);
        list_el.appendChild(li);
    });
};

const refresh_placement = function () {
    refresh_placement_grid();
    refresh_ship_list(el("ship-list"), true, null);

    const remaining = unplaced();
    el("btn-ready").disabled = remaining.length > 0;

    if (remaining.length === 0) {
        el("placement-status").textContent = "All ships placed! Press Ready.";
        selected_idx = null;
    } else if (selected_idx !== null && remaining[selected_idx]) {
        const ship = remaining[selected_idx];
        el("placement-status").textContent = `Placing ${ship.name} – click the grid.`;
    } else {
        el("placement-status").textContent = "Select a ship from the list.";
    }

    const sel_ship = selected_idx !== null ? unplaced()[selected_idx] : null;
    if (sel_ship && sel_ship.shape === "xwing") {
        el("orientation-label").textContent = `X-wing rotation: ${xwing_rotation + 1}/4`;
    } else if (sel_ship && sel_ship.shape === "falcon") {
        el("orientation-label").textContent = `Falcon rotation: ${falcon_rotation + 1}/4`;
    } else {
        el("orientation-label").textContent =
            orientation === "horizontal" ? "Orientation: Horizontal →" : "Orientation: Vertical ↓";
    }

    el("placement-grid-label").textContent = `${player_names[placement_player]}'s Board`;
    el("placement-title").textContent = `${player_names[placement_player]}: Place Your Fleet`;
};

// ── battle ────────────────────────────────────────────────────────────────────
const paint_cell = function (cell, row, col, board, show_ships) {
    const coord = [row, col];
    cell.className = "cell";
    cell.textContent = "";
    // remove any old overlays
    cell.querySelectorAll(".ship-overlay").forEach((n) => n.remove());

    const shot = Battleship.already_shot(coord, board);
    const hit  = Battleship.is_hit(coord, board);

    if (show_ships && hit && !shot) {
        cell.classList.add("ship");
        // overlay ship image
        const ship = board.fleet.find((s) => s.cells.some((c) => c[0]===row && c[1]===col));
        if (ship) {
            const ov = document.createElement("img");
            ov.className = "ship-overlay";
            ov.src = SHIP_IMAGES[ship.name] || "";
            ov.alt = ship.name;
            cell.appendChild(ov);
        }
    }

    if (shot) {
        if (hit) {
            const ship = board.fleet.find((s) => s.cells.some((c) => c[0]===row && c[1]===col));
            const sunk = ship && Battleship.is_sunk(ship, board);
            cell.classList.add(sunk ? "sunk" : "hit");
            if (show_ships && ship) {
                const ov = document.createElement("img");
                ov.className = "ship-overlay";
                ov.src = SHIP_IMAGES[ship.name] || "";
                ov.alt = ship.name;
                ov.style.opacity = sunk ? "0.2" : "0.35";
                cell.appendChild(ov);
            }
        } else {
            cell.classList.add("miss");
        }
        cell.disabled = true;
    }
};

const refresh_enemy_grid = function (locked) {
    const defender = 1 - active_player;
    const board = boards[defender];
    el("enemy-grid").querySelectorAll(".cell").forEach(function (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        paint_cell(cell, row, col, board, false);
        if (locked && !cell.disabled) { cell.disabled = true; }
    });
};

const refresh_own_grid = function () {
    const board = boards[active_player];
    el("own-grid").querySelectorAll(".cell").forEach(function (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        paint_cell(cell, row, col, board, true);
        cell.disabled = true;
    });
};

const refresh_battle = function (locked) {
    refresh_enemy_grid(locked);
    refresh_own_grid();
    refresh_ship_list(el("enemy-fleet-list"), false, boards[1 - active_player]);
    el("battle-title").textContent      = `${player_names[active_player]}'s Turn`;
    el("enemy-grid-title").textContent  = `${player_names[1 - active_player]}'s Waters`;
    el("own-grid-title").textContent    = `${player_names[active_player]}'s Waters`;
    el("enemy-fleet-label").textContent = `${player_names[1 - active_player]}'s Fleet`;
};

// ── events ────────────────────────────────────────────────────────────────────
el("logo").src = Images.logo;

el("btn-start-placement").addEventListener("click", function () {
    player_names[0] = el("name-p1").value.trim() || "Player 1";
    player_names[1] = el("name-p2").value.trim() || "Player 2";
    boards = [Battleship.empty_board(), Battleship.empty_board()];
    placement_player = 0;
    start_placement();
});

el("btn-rotate").addEventListener("click", function () {
    const sel = unplaced()[selected_idx];
    if (sel && sel.shape === "xwing") {
        xwing_rotation = (xwing_rotation + 1) % 4;
    } else if (sel && sel.shape === "falcon") {
        falcon_rotation = (falcon_rotation + 1) % 4;
    } else {
        orientation = orientation === "horizontal" ? "vertical" : "horizontal";
    }
    refresh_placement();
});

el("btn-randomise").addEventListener("click", function () {
    placement_board = Battleship.random_board();
    selected_idx = null;
    refresh_placement();
});

el("btn-ready").addEventListener("click", function () {
    boards[placement_player] = placement_board;
    if (placement_player === 0) {
        el("pass-title").textContent   = "Hand Over the Device";
        el("pass-message").textContent = `${player_names[0]} is done. Cover the screen and pass to ${player_names[1]}.`;
        show_screen("pass-screen");
        el("btn-pass").onclick = function () { placement_player = 1; start_placement(); };
    } else {
        el("pass-title").textContent   = "Ready for Battle!";
        el("pass-message").textContent = `Both fleets placed. Pass to ${player_names[0]} to fire first.`;
        show_screen("pass-screen");
        active_player = 0;
        el("btn-pass").onclick = function () { start_battle(); };
    }
});

el("btn-continue-turn").addEventListener("click", function () {
    if (Battleship.is_defeated(boards[1 - active_player])) {
        el("result-winner").textContent = `${player_names[active_player]} wins! The galaxy is saved. 🏆`;
        show_screen("result-screen");
        return;
    }
    const next = 1 - active_player;
    el("pass-title").textContent   = "Pass the Device";
    el("pass-message").textContent = `${player_names[active_player]}'s turn done. Pass to ${player_names[next]}.`;
    show_screen("pass-screen");
    el("btn-pass").onclick = function () {
        active_player = next;
        el("shot-result").textContent = "";
        el("btn-continue-turn").style.display = "none";
        waiting = false;
        refresh_battle(false);
        show_screen("battle-screen");
    };
});

el("btn-play-again").addEventListener("click", function () {
    show_screen("name-screen");
});

// --- screen starters 
const start_placement = function () {
    placement_board = Battleship.empty_board();
    selected_idx    = null;
    orientation     = "horizontal";
    xwing_rotation  = 0;
    falcon_rotation = 0;
    build_labels(el("placement-col-labels"), el("placement-row-labels"));
    build_grid(el("placement-grid"), on_place_click, on_hover, clear_preview);
    refresh_placement();
    show_screen("placement-screen");
};

const start_battle = function () {
    build_labels(el("enemy-col-labels"), el("enemy-row-labels"));
    build_labels(el("own-col-labels"),   el("own-row-labels"));

    build_grid(el("enemy-grid"), function (row, col, cell) {
        if (waiting) { return; }
        const defender  = 1 - active_player;
        const next_board = Battleship.fire([row, col], boards[defender]);
        if (next_board === undefined) { return; }
        boards[defender] = next_board;

        const hit  = Battleship.is_hit([row, col], boards[defender]);
        const ship = hit
            ? boards[defender].fleet.find((s) => s.cells.some((c) => c[0]===row && c[1]===col))
            : null;
        const sunk = ship && Battleship.is_sunk(ship, boards[defender]);

        if (sunk) {
            el("shot-result").style.color = "#cc2200";
            el("shot-result").textContent = `${ship.name} DESTROYED`;
        } else if (hit) {
            el("shot-result").style.color = "#FFE81A";
            el("shot-result").textContent = "HIT";
        } else {
            el("shot-result").style.color = "#00d4ff";
            el("shot-result").textContent = "MISS";
        }

        waiting = true;
        refresh_battle(true);
        const fired = get_cell(el("enemy-grid"), row, col);
        if (fired) { fired.classList.add("just-fired"); }
        el("btn-continue-turn").style.display = "inline-block";
    }, null, null);

    build_grid(el("own-grid"), null, null, null);
    el("own-grid").querySelectorAll(".cell").forEach((c) => { c.disabled = true; });

    waiting = false;
    el("btn-continue-turn").style.display = "none";
    el("shot-result").textContent = "";
    refresh_battle(false);
    show_screen("battle-screen");
};
