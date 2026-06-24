/*jslint browser */
import Battleship from "./Battleship.js";
import Images from "./images.js";

// ── constants ────────────────────────────────────────────────────────────────
const ROW_LABELS = ["A","B","C","D","E","F","G","H","I","J"];
const COL_LABELS = ["1","2","3","4","5","6","7","8","9","10"];
const CELL_SIZE  = 38; // must match --cell-size in CSS

const SHIP_IMAGES = {
    "TIE Fighter":       Images.tie_fighter,
    "Jedi Starfighter":  Images.jedi_starfighter,
    "Slave I":           Images.slave1,
    "X-wing":            Images.xwing,
    "Millennium Falcon": Images.millennium_falcon
};

// Footprint info: bounding box dimensions and which cells are filled (as [row,col] offsets)
const FOOTPRINT = {
    "TIE Fighter":       {cols:2, rows:1, offsets:[[0,0],[0,1]]},
    "Jedi Starfighter":  {cols:2, rows:1, offsets:[[0,0],[0,1]]},
    "Slave I":           {cols:3, rows:1, offsets:[[0,0],[0,1],[0,2]]},
    "X-wing":            {cols:3, rows:3, offsets: Battleship.XWING_ROTATIONS[0].map((o) => [o[0],o[1]])},
    "Millennium Falcon": {cols:3, rows:2, offsets: Battleship.FALCON_ROTATIONS[0].map((o) => [o[0],o[1]])}
};

// ── state ────────────────────────────────────────────────────────────────────
let player_names      = ["Player 1", "Player 2"];
let boards            = [Battleship.empty_board(), Battleship.empty_board()];
let placement_player  = 0;
let placement_board   = Battleship.empty_board();
let selected_idx      = null;
let orientation       = "horizontal";
let xwing_rotation    = 0;
let falcon_rotation   = 0;
let active_player     = 0;
let waiting           = false;

// ── helpers ──────────────────────────────────────────────────────────────────
const el    = (id) => document.getElementById(id);
const placed_names = () => placement_board.fleet.map((s) => s.name);
const unplaced     = () => Battleship.ships.filter((s) => !placed_names().includes(s.name));

const show_screen = function (id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    el(id).classList.add("active");
};

// ── grid builders ─────────────────────────────────────────────────────────────
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
            if (on_click)  { cell.addEventListener("click",      () => on_click(row, col)); }
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

// ── footprint sidebar widget ──────────────────────────────────────────────────
const make_footprint = function (ship_def, placed_ship, board) {
    const fp = FOOTPRINT[ship_def.name];
    const filled = new Set(fp.offsets.map(([r, c]) => `${r},${c}`));
    const wrap = document.createElement("div");
    wrap.className = "footprint";
    wrap.style.gridTemplateColumns = `repeat(${fp.cols}, 10px)`;
    wrap.style.gridTemplateRows    = `repeat(${fp.rows}, 10px)`;

    for (let r = 0; r < fp.rows; r = r + 1) {
        for (let c = 0; c < fp.cols; c = c + 1) {
            const fc = document.createElement("div");
            fc.className = "fp-cell";
            if (filled.has(`${r},${c}`)) {
                fc.classList.add("fp-ship");
                // colour by hit status when in battle
                if (placed_ship && board) {
                    const cell_idx = fp.offsets.findIndex(([or, oc]) => or === r && oc === c);
                    if (cell_idx >= 0) {
                        const actual = placed_ship.cells[cell_idx];
                        if (actual && Battleship.already_shot(actual, board)) {
                            fc.classList.remove("fp-ship");
                            fc.classList.add(
                                Battleship.is_sunk(placed_ship, board) ? "fp-sunk" : "fp-hit"
                            );
                        }
                    }
                }
            }
            wrap.appendChild(fc);
        }
    }
    return wrap;
};

// ── ship images spanning the footprint on the own grid ────────────────────────
// After painting the own grid, overlay one <img> per ship covering its bounding box.
const overlay_ship_images = function (grid_el, board) {
    // remove existing overlays
    grid_el.querySelectorAll(".ship-span-img").forEach((n) => n.remove());

    board.fleet.forEach(function (ship) {
        const rows = ship.cells.map((c) => c[0]);
        const cols = ship.cells.map((c) => c[1]);
        const min_row = Math.min(...rows);
        const min_col = Math.min(...cols);
        const max_row = Math.max(...rows);
        const max_col = Math.max(...cols);

        const span_rows = max_row - min_row + 1;
        const span_cols = max_col - min_col + 1;

        // anchor image to the top-left cell of the ship's bounding box
        const anchor = get_cell(grid_el, min_row, min_col);
        if (!anchor) { return; }

        const img = document.createElement("img");
        img.className = "ship-span-img";
        img.src = SHIP_IMAGES[ship.name] || "";
        img.alt = ship.name;

        // position relative to the grid element
        const grid_rect  = grid_el.getBoundingClientRect();
        const anchor_rect = anchor.getBoundingClientRect();
        const left = anchor_rect.left - grid_rect.left;
        const top  = anchor_rect.top  - grid_rect.top;

        img.style.left   = left + "px";
        img.style.top    = top  + "px";
        img.style.width  = (span_cols * CELL_SIZE) + "px";
        img.style.height = (span_rows * CELL_SIZE) + "px";

        // make grid_el the positioning parent
        grid_el.style.position = "relative";
        grid_el.appendChild(img);
    });
};

// ── placement ─────────────────────────────────────────────────────────────────
const compute_placement_cells = function (row, col) {
    const remaining = unplaced();
    if (selected_idx === null || !remaining[selected_idx]) { return null; }
    const ship = remaining[selected_idx];
    if (ship.shape === "xwing")  { return Battleship.xwing_cells(row, col, xwing_rotation); }
    if (ship.shape === "falcon") { return Battleship.falcon_cells(row, col, falcon_rotation); }
    return Battleship.ship_cells(row, col, ship.size, orientation);
};

const clear_preview = function () {
    el("placement-grid").querySelectorAll(".preview,.preview-invalid").forEach(function (c) {
        c.classList.remove("preview", "preview-invalid");
    });
};

const on_placement_hover = function (row, col) {
    clear_preview();
    const cells = compute_placement_cells(row, col);
    if (!cells) { return; }
    const valid = Battleship.can_place(cells, placement_board);
    cells.forEach(function (c) {
        const t = get_cell(el("placement-grid"), c[0], c[1]);
        if (t) { t.classList.add(valid ? "preview" : "preview-invalid"); }
    });
};

const on_placement_click = function (row, col) {
    const cells = compute_placement_cells(row, col);
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
        // plain ship colour only — no image overlays during placement
        cell.className = "cell" + (
            occupied.some((c) => c[0] === row && c[1] === col) ? " ship" : ""
        );
    });
};

const refresh_ship_list = function (list_el, for_placement, battle_board) {
    list_el.innerHTML = "";
    const placed = placed_names();
    const remaining = unplaced();

    Battleship.ships.forEach(function (ship_def) {
        const is_placed = placed.includes(ship_def.name);
        const placed_ship = battle_board
            ? battle_board.fleet.find((s) => s.name === ship_def.name)
            : null;

        const li    = document.createElement("li");
        const entry = document.createElement("div");
        entry.className = "ship-entry";
        entry.setAttribute("tabindex", "0");

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
        entry.appendChild(make_footprint(ship_def, placed_ship, battle_board));

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
                if (selected_idx === rem_idx) { entry.classList.add("active-ship"); }
            }
        } else {
            // battle mode: mark sunk ships
            if (placed_ship && Battleship.is_sunk(placed_ship, battle_board)) {
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
        el("placement-status").textContent = `Placing ${remaining[selected_idx].name} – click the grid.`;
    } else {
        el("placement-status").textContent = "Select a ship from the list.";
    }

    const sel = selected_idx !== null ? unplaced()[selected_idx] : null;
    if (sel && sel.shape === "xwing") {
        el("orientation-label").textContent = `X-wing rotation: ${xwing_rotation + 1} / 4`;
    } else if (sel && sel.shape === "falcon") {
        el("orientation-label").textContent = `Falcon rotation: ${falcon_rotation + 1} / 4`;
    } else {
        el("orientation-label").textContent =
            orientation === "horizontal" ? "Orientation: Horizontal →" : "Orientation: Vertical ↓";
    }

    el("placement-grid-label").textContent = `${player_names[placement_player]}'s Board`;
    el("placement-title").textContent = `${player_names[placement_player]}: Place Your Fleet`;
};

// ── battle grid painting ──────────────────────────────────────────────────────
const paint_enemy_grid = function (locked) {
    const defender = 1 - active_player;
    const board    = boards[defender];
    el("enemy-grid").querySelectorAll(".cell").forEach(function (cell) {
        const row   = parseInt(cell.dataset.row, 10);
        const col   = parseInt(cell.dataset.col, 10);
        const coord = [row, col];
        cell.className = "cell";
        cell.disabled  = locked;

        if (Battleship.already_shot(coord, board)) {
            cell.disabled = true;
            if (Battleship.is_hit(coord, board)) {
                const ship = board.fleet.find(
                    (s) => s.cells.some((c) => c[0] === row && c[1] === col)
                );
                cell.classList.add(
                    ship && Battleship.is_sunk(ship, board) ? "sunk" : "hit"
                );
            } else {
                cell.classList.add("miss");
            }
        }
        cell.setAttribute("aria-label",
            ROW_LABELS[row] + COL_LABELS[col] + (
                cell.classList.contains("hit")  ? " hit"  :
                cell.classList.contains("miss") ? " miss" :
                cell.classList.contains("sunk") ? " sunk" : ""
            )
        );
    });
};

const paint_own_grid = function () {
    const board = boards[active_player];
    const grid  = el("own-grid");

    grid.querySelectorAll(".cell").forEach(function (cell) {
        const row   = parseInt(cell.dataset.row, 10);
        const col   = parseInt(cell.dataset.col, 10);
        const coord = [row, col];
        cell.className = "cell";
        cell.disabled  = true;

        const on_ship = Battleship.is_hit(coord, board);
        if (on_ship) { cell.classList.add("ship"); }

        if (Battleship.already_shot(coord, board)) {
            if (on_ship) {
                const ship = board.fleet.find(
                    (s) => s.cells.some((c) => c[0] === row && c[1] === col)
                );
                cell.classList.add(
                    ship && Battleship.is_sunk(ship, board) ? "sunk" : "hit"
                );
            } else {
                cell.classList.add("miss");
            }
        }
    });

    // overlay one image per ship spanning its full footprint
    // use requestAnimationFrame so DOM has laid out before we read getBoundingClientRect
    requestAnimationFrame(function () {
        overlay_ship_images(grid, board);
    });
};

const refresh_battle = function (locked) {
    paint_enemy_grid(locked);
    paint_own_grid();
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
    const sel = selected_idx !== null ? unplaced()[selected_idx] : null;
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

// ── screen starters ───────────────────────────────────────────────────────────
const start_placement = function () {
    placement_board = Battleship.empty_board();
    selected_idx    = null;
    orientation     = "horizontal";
    xwing_rotation  = 0;
    falcon_rotation = 0;
    build_labels(el("placement-col-labels"), el("placement-row-labels"));
    build_grid(el("placement-grid"), on_placement_click, on_placement_hover, clear_preview);
    refresh_placement();
    show_screen("placement-screen");
};

const start_battle = function () {
    build_labels(el("enemy-col-labels"), el("enemy-row-labels"));
    build_labels(el("own-col-labels"),   el("own-row-labels"));

    // build enemy grid with click handler
    build_grid(el("enemy-grid"), function (row, col) {
        if (waiting) { return; }

        const defender   = 1 - active_player;
        const next_board = Battleship.fire([row, col], boards[defender]);
        if (next_board === undefined) { return; }
        boards[defender] = next_board;

        const hit  = Battleship.is_hit([row, col], boards[defender]);
        const ship = hit
            ? boards[defender].fleet.find((s) => s.cells.some((c) => c[0] === row && c[1] === col))
            : null;
        const sunk = ship && Battleship.is_sunk(ship, boards[defender]);

        if (sunk) {
            el("shot-result").style.color   = "#cc2200";
            el("shot-result").textContent   = `${ship.name} DESTROYED`;
        } else if (hit) {
            el("shot-result").style.color   = "#FFE81A";
            el("shot-result").textContent   = "HIT";
        } else {
            el("shot-result").style.color   = "#00d4ff";
            el("shot-result").textContent   = "MISS";
        }

        waiting = true;
        refresh_battle(true);

        const fired = get_cell(el("enemy-grid"), row, col);
        if (fired) { fired.classList.add("just-fired"); }
        el("btn-continue-turn").style.display = "inline-block";
    }, null, null);

    // own grid: no click handler, all cells disabled
    build_grid(el("own-grid"), null, null, null);
    el("own-grid").querySelectorAll(".cell").forEach((c) => { c.disabled = true; });

    waiting = false;
    el("btn-continue-turn").style.display = "none";
    el("shot-result").textContent = "";
    refresh_battle(false);
    show_screen("battle-screen");
};
