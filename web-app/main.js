/*jslint browser */
import Battleship from "./Battleship.js";
import Images from "./images.js";
import Avatars from "./avatars.js";

// ── constants ────────────────────────────────────────────────────────────────
const ROW_LABELS = ["A","B","C","D","E","F","G","H","I","J"];
const COL_LABELS = ["1","2","3","4","5","6","7","8","9","10"];
const CELL_SIZE  = 44; // must match --cell-size in CSS

const SHIP_IMAGES = {
    "TIE Fighter":       Images.tie_fighter,
    "Jedi Starfighter":  Images.jedi_starfighter,
    "Slave I":           Images.slave1,
    "X-wing":            Images.xwing,
    "Millennium Falcon": Images.millennium_falcon
};


const SHIP_COLORS = {
    "TIE Fighter":       "#00cfff",
    "Jedi Starfighter":  "#ff4444",
    "Slave I":           "#44ff88",
    "X-wing":            "#ffaa00",
    "Millennium Falcon": "#cc44ff"
};

const ship_css_class = function (name) {
    return "ship-" + name.toLowerCase().replace(/ /g, "-");
};

// Avatar options for player selection
const AVATARS = [
    {"key": "luke",             "label": "Luke Skywalker"},
    {"key": "vader",            "label": "Darth Vader"},
    {"key": "yoda",             "label": "Yoda"},
    {"key": "obi_wan",          "label": "Obi-Wan Kenobi"},
    {"key": "darth_maul",       "label": "Darth Maul"},
    {"key": "leia",             "label": "Princess Leia"},
    {"key": "chewbacca",        "label": "Chewbacca"},
    {"key": "r2d2",             "label": "R2-D2"},
    {"key": "c3po",             "label": "C-3PO"},
    {"key": "mace_windu",       "label": "Mace Windu"},
    {"key": "boba_fett",        "label": "Boba Fett"},
    {"key": "stormtrooper",     "label": "Stormtrooper"},
    {"key": "general_grievous", "label": "General Grievous"},
    {"key": "lando",            "label": "Lando Calrissian"},
    {"key": "greedo",           "label": "Greedo"},
    {"key": "jar_jar",          "label": "Jar Jar Binks"},
    {"key": "emperor",          "label": "Emperor Palpatine"},
    {"key": "kit_fisto",        "label": "Kit Fisto"},
    {"key": "watto",            "label": "Watto"},
    {"key": "battle_droid",     "label": "Battle Droid"}
];

// Rotation angle (degrees) to apply to ship image on own grid
// line ships: 0 = horizontal, 90 = vertical
// xwing rotations 0,1 are vertical-stem, 2,3 are horizontal-stem
// falcon rotations 0,2 are landscape, 1,3 are portrait
// Each image has a "natural" orientation (the direction the ship faces in the file).
// portrait_images face UP naturally, so rotate 90 when placed horizontally.
// landscape_images face RIGHT naturally, so rotate 90 when placed vertically.
const PORTRAIT_IMAGES = {"TIE Fighter": true};

const get_ship_rotation = function (ship) {
    const rows = ship.cells.map((c) => c[0]);
    const cols = ship.cells.map((c) => c[1]);
    const row_span = Math.max(...rows) - Math.min(...rows);
    const col_span = Math.max(...cols) - Math.min(...cols);
    const is_vertical = row_span > col_span;
    const is_portrait = PORTRAIT_IMAGES[ship.name] || false;
    // portrait image placed vertically: no rotation needed
    // portrait image placed horizontally: rotate 90
    // landscape image placed horizontally: no rotation needed
    // landscape image placed vertically: rotate 90
    if (is_portrait) {
        return is_vertical ? 0 : 90;
    }
    return is_vertical ? 90 : 0;
};

// Footprint info for sidebar
const FOOTPRINT = {
    "TIE Fighter":       {cols:2, rows:1, offsets:[[0,0],[0,1]]},
    "Jedi Starfighter":  {cols:2, rows:1, offsets:[[0,0],[0,1]]},
    "Slave I":           {cols:3, rows:1, offsets:[[0,0],[0,1],[0,2]]},
    "X-wing":            {cols:3, rows:3, offsets:[[0,0],[1,0],[2,0],[1,1],[1,2]]},
    "Millennium Falcon": {cols:3, rows:2, offsets:[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]]}
};

// ── state ────────────────────────────────────────────────────────────────────
let player_names     = ["Player 1", "Player 2"];
let player_avatars   = ["luke", "vader"];
let boards           = [Battleship.empty_board(), Battleship.empty_board()];
let placement_player = 0;
let placement_board  = Battleship.empty_board();
let selected_idx     = null;
let orientation      = "horizontal";
let xwing_rotation   = 0;
let falcon_rotation  = 0;
let active_player    = 0;
let waiting          = false;
let confirm_coord    = null;  // cell selected, awaiting confirm
let log_entries      = [];

// ── helpers ──────────────────────────────────────────────────────────────────
const el           = (id) => document.getElementById(id);
const placed_names = ()   => placement_board.fleet.map((s) => s.name);
const unplaced     = ()   => Battleship.ships.filter((s) => !placed_names().includes(s.name));

const show_screen = function (id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    el(id).classList.add("active");
};


// ── avatar selection ──────────────────────────────────────────────────────────
const build_avatar_row = function (row_el, player_idx) {
    row_el.innerHTML = "";
    AVATARS.forEach(function (avatar) {
        const btn = document.createElement("button");
        btn.className = "avatar-option" + (
            player_avatars[player_idx] === avatar.key ? " selected" : ""
        );
        btn.setAttribute("aria-label", avatar.label);
        btn.setAttribute("aria-pressed", player_avatars[player_idx] === avatar.key ? "true" : "false");
        const img = document.createElement("img");
        img.src = Avatars[avatar.key] || "";
        img.alt = avatar.label;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        btn.appendChild(img);
        btn.addEventListener("click", function () {
            player_avatars[player_idx] = avatar.key;
            build_avatar_row(row_el, player_idx);
        });
        row_el.appendChild(btn);
    });
};

// ── event log ─────────────────────────────────────────────────────────────────
const add_log = function (text, type) {
    log_entries.push({text, type});
    const entry = document.createElement("div");
    entry.className = "log-entry log-" + type;
    entry.textContent = text;
    const container = el("log-entries");
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
};

const clear_log = function () {
    log_entries = [];
    el("log-entries").innerHTML = "";
};


// ── animations ────────────────────────────────────────────────────────────────
const shake_screen = function () {
    const m = document.querySelector("main");
    m.classList.remove("shake");
    // force reflow so animation restarts
    void m.offsetWidth;
    m.classList.add("shake");
    m.addEventListener("animationend", function () {
        m.classList.remove("shake");
    }, {"once": true});
};

const animate_cell = function (cell, type) {
    cell.classList.remove("anim-hit", "anim-miss");
    void cell.offsetWidth;
    cell.classList.add(type === "hit" ? "anim-hit" : "anim-miss");
    cell.addEventListener("animationend", function () {
        cell.classList.remove("anim-hit", "anim-miss");
    }, {"once": true});
};

const pop_result = function () {
    const r = el("shot-result");
    r.classList.remove("result-pop");
    void r.offsetWidth;
    r.classList.add("result-pop");
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
    const fp     = FOOTPRINT[ship_def.name];
    const filled = new Set(fp.offsets.map(([r, c]) => `${r},${c}`));
    const wrap   = document.createElement("div");
    wrap.className = "footprint";
    wrap.style.gridTemplateColumns = `repeat(${fp.cols}, 10px)`;
    wrap.style.gridTemplateRows    = `repeat(${fp.rows}, 10px)`;

    for (let r = 0; r < fp.rows; r = r + 1) {
        for (let c = 0; c < fp.cols; c = c + 1) {
            const fc = document.createElement("div");
            fc.className = "fp-cell";
            if (filled.has(`${r},${c}`)) {
                fc.classList.add("fp-ship");
                if (placed_ship && board) {
                    const idx = fp.offsets.findIndex(([or, oc]) => or === r && oc === c);
                    if (idx >= 0 && placed_ship.cells[idx]) {
                        const actual = placed_ship.cells[idx];
                        if (Battleship.already_shot(actual, board)) {
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

// Ship images replaced by coloured cells - no overlay needed
const overlay_ship_images = function (grid_el, board) {
    // Colours applied via paint_own_grid class assignment
    void grid_el;
    void board;
};

// ── preview outline: highlight each cell individually ────────────────────────
const draw_preview_outline = function (grid_el, cells, valid) {
    grid_el.querySelectorAll(".preview-outline").forEach((n) => n.remove());
    grid_el.querySelectorAll(".preview,.preview-invalid").forEach((c) => {
        c.classList.remove("preview", "preview-invalid");
    });
    if (!cells || cells.length === 0) { return; }
    const cls = valid ? "preview" : "preview-invalid";
    cells.forEach(function (c) {
        const t = get_cell(grid_el, c[0], c[1]);
        if (t) { t.classList.add(cls); }
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
    draw_preview_outline(el("placement-grid"), [], true);
};

const on_placement_hover = function (row, col) {
    const cells = compute_placement_cells(row, col);
    if (!cells) { return; }
    draw_preview_outline(el("placement-grid"), cells, Battleship.can_place(cells, placement_board));
};

const on_placement_click = function (row, col) {
    const cells = compute_placement_cells(row, col);
    if (!cells) {
        el("placement-status").textContent = "Select a ship from the list first.";
        return;
    }
    const ship = unplaced()[selected_idx];
    const next = Battleship.place_ship(ship.name, ship.shape, ship.size, cells, placement_board);
    if (next === undefined) {
        el("placement-status").textContent = "Can't place there – try another spot.";
        return;
    }
    placement_board = next;
    selected_idx    = null;
    refresh_placement();
};

const refresh_placement_grid = function () {
    const occupied = Battleship.occupied_cells(placement_board);
    el("placement-grid").querySelectorAll(".cell").forEach(function (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        const ship_here = placement_board.fleet.find(
            (s) => s.cells.some((c) => c[0] === row && c[1] === col)
        );
        if (ship_here) {
            cell.className = "cell ship " + ship_css_class(ship_here.name);
        } else {
            cell.className = "cell";
        }
    });
};

const refresh_ship_list = function (list_el, for_placement, battle_board) {
    list_el.innerHTML = "";
    const placed    = placed_names();
    const remaining = unplaced();

    Battleship.ships.forEach(function (ship_def) {
        const is_placed   = placed.includes(ship_def.name);
        const placed_ship = battle_board
            ? battle_board.fleet.find((s) => s.name === ship_def.name)
            : null;

        const li    = document.createElement("li");
        const entry = document.createElement("div");
        entry.className = "ship-entry";
        entry.setAttribute("tabindex", "0");
        entry.setAttribute("data-ship", ship_def.name);

        const top = document.createElement("div");
        top.className = "ship-entry-top";

        const img = document.createElement("img");
        img.className = "ship-img" + (
            ship_def.name === "Slave I" ? " ship-slave-i" : ""
        );
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
        // orientation label removed
    } else if (sel && sel.shape === "falcon") {
        // orientation label removed
    } else {
        // orientation label removed from UI
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
        if (on_ship) {
            cell.classList.add("ship");
            const ship_on_cell = board.fleet.find(
                (s) => s.cells.some((c) => c[0] === row && c[1] === col)
            );
            if (ship_on_cell) {
                cell.classList.add(ship_css_class(ship_on_cell.name));
            }
        }

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

    requestAnimationFrame(function () {
        overlay_ship_images(grid, board);
    });
};

const refresh_battle = function (locked) {
    paint_enemy_grid(locked);
    paint_own_grid();
    refresh_ship_list(el("enemy-fleet-list"), false, boards[active_player]);
    el("battle-title").innerHTML = (
        "<img src=\"" + (Avatars[player_avatars[active_player]] || "") +
        "\" alt=\"avatar\" class=\"battle-avatar\">" +
        player_names[active_player] + "'s Turn"
    );
    el("enemy-grid-title").textContent  = `${player_names[1 - active_player]}'s Waters`;
    el("own-grid-title").textContent    = `${player_names[active_player]}'s Waters`;
    el("enemy-fleet-label").textContent = `${player_names[active_player]}'s Fleet`;
};

// ── events ────────────────────────────────────────────────────────────────────
el("logo").src = Images.logo;
build_avatar_row(el("avatar-row-p1"), 0);
build_avatar_row(el("avatar-row-p2"), 1);

el("btn-start-placement").addEventListener("click", function () {
    player_names[0] = el("name-p1").value.trim() || "Player 1";
    player_names[1] = el("name-p2").value.trim() || "Player 2";
    // avatars already stored in player_avatars via the selection buttons
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
    selected_idx    = null;
    refresh_placement();
});

el("btn-ready").addEventListener("click", function () {
    boards[placement_player] = placement_board;
    if (placement_player === 0) {
        el("pass-title").textContent = "Hand Over the Device";
        el("pass-avatar-img").src = Avatars[player_avatars[1]] || "";
        el("pass-avatar-img").alt = player_names[1];
        el("pass-player-display").textContent = player_names[1];
        el("pass-message").textContent = "Cover the screen, then pass to:";
        show_screen("pass-screen");
        el("btn-pass").onclick = function () { placement_player = 1; start_placement(); };
    } else {
        el("pass-title").textContent = "Ready for Battle!";
        el("pass-avatar-img").src = Avatars[player_avatars[0]] || "";
        el("pass-avatar-img").alt = player_names[0];
        el("pass-player-display").textContent = player_names[0];
        el("pass-message").textContent = "Both fleets placed. Pass to:";
        show_screen("pass-screen");
        active_player = 0;
        el("btn-pass").onclick = function () { start_battle(); };
    }
});

el("btn-continue-turn").addEventListener("click", function () {
    if (Battleship.is_defeated(boards[1 - active_player])) {
        el("result-winner").innerHTML = (
            "<span class=\"result-trophy\">🏆</span>" +
            "<img src=\"" + (Avatars[player_avatars[active_player]] || "") +
            "\" alt=\"avatar\" class=\"win-avatar\">" +
            "<br>" + player_names[active_player].toUpperCase() +
            " WINS!<br><small style=\"font-size:0.6em;color:#aaa\">The galaxy is saved.</small>"
        );
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
        el("btn-fire").style.display = "none";
        el("btn-continue-turn").style.display = "none";
        confirm_coord = null;
        waiting = false;
        refresh_battle(false);
        show_screen("battle-screen");
    };
});


el("btn-fire").addEventListener("click", function () {
    if (!confirm_coord || waiting) { return; }
    const row = confirm_coord[0];
    const col = confirm_coord[1];
    const defender   = 1 - active_player;
    const next_board = Battleship.fire([row, col], boards[defender]);
    if (next_board === undefined) { return; }
    boards[defender] = next_board;
    confirm_coord = null;
    el("btn-fire").style.display = "none";

    const coord = [row, col];
    const hit   = Battleship.is_hit(coord, boards[defender]);
    const ship  = hit
        ? boards[defender].fleet.find((s) => s.cells.some((c) => c[0] === row && c[1] === col))
        : null;
    const sunk  = ship && Battleship.is_sunk(ship, boards[defender]);
    const pos   = ROW_LABELS[row] + COL_LABELS[col];

    if (sunk) {
        shake_screen();
        el("shot-result").style.color   = "#cc2200";
        el("shot-result").textContent   = ship.name + " DESTROYED – Fire again!";
        add_log(player_names[active_player] + " → " + pos + ": " + ship.name + " DESTROYED", "sunk");
    } else if (hit) {
        shake_screen();
        el("shot-result").style.color   = "#FFE81A";
        el("shot-result").textContent   = "HIT – Fire again!";
        add_log(player_names[active_player] + " → " + pos + ": HIT", "hit");
    } else {
        el("shot-result").style.color   = "#00d4ff";
        el("shot-result").textContent   = "MISS – Pass the device.";
        add_log(player_names[active_player] + " → " + pos + ": miss", "miss");
    }

    if (Battleship.is_defeated(boards[defender])) {
        // Win immediately shown via continue button
        refresh_battle(true);
        el("btn-continue-turn").style.display = "inline-block";
        waiting = true;
    } else if (hit) {
        // Hit: let them fire again, no waiting
        refresh_battle(false);
        waiting = false;
    } else {
        // Miss: lock grid, show continue
        waiting = true;
        refresh_battle(true);
        el("btn-continue-turn").style.display = "inline-block";
    }

    const fired = get_cell(el("enemy-grid"), row, col);
    if (fired) {
        fired.classList.add("just-fired");
        animate_cell(fired, hit ? "hit" : "miss");
    }
    pop_result();
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
    clear_log();
    build_labels(el("enemy-col-labels"), el("enemy-row-labels"));
    build_labels(el("own-col-labels"),   el("own-row-labels"));

    build_grid(el("enemy-grid"), function (row, col) {
        if (waiting) { return; }

        // Already selected this cell — deselect
        if (confirm_coord && confirm_coord[0] === row && confirm_coord[1] === col) {
            confirm_coord = null;
            el("btn-fire").style.display = "none";
            el("shot-result").textContent = "";
            refresh_battle(false);
            return;
        }

        // Can't fire at already-shot cell
        if (Battleship.already_shot([row, col], boards[1 - active_player])) { return; }

        // Select cell for confirmation
        confirm_coord = [row, col];
        refresh_battle(false);
        const selected = get_cell(el("enemy-grid"), row, col);
        if (selected) { selected.classList.add("just-fired"); }
        el("shot-result").style.color = "#aaa";
        el("shot-result").textContent = ROW_LABELS[row] + COL_LABELS[col] + " — Fire?";
        el("btn-fire").style.display = "inline-block";
    }, null, null);

    build_grid(el("own-grid"), null, null, null);
    el("own-grid").querySelectorAll(".cell").forEach((c) => { c.disabled = true; });

    waiting = false;
    confirm_coord = null;
    el("btn-fire").style.display = "none";
    el("btn-continue-turn").style.display = "none";
    el("shot-result").textContent = "";
    refresh_battle(false);
    show_screen("battle-screen");
};
