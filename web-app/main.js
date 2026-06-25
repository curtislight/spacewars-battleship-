/*jslint browser */
import Avatars from "./avatars.js";
import Battleship from "./Battleship.js";
import Images from "./images.js";

// ── constants ─────────────────────────────────────────────────────────────────
const ROW_LABELS = ["A","B","C","D","E","F","G","H","I","J"];
const COL_LABELS = ["1","2","3","4","5","6","7","8","9","10"];
const CELL_SIZE  = 44;

const SHIP_IMAGES = {
    "Jedi Starfighter":  Images.jedi_starfighter,
    "Millennium Falcon": Images.millennium_falcon,
    "Slave I":           Images.slave1,
    "TIE Fighter":       Images.tie_fighter,
    "X-wing":            Images.xwing
};

const SHIP_COLORS = {
    "Jedi Starfighter":  "#ff4444",
    "Millennium Falcon": "#cc44ff",
    "Slave I":           "#44ff88",
    "TIE Fighter":       "#00cfff",
    "X-wing":            "#ffaa00"
};

const ship_css_class = function (name) {
    return "ship-" + name.toLowerCase().replace(/ /g, "-");
};

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

// Portrait images face upward — rotate 90 when placed horizontally.
const PORTRAIT_IMAGES = {"TIE Fighter": true};

const get_ship_rotation = function (ship) {
    const rows     = ship.cells.map((c) => c[0]);
    const cols     = ship.cells.map((c) => c[1]);
    const row_span = Math.max(...rows) - Math.min(...rows);
    const col_span = Math.max(...cols) - Math.min(...cols);
    const vertical = row_span > col_span;
    const portrait = PORTRAIT_IMAGES[ship.name] || false;
    return (
        portrait
        ? (vertical ? 0 : 90)
        : (vertical ? 90 : 0)
    );
};

const FOOTPRINT = {
    "Jedi Starfighter": {
        "cols": 2,
        "offsets": [[0, 0], [0, 1]],
        "rows": 1
    },
    "Millennium Falcon": {
        "cols": 3,
        "offsets": [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
        "rows": 2
    },
    "Slave I": {
        "cols": 3,
        "offsets": [[0, 0], [0, 1], [0, 2]],
        "rows": 1
    },
    "TIE Fighter": {
        "cols": 2,
        "offsets": [[0, 0], [0, 1]],
        "rows": 1
    },
    "X-wing": {
        "cols": 3,
        "offsets": [[0, 0], [1, 0], [1, 1], [1, 2], [2, 0]],
        "rows": 3
    }
};

// ── state ─────────────────────────────────────────────────────────────────────
let active_player    = 0;
let boards           = [Battleship.empty_board(), Battleship.empty_board()];
let confirm_coord    = null;
let falcon_rotation  = 0;
let log_entries      = [];
let orientation      = "horizontal";
let placement_board  = Battleship.empty_board();
let placement_player = 0;
let player_avatars   = ["luke", "vader"];
let player_names     = ["Player 1", "Player 2"];
let selected_idx     = null;
let waiting          = false;
let xwing_rotation   = 0;

// ── helpers ───────────────────────────────────────────────────────────────────
const el = function (id) {
    return document.getElementById(id);
};
const placed_names = function () {
    return placement_board.fleet.map((s) => s.name);
};
const unplaced = function () {
    return Battleship.ships.filter(
        (s) => !placed_names().includes(s.name)
    );
};

const show_screen = function (id) {
    document.querySelectorAll(".screen").forEach(
        (s) => s.classList.remove("active")
    );
    el(id).classList.add("active");
};

const avatar_src = function (key) {
    return Avatars[key] || "";
};

// ── avatar selection ──────────────────────────────────────────────────────────
const build_avatar_row = function (row_el, player_idx) {
    row_el.innerHTML = "";
    AVATARS.forEach(function (avatar) {
        const is_selected = player_avatars[player_idx] === avatar.key;
        const btn = document.createElement("button");
        btn.className = "avatar-option" + (is_selected ? " selected" : "");
        btn.setAttribute("aria-label", avatar.label);
        btn.setAttribute("aria-pressed", is_selected ? "true" : "false");
        const img = document.createElement("img");
        img.alt = avatar.label;
        img.src = avatar_src(avatar.key);
        img.style.height = "100%";
        img.style.objectFit = "contain";
        img.style.width = "100%";
        btn.appendChild(img);
        btn.addEventListener("click", function () {
            player_avatars[player_idx] = avatar.key;
            build_avatar_row(row_el, player_idx);
        });
        row_el.appendChild(btn);
    });
};

// ── event log ────────────────────────────────────────────────────────────────
const add_log = function (text, type) {
    log_entries.push({"text": text, "type": type});
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

// ── animations ───────────────────────────────────────────────────────────────
const shake_screen = function () {
    const m = document.querySelector("main");
    m.classList.remove("shake");
    m.getBoundingClientRect(); // force reflow
    m.classList.add("shake");
    m.addEventListener("animationend", function () {
        m.classList.remove("shake");
    }, {"once": true});
};

const animate_cell = function (cell, type) {
    const cls = (type === "hit" ? "anim-hit" : "anim-miss");
    cell.classList.remove("anim-hit", "anim-miss");
    cell.getBoundingClientRect(); // force reflow
    cell.classList.add(cls);
    cell.addEventListener("animationend", function () {
        cell.classList.remove("anim-hit", "anim-miss");
    }, {"once": true});
};

const pop_result = function () {
    const r = el("shot-result");
    r.classList.remove("result-pop");
    r.getBoundingClientRect(); // force reflow
    r.classList.add("result-pop");
};

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
    const rows = Array.from({"length": 10}, function (ignore, r) { return r; });
    const cols = Array.from({"length": 10}, function (ignore, c) { return c; });
    rows.forEach(function (row) {
        cols.forEach(function (col) {
            const cell = document.createElement("button");
            cell.className = "cell";
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.setAttribute("role", "gridcell");
            cell.setAttribute(
                "aria-label",
                ROW_LABELS[row] + COL_LABELS[col]
            );
            if (on_click) {
                cell.addEventListener(
                    "click",
                    () => on_click(row, col)
                );
            }
            if (on_enter) {
                cell.addEventListener(
                    "mouseenter",
                    () => on_enter(row, col)
                );
            }
            if (on_leave) {
                cell.addEventListener("mouseleave", on_leave);
            }
            cell.addEventListener("keydown", function (ev) {
                if (ev.key === "Enter" || ev.key === " ") {
                    cell.click();
                }
                if (ev.key === "ArrowRight" && cell.nextSibling) {
                    cell.nextSibling.focus();
                }
                if (ev.key === "ArrowLeft" && cell.previousSibling) {
                    cell.previousSibling.focus();
                }
            });
            grid_el.appendChild(cell);
        });
    });
};

const get_cell = function (grid_el, row, col) {
    return grid_el.querySelector(
        "[data-row=\"" + row + "\"][data-col=\"" + col + "\"]"
    );
};

// ── footprint sidebar widget ──────────────────────────────────────────────────
const make_footprint = function (ship_def, placed_ship, board) {
    const fp     = FOOTPRINT[ship_def.name];
    const filled = new Set(fp.offsets.map(([r, c]) => r + "," + c));
    const wrap   = document.createElement("div");
    wrap.className = "footprint";
    wrap.style.gridTemplateColumns = "repeat(" + fp.cols + ", 10px)";
    wrap.style.gridTemplateRows    = "repeat(" + fp.rows + ", 10px)";

    const fp_rows = Array.from({"length": fp.rows}, function (x, r) { return r; });
    const fp_cols = Array.from({"length": fp.cols}, function (x, c) { return c; });
    fp_rows.forEach(function (r) {
        fp_cols.forEach(function (c) {
            const fc = document.createElement("div");
            fc.className = "fp-cell";
            if (filled.has(r + "," + c)) {
                fc.classList.add("fp-ship");
                if (placed_ship && board) {
                    const idx = fp.offsets.findIndex(
                        ([or, oc]) => or === r && oc === c
                    );
                    if (idx >= 0 && placed_ship.cells[idx]) {
                        const actual = placed_ship.cells[idx];
                        if (Battleship.already_shot(actual, board)) {
                            fc.classList.remove("fp-ship");
                            fc.classList.add(
                                Battleship.is_sunk(placed_ship, board)
                                ? "fp-sunk"
                                : "fp-hit"
                            );
                        }
                    }
                }
            }
            wrap.appendChild(fc);
        });
    });
    return wrap;
};

// ── preview highlight ─────────────────────────────────────────────────────────
const draw_preview = function (grid_el, cells, valid) {
    grid_el.querySelectorAll(".preview-outline").forEach(
        (n) => n.remove()
    );
    grid_el.querySelectorAll(".preview,.preview-invalid").forEach(function (c) {
        c.classList.remove("preview", "preview-invalid");
    });
    if (!cells || cells.length === 0) {
        return;
    }
    const cls = valid ? "preview" : "preview-invalid";
    cells.forEach(function (c) {
        const t = get_cell(grid_el, c[0], c[1]);
        if (t) {
            t.classList.add(cls);
        }
    });
};

// ── placement ─────────────────────────────────────────────────────────────────
const compute_cells = function (row, col) {
    const remaining = unplaced();
    if (selected_idx === null || !remaining[selected_idx]) {
        return null;
    }
    const ship = remaining[selected_idx];
    if (ship.shape === "xwing") {
        return Battleship.xwing_cells(row, col, xwing_rotation);
    }
    if (ship.shape === "falcon") {
        return Battleship.falcon_cells(row, col, falcon_rotation);
    }
    return Battleship.ship_cells(row, col, ship.size, orientation);
};

const clear_preview = function () {
    draw_preview(el("placement-grid"), [], true);
};

const on_placement_hover = function (row, col) {
    const cells = compute_cells(row, col);
    if (!cells) {
        return;
    }
    draw_preview(
        el("placement-grid"),
        cells,
        Battleship.can_place(cells, placement_board)
    );
};

const on_placement_click = function (row, col) {
    const cells = compute_cells(row, col);
    if (!cells) {
        el("placement-status").textContent = "Select a ship first.";
        return;
    }
    const ship = unplaced()[selected_idx];
    const next = Battleship.place_ship(
        ship.name, ship.shape, ship.size, cells, placement_board
    );
    if (next === undefined) {
        el("placement-status").textContent = (
            "Can't place there – try another spot."
        );
        return;
    }
    placement_board = next;
    selected_idx    = null;
    refresh_placement();
};

const refresh_placement_grid = function () {
    el("placement-grid").querySelectorAll(".cell").forEach(function (cell) {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        const ship_here = placement_board.fleet.find(
            (s) => s.cells.some((c) => c[0] === row && c[1] === col)
        );
        cell.className = ship_here
            ? "cell ship " + ship_css_class(ship_here.name)
            : "cell";
    });
};

const refresh_ship_list = function (list_el, for_placement, battle_board) {
    list_el.innerHTML = "";
    const placed    = placed_names();
    const remaining = unplaced();

    Battleship.ships.forEach(function (ship_def) {
        const is_placed   = placed.includes(ship_def.name);
        const placed_ship = (
            battle_board
            ? battle_board.fleet.find((s) => s.name === ship_def.name)
            : null
        );

        const li    = document.createElement("li");
        const entry = document.createElement("div");
        entry.className = "ship-entry";
        entry.setAttribute("data-ship", ship_def.name);
        entry.setAttribute("tabindex", "0");

        const top = document.createElement("div");
        top.className = "ship-entry-top";

        const img = document.createElement("img");
        img.alt = ship_def.name;
        img.className = "ship-img" + (
            ship_def.name === "Slave I" ? " ship-slave-i" : ""
        );
        img.src = SHIP_IMAGES[ship_def.name] || "";

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
                const rem_idx = remaining.findIndex(
                    (s) => s.name === ship_def.name
                );
                entry.addEventListener("click", function () {
                    selected_idx = rem_idx;
                    refresh_ship_list(list_el, true, null);
                });
                entry.addEventListener("keydown", function (ev) {
                    if (ev.key === "Enter" || ev.key === " ") {
                        entry.click();
                    }
                });
                if (selected_idx === rem_idx) {
                    entry.classList.add("active-ship");
                }
            }
        } else {
            if (placed_ship && Battleship.is_sunk(placed_ship, battle_board)) {
                entry.classList.add("sunk-ship");
                name_el.textContent += " \u2013 SUNK";
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
        el("placement-status").textContent = (
            "Placing " + remaining[selected_idx].name + " \u2013 click the grid."
        );
    } else {
        el("placement-status").textContent = "Select a ship from the list.";
    }

    el("placement-grid-label").textContent = (
        player_names[placement_player] + "'s Board"
    );
    el("placement-title").textContent = (
        player_names[placement_player] + ": Place Your Fleet"
    );
};

// ── battle grid painting ──────────────────────────────────────────────────────
const find_ship_at = function (row, col, board) {
    return board.fleet.find(
        (s) => s.cells.some((c) => c[0] === row && c[1] === col)
    );
};

const cell_aria = function (cell, row, col) {
    const suffix = (
        cell.classList.contains("hit")  ? " hit"  :
        cell.classList.contains("miss") ? " miss" :
        cell.classList.contains("sunk") ? " sunk" : ""
    );
    cell.setAttribute("aria-label", ROW_LABELS[row] + COL_LABELS[col] + suffix);
};

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
                const ship = find_ship_at(row, col, board);
                cell.classList.add(
                    ship && Battleship.is_sunk(ship, board) ? "sunk" : "hit"
                );
            } else {
                cell.classList.add("miss");
            }
        }
        cell_aria(cell, row, col);
    });
};

const paint_own_grid = function () {
    const board = boards[active_player];
    el("own-grid").querySelectorAll(".cell").forEach(function (cell) {
        const row   = parseInt(cell.dataset.row, 10);
        const col   = parseInt(cell.dataset.col, 10);
        const coord = [row, col];
        cell.className = "cell";
        cell.disabled  = true;

        const on_ship = Battleship.is_hit(coord, board);
        if (on_ship) {
            const ship_on_cell = find_ship_at(row, col, board);
            cell.classList.add("ship");
            if (ship_on_cell) {
                cell.classList.add(ship_css_class(ship_on_cell.name));
            }
        }
        if (Battleship.already_shot(coord, board)) {
            if (on_ship) {
                const ship = find_ship_at(row, col, board);
                cell.classList.add(
                    ship && Battleship.is_sunk(ship, board) ? "sunk" : "hit"
                );
            } else {
                cell.classList.add("miss");
            }
        }
    });
};

const refresh_battle = function (locked) {
    paint_enemy_grid(locked);
    paint_own_grid();
    refresh_ship_list(el("enemy-fleet-list"), false, boards[active_player]);
    el("battle-title").innerHTML = (
        "<img src=\"" + avatar_src(player_avatars[active_player]) +
        "\" alt=\"avatar\" class=\"battle-avatar\">" +
        player_names[active_player] + "'s Turn"
    );
    el("enemy-grid-title").textContent = (
        player_names[1 - active_player] + "'s Waters"
    );
    el("own-grid-title").textContent    = player_names[active_player] + "'s Waters";
    el("enemy-fleet-label").textContent = player_names[active_player] + "'s Fleet";
};

// ── pass screen helper ────────────────────────────────────────────────────────
const set_pass_screen = function (title, message, avatar_key, name) {
    el("pass-title").textContent          = title;
    el("pass-message").textContent        = message;
    el("pass-avatar-img").src             = avatar_src(avatar_key);
    el("pass-avatar-img").alt             = name;
    el("pass-player-display").textContent = name;
    show_screen("pass-screen");
};

// ── screen starters (defined before event handlers) ──────────────────────────
// ── screen starters ───────────────────────────────────────────────────────────
const start_placement = function () {
    placement_board = Battleship.empty_board();
    falcon_rotation = 0;
    orientation     = "horizontal";
    selected_idx    = null;
    xwing_rotation  = 0;
    build_labels(el("placement-col-labels"), el("placement-row-labels"));
    build_grid(
        el("placement-grid"),
        on_placement_click,
        on_placement_hover,
        clear_preview
    );
    refresh_placement();
    show_screen("placement-screen");
};

const start_battle = function () {
    clear_log();
    build_labels(el("enemy-col-labels"), el("enemy-row-labels"));
    build_labels(el("own-col-labels"),   el("own-row-labels"));

    build_grid(el("enemy-grid"), function (row, col) {
        if (waiting) {
            return;
        }
        if (
            confirm_coord &&
            confirm_coord[0] === row &&
            confirm_coord[1] === col
        ) {
            confirm_coord = null;
            el("btn-fire").style.display  = "none";
            el("shot-result").textContent = "";
            refresh_battle(false);
            return;
        }
        if (Battleship.already_shot([row, col], boards[1 - active_player])) {
            return;
        }
        confirm_coord = [row, col];
        refresh_battle(false);
        const sel = get_cell(el("enemy-grid"), row, col);
        if (sel) {
            sel.classList.add("just-fired");
        }
        el("shot-result").style.color = "#aaa";
        el("shot-result").textContent = (
            ROW_LABELS[row] + COL_LABELS[col] + " \u2014 Fire?"
        );
        el("btn-fire").style.display = "inline-block";
    }, null, null);

    build_grid(el("own-grid"), null, null, null);
    el("own-grid").querySelectorAll(".cell").forEach(
        (c) => { c.disabled = true; }
    );

    confirm_coord = null;
    waiting       = false;
    el("btn-continue-turn").style.display = "none";
    el("btn-fire").style.display          = "none";
    el("shot-result").textContent         = "";
    refresh_battle(false);
    show_screen("battle-screen");
};

// ── logo menu ────────────────────────────────────────────────────────────────
const logo_menu = el("logo-menu");

const toggle_menu = function () {
    logo_menu.hidden = !logo_menu.hidden;
};

el("logo-btn").addEventListener("click", toggle_menu);
el("logo-btn").addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" || ev.key === " ") {
        toggle_menu();
    }
});
document.addEventListener("click", function (ev) {
    if (!el("logo-btn").contains(ev.target)) {
        logo_menu.hidden = true;
    }
});
el("menu-resume").addEventListener("click", function () {
    logo_menu.hidden = true;
});
el("menu-restart").addEventListener("click", function () {
    logo_menu.hidden = true;
    boards         = [Battleship.empty_board(), Battleship.empty_board()];
    player_avatars = ["luke", "vader"];
    player_names   = ["Player 1", "Player 2"];
    build_avatar_row(el("avatar-row-p1"), 0);
    build_avatar_row(el("avatar-row-p2"), 1);
    el("name-p1").value = "Player 1";
    el("name-p2").value = "Player 2";
    show_screen("name-screen");
});

// ── events ────────────────────────────────────────────────────────────────────
el("logo").src = Images.logo;
build_avatar_row(el("avatar-row-p1"), 0);
build_avatar_row(el("avatar-row-p2"), 1);

el("btn-start-placement").addEventListener("click", function () {
    player_names[0]  = el("name-p1").value.trim() || "Player 1";
    player_names[1]  = el("name-p2").value.trim() || "Player 2";
    boards           = [Battleship.empty_board(), Battleship.empty_board()];
    placement_player = 0;
    start_placement();
});

el("btn-rotate").addEventListener("click", function () {
    const sel = (
        selected_idx !== null
        ? unplaced()[selected_idx]
        : null
    );
    if (sel && sel.shape === "xwing") {
        xwing_rotation = (xwing_rotation + 1) % 4;
    } else if (sel && sel.shape === "falcon") {
        falcon_rotation = (falcon_rotation + 1) % 4;
    } else {
        orientation = (
            orientation === "horizontal"
            ? "vertical"
            : "horizontal"
        );
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
        set_pass_screen(
            "Hand Over the Device",
            "Cover the screen, then pass to:",
            player_avatars[1],
            player_names[1]
        );
        el("btn-pass").onclick = function () {
            placement_player = 1;
            start_placement();
        };
    } else {
        set_pass_screen(
            "Ready for Battle!",
            "Both fleets placed. Pass to:",
            player_avatars[0],
            player_names[0]
        );
        active_player = 0;
        el("btn-pass").onclick = function () {
            start_battle();
        };
    }
});

el("btn-continue-turn").addEventListener("click", function () {
    if (Battleship.is_defeated(boards[1 - active_player])) {
        el("result-winner").innerHTML = (
            "<span class=\"result-trophy\">\uD83C\uDFC6</span>" +
            "<img src=\"" + avatar_src(player_avatars[active_player]) +
            "\" alt=\"avatar\" class=\"win-avatar\"><br>" +
            player_names[active_player].toUpperCase() +
            " WINS!<br><small style=\"font-size:0.6em;color:#aaa\">" +
            "The galaxy is saved.</small>"
        );
        show_screen("result-screen");
        return;
    }
    const next = 1 - active_player;
    set_pass_screen(
        "Pass the Device",
        player_names[active_player] + "'s turn done. Pass to:",
        player_avatars[next],
        player_names[next]
    );
    el("btn-pass").onclick = function () {
        active_player                      = next;
        confirm_coord                      = null;
        waiting                            = false;
        el("btn-continue-turn").style.display = "none";
        el("btn-fire").style.display          = "none";
        el("shot-result").textContent         = "";
        refresh_battle(false);
        show_screen("battle-screen");
    };
});

el("btn-fire").addEventListener("click", function () {
    if (!confirm_coord || waiting) {
        return;
    }
    const row      = confirm_coord[0];
    const col      = confirm_coord[1];
    const defender = 1 - active_player;
    const fired_board = Battleship.fire([row, col], boards[defender]);
    if (fired_board === undefined) {
        return;
    }
    boards[defender] = fired_board;
    confirm_coord    = null;
    el("btn-fire").style.display = "none";

    const coord = [row, col];
    const hit   = Battleship.is_hit(coord, boards[defender]);
    const ship  = hit ? find_ship_at(row, col, boards[defender]) : null;
    const sunk  = ship && Battleship.is_sunk(ship, boards[defender]);
    const pos   = ROW_LABELS[row] + COL_LABELS[col];
    const attacker = player_names[active_player];

    if (sunk) {
        shake_screen();
        el("shot-result").style.color = "#cc2200";
        el("shot-result").textContent = ship.name + " DESTROYED \u2013 Fire again!";
        add_log(attacker + " \u2192 " + pos + ": " + ship.name + " DESTROYED", "sunk");
    } else if (hit) {
        shake_screen();
        el("shot-result").style.color = "#FFE81A";
        el("shot-result").textContent = "HIT \u2013 Fire again!";
        add_log(attacker + " \u2192 " + pos + ": HIT", "hit");
    } else {
        el("shot-result").style.color = "#00d4ff";
        el("shot-result").textContent = "MISS \u2013 Pass the device.";
        add_log(attacker + " \u2192 " + pos + ": miss", "miss");
    }

    if (Battleship.is_defeated(boards[defender])) {
        refresh_battle(true);
        el("btn-continue-turn").style.display = "inline-block";
        waiting = true;
    } else if (hit) {
        refresh_battle(false);
        waiting = false;
    } else {
        waiting = true;
        refresh_battle(true);
        el("btn-continue-turn").style.display = "inline-block";
    }

    const fired_cell = get_cell(el("enemy-grid"), row, col);
    if (fired_cell) {
        fired_cell.classList.add("just-fired");
        animate_cell(fired_cell, hit ? "hit" : "miss");
    }
    pop_result();
});

el("btn-play-again").addEventListener("click", function () {
    show_screen("name-screen");
});
