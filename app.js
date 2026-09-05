(() => {
  "use strict";
  const S = window.Siege,
    V = window.SiegeScene,
    $ = (s) => document.querySelector(s);
  const icons = {
    castle:
      '<path d="M3 5h4v4h3V5h4v4h3V5h4v16H3z"/><path d="M10 21v-6a2 2 0 0 1 4 0v6" fill="#df7048"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="15" r="1.5"/>',
    sound:
      '<path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M16 8q5 4 0 8m3-11q8 7 0 14" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    mute: '<path d="M3 9h4l5-4v14l-5-4H3z"/><path d="m16 9 6 6m0-6-6 6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  };
  const svg = (name) =>
    `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${icons[name] || icons.castle}</svg>`;
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  let settings = {
    volume: 0.55,
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
  try {
    const saved = JSON.parse(
      localStorage.getItem("tiny-siege-settings") || "null",
    );
    if (saved) {
      settings.volume = Number.isFinite(saved.volume)
        ? Math.max(0, Math.min(1, saved.volume))
        : 0.55;
      settings.reduced = !!saved.reduced;
    }
  } catch {}
  let phase = "title",
    game = null,
    active = 0,
    plans = [null, null],
    draft = null,
    kind = "build",
    piece = "stone",
    weapon = "cannon",
    mode = "standard",
    names = ["Ember", "Tide"],
    last = null,
    animation = null,
    resume = false,
    modalFocus = null;
  let audio = null,
    toastTimer = null,
    frame = null;
  function saveSettings() {
    try {
      localStorage.setItem("tiny-siege-settings", JSON.stringify(settings));
    } catch {}
    document.body.classList.toggle("reduce-motion", settings.reduced);
  }
  saveSettings();
  function tone(freq, duration = 0.08, type = "sine", gain = 0.08, delay = 0) {
    if (settings.volume <= 0) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      const o = audio.createOscillator(),
        g = audio.createGain(),
        t = audio.currentTime + delay;
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(gain * settings.volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      o.connect(g);
      g.connect(audio.destination);
      o.start(t);
      o.stop(t + duration);
    } catch {}
  }
  function sound(name) {
    if (name === "click") tone(550, 0.04, "sine", 0.045);
    if (name === "place") {
      tone(180, 0.08, "triangle", 0.16);
      tone(260, 0.05, "triangle", 0.08, 0.045);
    }
    if (name === "lock") {
      tone(390, 0.12, "sine", 0.11);
      tone(590, 0.17, "sine", 0.09, 0.09);
    }
    if (name === "boom") {
      tone(62, 0.45, "sawtooth", 0.17);
      tone(37, 0.55, "triangle", 0.25);
      tone(110, 0.18, "square", 0.05, 0.03);
    }
    if (name === "launch") {
      tone(190, 0.14, "triangle", 0.11);
      tone(90, 0.25, "sawtooth", 0.1, 0.04);
    }
    if (name === "win")
      [330, 415, 494, 660].forEach((f, i) =>
        tone(f, 0.5, "triangle", 0.1, i * 0.13),
      );
  }
  function toast(text) {
    $("#toast").textContent = text;
    $("#toast").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => $("#toast").classList.remove("visible"),
      3000,
    );
  }
  function header() {
    return `<header class="topbar"><button class="brand" data-do="home" aria-label="Tiny Siege home"><span class="brand-icon">${svg("castle")}</span><span>TINY SIEGE<span> /</span></span></button><span class="edition">A LITTLE LOCAL RIVALRY</span><nav class="toplinks" aria-label="Main navigation"><button class="text-button" data-do="manual"><span class="small-icon">▤</span>Field manual</button><button class="volume-toggle" data-do="settings" aria-label="Sound and display settings">${svg(settings.volume ? "sound" : "mute")}</button></nav></header>`;
  }
  function footer() {
    return '<footer class="footer"><span>TINY SIEGE · LOCAL DUELS, LASTING GRUDGES</span><span>Made for two. <span class="heart">✦</span> No internet needed.</span></footer>';
  }
  function title() {
    return `<main class="hero enter"><div class="hero-copy"><div class="eyebrow"><span class="dot"></span>A FORTRESS DUEL FOR TWO</div><h1>Small forts.<br><em>Big grudges.</em></h1><p>Build something glorious. Predict something devious. Then knock your best friend’s command room into next week.</p><div class="hero-cta"><button class="primary" data-do="setup">Start a duel <span class="arrow">↗</span></button><button class="secondary" data-do="manual">How to play</button></div><div class="hero-caption"><span>2 local players</span><span>One shared screen</span><span>10–20 minutes</span></div></div><div class="hero-art"><canvas id="hero-canvas" role="img" aria-label="An improbable timber and stone fortress with an orange flag, a cannon, and an incoming cannonball"></canvas><span class="art-label">Probably structurally sound.</span></div></main><section class="features" aria-label="Game features"><article class="feature"><span class="feature-number">01</span><div><h3>Build your bad idea.</h3><p>Eight pieces. Endless questionable architecture.<br>Make every block count.</p></div></article><article class="feature"><span class="feature-number">02</span><div><h3>Keep them guessing.</h3><p>Secretly build, reinforce, or fire.<br>Read your rival. Hide your intentions.</p></div></article><article class="feature"><span class="feature-number">03</span><div><h3>Let it all come down.</h3><p>Both orders resolve together.<br>One command room left. Usually.</p></div></article></section>${footer()}`;
  }
  function setup() {
    return `<main class="setup-wrap enter"><div class="page-heading"><div class="eyebrow"><span class="dot"></span>BEFORE THE FIRST SHOT</div><h1>Meet your rival.</h1><p>Two commanders. One screen. A very temporary peace.</p></div><div class="name-grid"><div class="name-card"><div class="eyebrow">01 / THE EMBER COMPANY</div><label for="name0">Commander’s name</label><input id="name0" maxlength="20" value="${esc(names[0])}" autocomplete="off"><p>Your fortress flies the terracotta flag.</p></div><div class="name-card teal"><div class="eyebrow">02 / THE TIDE COMPANY</div><label for="name1">Commander’s name</label><input id="name1" maxlength="20" value="${esc(names[1])}" autocomplete="off"><p>Your fortress flies the ocean-blue flag.</p></div></div><div class="tool-heading"><span>CHOOSE YOUR TEMPO</span></div><div class="mode-grid"><button class="mode ${mode === "standard" ? "selected" : ""}" data-mode="standard" aria-pressed="${mode === "standard"}"><span class="radio"></span><span><strong>The classic siege</strong><small>24 command health · pressure from round 13</small></span></button><button class="mode ${mode === "quick" ? "selected" : ""}" data-mode="quick" aria-pressed="${mode === "quick"}"><span class="radio"></span><span><strong>A quick grudge</strong><small>18 command health · pressure from round 9</small></span></button></div><div class="setup-bottom"><p><b>A gentleman’s agreement:</b> look away while your rival plans. We’ll cover the screen for every handoff.</p><button class="primary" data-do="begin">To the battlefield <span class="arrow">→</span></button></div></main>${footer()}`;
  }
  function curtain() {
    const shared = phase === "shared",
      p = game.players[active];
    return `<main class="curtain ${!shared && active === 1 ? "teal" : ""} enter"><div class="curtain-card"><div class="curtain-icon">${svg(shared ? "castle" : "lock")}</div><div class="eyebrow">ROUND ${String(game.round).padStart(2, "0")} / ${shared ? "ORDERS SEALED" : resume ? "PRIVACY COVER" : "PRIVATE PLANNING"}</div><h1>${shared ? "Eyes on the battlefield." : `Over to you,<br>${esc(p.name)}.`}</h1><p>${shared ? "Both orders are locked. Bring your rival back to the screen and watch your plans collide." : `Pass the controls to ${esc(p.name)}. The other commander should look away before you continue.`}</p><button class="primary" data-do="${shared ? "resolve" : "ready"}">${shared ? "Reveal & resolve" : resume ? "Resume my order" : "I’m ready to plan"} <span class="arrow">→</span></button><div class="curtain-small">${shared ? "Defense first. Then both weapons fire together." : "Your order stays hidden until both commanders lock in."}</div><div class="curtain-steps"><span class="${plans[0] ? "done" : ""}"></span><span class="${plans[1] ? "done" : ""}"></span></div></div></main>`;
  }
  function stat(side) {
    const p = game.players[side],
      c = p.board["4,0"],
      hp = c?.hp || 0,
      max = game.mode === "quick" ? 18 : 24;
    return `<div class="player-stat ${side ? "right" : ""}"><div class="crest">♜</div><div><div class="player-name">${esc(p.name)}</div><div class="stat-line"><span><span class="health-track"><span class="health-fill" style="width:${(hp / max) * 100}%"></span></span><span aria-label="Command health">${hp}/${max}</span></span><span class="supply"><em>◆</em> ${p.supply} <span style="font-weight:400">supplies</span></span></div></div></div>`;
  }
  function stage(interactive = false) {
    let cells = "";
    if (interactive)
      for (let side = 0; side < 2; side++)
        for (let y = 0; y < S.H; y++)
          for (let x = 0; x < S.W; x++) {
            const p = V.pos(side, x, y),
              b = game.players[side].board[S.key(x, y)],
              enabled =
                phase === "planning" &&
                side === (kind === "fire" ? 1 - active : active),
              name = b
                ? `${b.type === "command" ? "Command room" : S.PIECES[b.type].name}, ${b.hp} of ${b.max} health`
                : "empty";
            const label = `${game.players[side].name}, column ${x + 1}, row ${y + 1}: ${name}`;
            cells += `<button class="grid-cell" style="left:${(p.x / V.BW) * 100}%;top:${(p.y / V.BH) * 100}%;width:${(44 / V.BW) * 100}%;height:${(44 / V.BH) * 100}%" data-cell="${side},${x},${y}" aria-label="${esc(label)}" title="${esc(label)}" ${enabled ? "" : "disabled"}></button>`;
          }
    const tip =
      phase === "planning"
        ? kind === "build"
          ? "Click an empty cell on your fortress. Click a planned piece to undo."
          : kind === "reinforce"
            ? "Choose up to 3 friendly blocks. Repairs +6 health and blocks 4 damage."
            : "Click the enemy fortress to aim. Highlighted cells show expected hits."
        : phase === "animating"
          ? "The suspense is structurally unsound."
          : "Both orders resolved. The battlefield tells the story.";
    return `<div class="battle-wrap"><canvas id="battle" role="img" aria-label="Two fortresses on grassy islands. Ember on the left and Tide on the right. Command rooms bear crown banners."></canvas><div class="battle-tag"><span class="dot"></span>THE QUIET QUARRY</div><div class="battle-subtitle">A perfectly lovely place for a disagreement.</div><div class="wind-tag">↝ No wind. No luck. Just you.</div>${interactive ? `<div class="cell-layer" role="group" aria-label="Fortress planning grid. Row 1 is ground; column 1 faces the enemy.">${cells}</div>` : ""}<span class="fort-label left">EMBER COMPANY</span><span class="fort-label right">TIDE COMPANY</span><div class="stage-tip">${tip}</div></div>`;
  }
  function toolArea() {
    if (kind === "reinforce")
      return `<div class="tool-heading"><span>PATCH IT. PROTECT IT.</span><span>Up to 3 blocks</span></div><div class="reinforce-info"><div class="big-shield">⛨</div><div><h3>A little more stubborn.</h3><p>Choose blocks on your fortress, including your command room. Repairs happen before enemy fire. The shield lasts this round only.</p><div class="reinforce-stats"><span><b>+6</b>health</span><span><b>4</b>shield</span><span><b>2◆</b>per block</span></div></div></div>`;
    const defs = kind === "build" ? S.PIECES : S.WEAPONS,
      selected = kind === "build" ? piece : weapon;
    return `<div class="tool-heading"><span>${kind === "build" ? "A GOOD FORT STARTS SOMEWHERE" : "PICK YOUR ARGUMENT"}</span><span>${kind === "build" ? "Up to 3 pieces" : "One shot this round"}</span></div><div class="tool-grid ${kind === "fire" ? "weapons" : ""}">${Object.entries(
      defs,
    )
      .map(
        ([id, p]) =>
          `<button class="tool ${id === selected ? "active" : ""}" data-tool="${id}" aria-pressed="${id === selected}" aria-label="${p.name}, ${p.cost} supplies. ${p.desc}" title="${p.desc}"><span class="tool-icon" style="--swatch:${p.color || "#5a7474"}">${p.icon}</span><span class="tool-name">${p.name}</span><span class="tool-cost">${p.cost} ◆${p.hp ? ` · ${p.hp} hp` : ""}</span></button>`,
      )
      .join(
        "",
      )}</div><p class="tool-description"><b>${defs[selected].role}.</b> ${defs[selected].desc}</p>`;
  }
  function describe(plan, detail = false) {
    if (!plan) return "No order yet";
    if (plan.kind === "pass") return "Hold & save";
    if (plan.kind === "build")
      return `Build ${plan.placements.length} ${plan.placements.length === 1 ? "piece" : "pieces"}`;
    if (plan.kind === "reinforce")
      return `Reinforce ${plan.targets.length} ${plan.targets.length === 1 ? "block" : "blocks"}`;
    return `${S.WEAPONS[plan.weapon].name}${detail ? ` · row ${plan.target.y + 1}` : ""}`;
  }
  function orderText() {
    const error = S.validate(game, active, draft);
    if (draft.kind === "build" && draft.placements.length)
      return `<strong>${describe(draft)}</strong><br>${draft.placements.map((p) => S.PIECES[p.type].name).join(" · ")}${error ? `<br><span style="color:var(--orange-dark)">${error}</span>` : ""}`;
    if (draft.kind === "reinforce" && draft.targets.length)
      return `<strong>${describe(draft)}</strong><br>Repair and shield your selection.`;
    if (draft.kind === "fire" && draft.target)
      return `<strong>${S.WEAPONS[draft.weapon].name} → row ${draft.target.y + 1}</strong><br>${draft.weapon === "mortar" ? `Direct hit · column ${draft.target.x + 1}` : "Front-facing trajectory"}${error ? "<br>Not enough supplies." : ""}`;
    return kind === "build"
      ? "Pick a piece, then place it on your fortress."
      : kind === "reinforce"
        ? "Select the blocks worth saving."
        : "Pick a weapon, then choose your target.";
  }
  function planner() {
    return `<div class="planning-bar"><div class="planning-title"><span class="turn-pill ${active ? "teal" : ""}">PLAYER ${active + 1}</span><h2>${esc(game.players[active].name)}, make your move.</h2></div><div class="private-note">▣ &nbsp; Private order · keep your rival looking away</div></div><section class="planning-panel" aria-label="Secret order planner"><div class="action-tabs" role="group" aria-label="Order type">${[
      ["build", "▦", "Build", "Raise the stakes"],
      ["reinforce", "⛨", "Reinforce", "Stand your ground"],
      ["fire", "◉", "Fire", "Make a point"],
    ]
      .map(
        ([id, icon, label, sub]) =>
          `<button class="action-tab ${kind === id ? "active" : ""}" data-kind="${id}" aria-pressed="${kind === id}"><span>${icon}</span><span><b>${label}</b><small>${sub}</small></span></button>`,
      )
      .join(
        "",
      )}</div><div class="tools-area">${toolArea()}</div><aside class="order-area"><div class="eyebrow">YOUR SECRET ORDER</div><div class="order-detail" aria-live="polite">${orderText()}</div><div class="order-cost"><span>Cost / available</span><b>${S.planCost(draft)} / ${game.players[active].supply} ◆</b></div><button class="primary" data-do="lock" aria-label="Lock order" ${S.validate(game, active, draft) ? "disabled" : ""}>Lock order <span>▣</span></button><div class="order-links"><button data-do="clear">Clear order</button><button data-do="hold">Hold & save</button></div></aside></section>`;
  }
  function impactText(side) {
    if (!last) return "";
    const events = last.events.filter((e) => e.side === side),
      dmg = events
        .filter((e) => e.kind === "damage" || e.kind === "pressure")
        .reduce((n, e) => n + e.amount, 0),
      gone = events.filter(
        (e) => e.kind === "destroy" || e.kind === "collapse",
      ).length,
      shield = events
        .filter((e) => e.kind === "damage")
        .reduce((n, e) => n + e.absorbed, 0);
    return `${dmg} damage taken · ${gone} ${gone === 1 ? "block" : "blocks"} lost${shield ? ` · ${shield} shielded` : ""}`;
  }
  function report() {
    const r = last?.game.history.at(-1),
      busy = phase === "animating";
    return `<section class="reveal-panel" aria-label="Round results"><div class="reveal-order"><div class="eyebrow">${esc(game.players[0].name)} CHOSE</div><h3>${describe(plans[0])}</h3><p>${busy ? "Resolving…" : impactText(0)}</p></div><button class="primary" data-do="next" ${busy ? "disabled" : ""}>${busy ? "Orders in motion…" : game.result ? "See the outcome" : "Next round"} <span class="arrow">→</span></button><div class="reveal-order"><div class="eyebrow">${esc(game.players[1].name)} CHOSE</div><h3>${describe(plans[1])}</h3><p>${busy ? "Resolving…" : impactText(1)}</p></div></section>${!busy ? `<p class="report-line">${r.events.some((e) => e.kind === "pressure") ? `<strong>Rising pressure:</strong> both command rooms took ${r.events.find((e) => e.kind === "pressure").amount} unavoidable damage. ` : ""}${game.result ? "The last shots have spoken." : `<strong>Resupplied.</strong> Both commanders receive 4 supplies, plus surviving Mint income.`}</p>` : ""}`;
  }
  function match() {
    const pressure = S.pressure(
      phase === "report"
        ? { mode: game.mode, round: last.game.history.at(-1).round }
        : game,
    );
    return `<main class="match enter"><section class="match-top" aria-label="Match status">${stat(0)}<div class="round-stat"><div class="eyebrow">${phase === "planning" ? "PLANNING PHASE" : phase === "animating" ? "SIMULTANEOUS RESOLUTION" : "ROUND COMPLETE"}</div><strong>Round ${String(phase === "report" ? last.game.history.at(-1).round : game.round).padStart(2, "0")}</strong><small>${pressure ? `⚑ Pressure: ${pressure} damage` : `${game.mode === "quick" ? "QUICK GRUDGE" : "CLASSIC SIEGE"} · +4 SUPPLY / ROUND`}</small></div>${stat(1)}</section>${stage(phase === "planning")}${phase === "planning" ? planner() : report()}<div class="game-footer"><button data-do="history">↶ Round journal (${game.history.length})</button><span>Command room = crown banner. Destroy theirs. Protect yours.</span><span>${phase === "planning" ? '<span class="kbd">1</span><span class="kbd">2</span><span class="kbd">3</span> choose action &nbsp; <span class="kbd">P</span> privacy cover' : "Same battlefield. New grudges."}</span></div></main>`;
  }
  function result() {
    const winner = game.result.winner,
      title =
        winner === null
          ? "Mutually assured rubble."
          : `${esc(game.players[winner].name)} takes the quarry.`,
      gone = game.history
        .flatMap((r) => r.events)
        .filter((e) => ["destroy", "collapse"].includes(e.kind)).length,
      shots = game.history
        .flatMap((r) => r.plans)
        .filter((p) => p.kind === "fire").length;
    return `<main class="result enter"><div class="result-icon">${winner === null ? "✹" : "♜"}</div><div class="eyebrow">${winner === null ? "AN HONORABLE DRAW" : "VICTORY / " + (winner === 0 ? "EMBER" : "TIDE") + " COMPANY"}</div><h1>${title}</h1><p>${winner === null ? "Both command rooms fell. Neither ego survived." : "One command room still stands. That’s all the architecture you need."}<br>A fine siege. A questionable friendship.</p><div class="result-stats"><div><strong>${game.history.length}</strong><small>ROUNDS PLAYED</small></div><div><strong>${shots}</strong><small>SHOTS FIRED</small></div><div><strong>${gone}</strong><small>BLOCKS LOST</small></div></div><div class="result-buttons"><button class="primary" data-do="rematch">Settle the score <span class="arrow">↻</span></button><button class="secondary" data-do="setup">New commanders</button><button class="secondary" data-do="home">Title screen</button></div>${stage(false)}<p style="font-size:11px"><button class="text-button" data-do="history">Read the round journal ↗</button></p></main>`;
  }
  function render() {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    $("#app").innerHTML =
      `<div class="shell">${header()}${phase === "title" ? title() : phase === "setup" ? setup() : ["curtain", "shared"].includes(phase) ? curtain() : phase === "result" ? result() : match()}</div>`;
    if (phase === "title") V.hero($("#hero-canvas"));
    paint();
  }
  function paint() {
    if ($("#battle"))
      V.render($("#battle"), game, {
        planning: phase === "planning",
        side: active,
        kind,
        plan: phase === "planning" ? draft : null,
        animation,
        time: settings.reduced ? 0 : performance.now(),
      });
  }
  function start() {
    game = S.newGame(names, mode);
    plans = [null, null];
    active = 0;
    last = null;
    draft = null;
    resume = false;
    phase = "curtain";
    render();
    window.scrollTo(0, 0);
  }
  function newDraft() {
    draft =
      kind === "build"
        ? { kind, placements: [] }
        : kind === "reinforce"
          ? { kind, targets: [] }
          : { kind, weapon, target: null };
  }
  function readNames() {
    if ($("#name0"))
      names = [
        $("#name0").value.trim() || "Ember",
        $("#name1").value.trim() || "Tide",
      ];
  }
  function lock() {
    const err = S.validate(game, active, draft);
    if (err) {
      toast(err);
      return;
    }
    plans[active] = S.clone(draft);
    draft = null;
    resume = false;
    clearTimeout(toastTimer);
    $("#toast").classList.remove("visible");
    sound("lock");
    if (plans.every(Boolean)) phase = "shared";
    else {
      active = 1 - active;
      phase = "curtain";
    }
    render();
    window.scrollTo(0, 0);
  }
  function cellClick(side, x, y) {
    if (
      phase !== "planning" ||
      side !== (kind === "fire" ? 1 - active : active)
    )
      return;
    if (kind === "build") {
      const found = draft.placements.findIndex((p) => p.x === x && p.y === y);
      if (found >= 0) {
        draft.placements.splice(found, 1);
        sound("click");
      } else if (game.players[side].board[S.key(x, y)]) {
        const c = game.players[side].board[S.key(x, y)];
        toast(
          `${c.type === "command" ? "Command room" : S.PIECES[c.type].name}: ${c.hp}/${c.max} health. Choose Reinforce to protect it.`,
        );
        return;
      } else if (draft.placements.length >= 3) {
        toast(
          "Three pieces per build order. Click a planned piece to remove it.",
        );
        return;
      } else if (
        S.planCost(draft) + S.PIECES[piece].cost >
        game.players[active].supply
      ) {
        toast("Not enough supplies for that piece.");
        return;
      } else {
        draft.placements.push({ x, y, type: piece });
        sound("place");
      }
    } else if (kind === "reinforce") {
      const found = draft.targets.findIndex((p) => p.x === x && p.y === y);
      if (found >= 0) draft.targets.splice(found, 1);
      else if (!game.players[side].board[S.key(x, y)]) {
        toast("Choose an existing friendly block.");
        return;
      } else if (draft.targets.length >= 3) {
        toast("You can reinforce up to three blocks.");
        return;
      } else if (S.planCost(draft) + 2 > game.players[active].supply) {
        toast("Not enough supplies.");
        return;
      } else draft.targets.push({ x, y });
      sound("place");
    } else {
      draft.target = { x, y };
      sound("click");
    }
    const scroll = window.scrollY;
    render();
    window.scrollTo(0, scroll);
    $(`[data-cell="${side},${x},${y}"]`)?.focus({ preventScroll: true });
  }
  function resolveRound() {
    last = S.resolve(game, plans);
    phase = "animating";
    animation = { t: 0, events: last.events, attacks: last.attacks };
    // Display all newly built defenses before showing the incoming projectiles.
    game = S.clone(game);
    game.players.forEach((p, i) => {
      if (plans[i].kind === "build")
        for (const a of plans[i].placements)
          p.board[S.key(a.x, a.y)] = S.cell(a.type);
      if (plans[i].kind === "reinforce")
        for (const a of plans[i].targets) {
          const c = p.board[S.key(a.x, a.y)];
          c.hp = Math.min(c.max, c.hp + 6);
        }
    });
    render();
    sound(plans.some((p) => p.kind === "fire") ? "launch" : "place");
    const started = performance.now(),
      duration = settings.reduced ? 120 : 2000;
    let impacted = false;
    function tick(now) {
      const t = Math.min(1, (now - started) / duration);
      animation.t = t;
      if (t >= 0.62 && !impacted) {
        impacted = true;
        game = last.game;
        if (
          last.events.some((e) =>
            ["damage", "destroy", "collapse", "pressure"].includes(e.kind),
          )
        )
          sound("boom");
      }
      paint();
      if (t < 1) frame = requestAnimationFrame(tick);
      else {
        animation = null;
        game = last.game;
        phase = "report";
        render();
        if (game.result) sound("win");
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function showModal(title, body, actions = "") {
    modalFocus = document.activeElement;
    $("#modal-root").innerHTML =
      `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title">${title}</h2><button class="close" data-do="close" aria-label="Close dialog">×</button></div>${body}${actions ? `<div class="modal-actions">${actions}</div>` : ""}</section></div>`;
    $(".modal .close").focus();
  }
  function closeModal() {
    $("#modal-root").innerHTML = "";
    modalFocus?.focus?.({ preventScroll: true });
  }
  function manual() {
    showModal(
      "The field manual",
      `<p>Welcome to Tiny Siege. Take turns planning in private, then watch both orders resolve together. <b>Destroy the enemy’s crown-marked command room to win.</b> If both fall in the same round, it’s a draw.</p><h3>The rhythm of a round</h3><div class="manual-steps"><div class="manual-step"><b>01</b><strong>Pass & plan</strong><p>Your rival looks away. Choose one order: build, reinforce, fire, or hold to save.</p></div><div class="manual-step"><b>02</b><strong>Lock it in</strong><p>Your order is sealed. Pass the covered screen to your rival for their order.</p></div><div class="manual-step"><b>03</b><strong>Watch together</strong><p>Defense resolves first. Both weapons fire. Rubble falls. Collect supplies.</p></div></div><h3>Build & reinforce</h3><p>Build up to <b>3 pieces</b> per order in empty cells. Each must connect to the ground through other blocks. Reinforce up to <b>3 existing blocks</b>, including your command room: each costs <b>2 supplies</b>, repairs <b>6 health</b> (up to its maximum), and adds a <b>4-damage shield</b> for this round. Shield damage is spent across hits and unused shield expires. Holding costs nothing.</p><h3>Eight pieces. Pick your compromises.</h3><div class="manual-grid">${Object.values(
        S.PIECES,
      )
        .map(
          (p) =>
            `<div class="manual-item"><span class="tool-icon" style="--swatch:${p.color}">${p.icon}</span><div><b>${p.name} · ${p.cost}◆ · ${p.hp} HP</b><p>${p.desc}</p></div></div>`,
        )
        .join(
          "",
        )}</div><h3>Four ways to make a point</h3><div class="manual-grid">${Object.values(
        S.WEAPONS,
      )
        .map(
          (p) =>
            `<div class="manual-item"><span class="tool-icon">${p.icon}</span><div><b>${p.name} · ${p.cost}◆</b><p>${p.desc}</p></div></div>`,
        )
        .join(
          "",
        )}</div><h3>Read the battlefield</h3><p>Each side has a <b>7-column × 6-row</b> grid. Row 1 is ground; column 1 faces the enemy. The command room is at <b>column 5, row 1</b>. Cannon, drill, and scatter shots enter from the center and strike the first block(s) in the selected row, regardless of the column you click. Mortars hit the exact cell. Target outlines preview hits against the current fortress; your rival’s new defenses can change them.</p><h3>Why did my tower fall?</h3><p>A block survives only if it has a connected path to the ground through horizontal or vertical neighbors. A connection can also be diagonal when either block is a <b>Brace</b>. After all weapon damage and powder explosions, unsupported pieces disappear as rubble. They don’t damage blocks below or detonate. A destroyed Powder block deals <b>6 blast damage</b> to its four neighboring cells and can trigger other Powder blocks. Armor reduces damage before shields.</p><h3>Supplies & a siege that must end</h3><p>Start with <b>10 supplies</b>. Gain <b>4 each round</b>, plus 1 per surviving Mint (maximum +2). Store up to <b>20</b>. Each surviving Arsenal adds 1 damage to each weapon hit (maximum +2); both attacks use the same pre-damage Arsenal count.</p><div class="manual-callout"><b>Rising pressure:</b> from round 13 (round 9 in quick mode), both command rooms take 2 unavoidable damage each round. This increases by 2 every two rounds. It bypasses all armor and shields, so no siege lasts forever. A 30-round hard limit is a draw.</div><h3>A few good grudges</h3><p>Screen your command room from cannons. Use mortars when your rival keeps building. Reinforce when you expect an attack. Mints are an investment; Powder is a liability. Predict whether your rival can afford to wait.</p><h3>Controls & privacy</h3><p>Click or tap to select tools and cells. Tab and Enter also work. Arrow keys move between battlefield cells. Keys <b>1 / 2 / 3</b> select build / reinforce / fire. <b>P</b> covers a planning screen. Switching tabs also covers it. Pending orders are never displayed during handoffs. Keep the other player looking away during entry; this is an honor-system local game. Reloading closes the current match.</p>`,
    );
  }
  function settingsModal() {
    showModal(
      "Set the atmosphere.",
      `<p>A little cannon thunder, at a civilized volume.</p><div class="setting-row"><div><label for="volume">Sound effects <span id="volume-value">${Math.round(settings.volume * 100)}%</span></label><small>Clicks, construction, cannon fire, and victory.</small></div><input id="volume" type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}"></div><div class="setting-row"><div><label for="reduced">Reduce motion</label><small>Quick resolution with no flying projectiles.</small></div><input id="reduced" type="checkbox" ${settings.reduced ? "checked" : ""}></div><div class="modal-actions"><button class="secondary" data-do="test-sound">Test sound</button><button class="primary" data-do="close">All set</button></div>`,
    );
  }
  function history() {
    showModal(
      "The round journal",
      game.history.length
        ? game.history
            .map(
              (r) =>
                `<article class="history-round"><h3>Round ${r.round}</h3>${r.plans.map((p, i) => `<p><b>${esc(game.players[i].name)}:</b> ${describe(p, true)} · ${S.planCost(p)} supplies</p>`).join("")}<p>${r.events.filter((e) => e.kind === "destroy" || e.kind === "collapse").length} blocks lost${r.events.some((e) => e.kind === "pressure") ? ` · Pressure dealt ${r.events.find((e) => e.kind === "pressure").amount} to both command rooms` : ""}</p></article>`,
            )
            .join("")
        : "<p>No shots fired. No grudges recorded. Complete a round to start the journal.</p>",
    );
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.cell) {
      cellClick(...b.dataset.cell.split(",").map(Number));
      return;
    }
    if (b.dataset.kind) {
      kind = b.dataset.kind;
      newDraft();
      sound("click");
      render();
      $(`[data-kind="${kind}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (b.dataset.tool) {
      if (kind === "build") piece = b.dataset.tool;
      else {
        weapon = b.dataset.tool;
        draft.weapon = weapon;
      }
      sound("click");
      render();
      $(`[data-tool="${b.dataset.tool}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (b.dataset.mode) {
      readNames();
      mode = b.dataset.mode;
      sound("click");
      render();
      return;
    }
    const action = b.dataset.do;
    if (!action) return;
    if (!["resolve", "test-sound"].includes(action)) sound("click");
    if (action === "manual") manual();
    if (action === "settings") settingsModal();
    if (action === "close") closeModal();
    if (action === "setup") {
      phase = "setup";
      render();
      window.scrollTo(0, 0);
    }
    if (action === "begin") {
      readNames();
      start();
    }
    if (action === "rematch") start();
    if (action === "ready") {
      phase = "planning";
      if (!resume) {
        kind = "build";
        piece = "stone";
        weapon = "cannon";
        newDraft();
      }
      resume = false;
      render();
    }
    if (action === "lock") lock();
    if (action === "clear") {
      newDraft();
      render();
    }
    if (action === "hold")
      showModal(
        "Keep your powder dry?",
        `<p>Lock a <b>Hold & save</b> order. You spend nothing this round and collect your usual supplies after resolution. Your fortress receives no new protection.</p>`,
        `<button class="secondary" data-do="close">Keep planning</button><button class="primary" data-do="confirm-hold">Lock hold order</button>`,
      );
    if (action === "confirm-hold") {
      closeModal();
      draft = { kind: "pass" };
      lock();
    }
    if (action === "resolve") resolveRound();
    if (action === "next") {
      if (game.result) {
        phase = "result";
        render();
        window.scrollTo(0, 0);
      } else {
        plans = [null, null];
        active = (game.round - 1) % 2;
        resume = false;
        phase = "curtain";
        render();
        window.scrollTo(0, 0);
      }
    }
    if (action === "history") history();
    if (action === "test-sound") sound("place");
    if (action === "home") {
      if (game && !game.result && !["title", "setup"].includes(phase))
        showModal(
          "Leave this siege?",
          `<p>The current match will end. Your unfinished duel cannot be recovered.</p>`,
          `<button class="secondary" data-do="close">Stay here</button><button class="primary" data-do="confirm-home">Leave match</button>`,
        );
      else {
        phase = "title";
        game = null;
        render();
      }
    }
    if (action === "confirm-home") {
      closeModal();
      phase = "title";
      game = null;
      plans = [null, null];
      draft = null;
      animation = null;
      render();
      window.scrollTo(0, 0);
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "volume") {
      settings.volume = Number(e.target.value) / 100;
      $("#volume-value").textContent = `${e.target.value}%`;
      saveSettings();
    }
    if (e.target.id === "reduced") {
      settings.reduced = e.target.checked;
      saveSettings();
    }
  });
  document.addEventListener("keydown", (e) => {
    const modal = $(".modal");
    if (modal) {
      if (e.key === "Escape") {
        closeModal();
        return;
      }
      if (e.key === "Tab") {
        const all = [
            ...modal.querySelectorAll('button,input,a,[tabindex="0"]'),
          ].filter((x) => !x.disabled),
          first = all[0],
          end = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          end.focus();
        } else if (!e.shiftKey && document.activeElement === end) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (phase !== "planning" || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (["1", "2", "3"].includes(e.key)) {
      kind = ["build", "reinforce", "fire"][Number(e.key) - 1];
      newDraft();
      render();
      e.preventDefault();
    }
    if (e.key.toLowerCase() === "p") {
      phase = "curtain";
      resume = true;
      render();
      e.preventDefault();
    }
    if (e.target.dataset.cell && e.key.startsWith("Arrow")) {
      let [side, x, y] = e.target.dataset.cell.split(",").map(Number);
      if (e.key === "ArrowUp") y++;
      if (e.key === "ArrowDown") y--;
      if (e.key === "ArrowLeft") x += side ? -1 : 1;
      if (e.key === "ArrowRight") x += side ? 1 : -1;
      const next = $(`[data-cell="${side},${x},${y}"]`);
      if (next && !next.disabled) next.focus({ preventScroll: true });
      e.preventDefault();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && phase === "planning") {
      closeModal();
      phase = "curtain";
      resume = true;
      render();
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (game && !game.result) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  render();
})();
