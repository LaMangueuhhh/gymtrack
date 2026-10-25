// Défi quotidien : 4 exercices au poids du corps, faisables à la maison.
// Le défi change chaque jour et devient plus dur au fil des défis réussis.

// [idExercice, objectif au niveau 1, unité, info]
const DEFI_POOLS = {
  pousse: [["pompes", 15, "reps"], ["c_pompes_diamant", 8, "reps"], ["c_pompes_declinees", 10, "reps", "pieds sur une chaise"], ["c_dips_triceps", 10, "reps", "sur une chaise ou un banc"]],
  jambes: [["c_squat_pdc", 25, "reps"], ["c_fentes_marchees", 12, "reps/jambe"], ["c_pistol", 3, "reps/jambe", "tiens-toi à un mur si besoin"], ["step_ups", 12, "reps/jambe", "sur une marche ou une chaise"]],
  gainage: [["gainage", 40, "s"], ["c_gainage_lateral", 25, "s/côté"], ["mountain_climbers", 30, "s"]],
  bonus: [["tractions", 4, "reps", "si tu as une barre (sinon : rowing sous une table)"], ["c_superman", 15, "reps"], ["crunch", 20, "reps"], ["russian_twist", 24, "reps"], ["c_australian", 10, "reps", "sous une table solide"], ["releve_jambes", 8, "reps", "si tu as une barre (sinon : allongé au sol)"]],
};
const DEFI_LEVELS = ["", "Échauffement", "Débutant", "Régulier", "Solide", "Costaud", "Athlète", "Machine", "Bête", "Légende", "Dieu du pdc"];

// Petit générateur pseudo-aléatoire : le même défi toute la journée
function seeded(seed) { let x = seed % 2147483647; if (x <= 0) x += 2147483646; return () => (x = (x * 16807) % 2147483647) / 2147483647; }
const daySeed = (d) => Number(d.replace(/-/g, ""));

function defiDoneDays() { return Object.keys(state.defis).filter((d) => state.defis[d].complete).sort(); }
function defiLevel() {
  const auto = Math.min(10, 1 + Math.floor(defiDoneDays().length / 3));
  return Math.max(1, Math.min(10, auto + (state.settings.defiOffset || 0)));
}
function defiStreak() {
  let n = 0; const d = new Date();
  if (!state.defis[dayStr(d)]?.complete) d.setDate(d.getDate() - 1); // aujourd'hui pas encore fait : la série tient encore
  while (state.defis[dayStr(d)]?.complete) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function bestStreak() {
  let best = 0, cur = 0, prev = null;
  for (const d of defiDoneDays()) {
    const p = parseDay(d); p.setDate(p.getDate() - 1);
    cur = prev === dayStr(p) ? cur + 1 : 1; prev = d; best = Math.max(best, cur);
  }
  return best;
}

// Le défi d'un jour donné
function defiOf(d) {
  const saved = state.defis[d];
  const lvl = saved?.lvl || defiLevel();
  const rnd = seeded(daySeed(d));
  const pick = (pool) => pool[Math.floor(rnd() * pool.length)];
  const f = 1 + (lvl - 1) * 0.22;
  const items = ["pousse", "jambes", "gainage", "bonus"].map((k) => {
    const [exId, base, unit, info] = pick(DEFI_POOLS[k]);
    const step = unit.startsWith("s") ? 5 : 1;
    return { exId, target: Math.max(1, Math.round((base * f) / step) * step), unit, info };
  });
  const sets = lvl >= 7 ? 4 : lvl >= 4 ? 3 : 2; // l'objectif total se fait en plusieurs séries
  return { lvl, items, sets, done: saved?.done || [] };
}

function defiRecords(exId) { return (state.defiRec[exId] || []).map((r) => r.v); }

function viewDefi() {
  setTitle("Défi du jour");
  const d = dayStr(), df = defiOf(d), streak = defiStreak();
  const doneN = df.done.length, complete = state.defis[d]?.complete;
  let html = `<div class="card defi-hero ${complete ? "complete" : ""}">
    <div class="row between"><div><p class="eyebrow">Niveau ${df.lvl} · ${DEFI_LEVELS[df.lvl]}</p>
      <h2 style="margin:0">${complete ? "Défi réussi 🔥" : "Défi du jour"}</h2></div>
      <div class="streak"><b>${streak}</b><span>🔥 jour${streak > 1 ? "s" : ""}</span></div></div>
    <p class="muted small">À la maison, sans matériel. Fais l'objectif total de chaque exercice en <b style="color:var(--text)">${df.sets} séries</b> ou plus, puis valide-le.</p>
    <div class="progress"><div style="width:${(doneN / df.items.length) * 100}%"></div></div>
    <div class="muted small" style="margin-top:6px">${doneN}/${df.items.length} exercices validés</div></div>`;

  html += `<div class="card list-card">${df.items.map((it, i) => {
    const ex = exById(it.exId), ok = df.done.includes(i), timed = it.unit.startsWith("s");
    return `<div class="defi-item ${ok ? "ok" : ""}">
      <img class="thumb" src="${imgUrl(ex)}" alt="" data-act="ex-info" data-id="${ex.id}">
      <div class="grow"><b>${esc(ex.nom)}</b>
        <div class="defi-target">${it.target} <span>${it.unit}</span></div>
        ${it.info ? `<div class="muted small">${esc(it.info)}</div>` : ""}</div>
      ${timed && !ok ? `<button class="icon-btn" data-act="defi-timer" data-i="${i}" aria-label="Chrono">⏱</button>` : ""}
      <button class="check big-check" data-act="defi-check" data-i="${i}" aria-label="Valider">${ok ? "✓" : ""}</button></div>`;
  }).join("")}</div>`;

  // 4 dernières semaines
  const days = [...Array(28)].map((_, i) => { const x = new Date(); x.setDate(x.getDate() - 27 + i); return dayStr(x); });
  html += `<div class="section-title">4 dernières semaines</div><div class="card">
    <div class="defi-days">${days.map((x) => `<span class="${state.defis[x]?.complete ? "on" : state.defis[x]?.done?.length ? "half" : ""} ${x === d ? "today" : ""}" title="${fmtShort(x)}"></span>`).join("")}</div>
    <div class="grid3" style="margin:12px 0 0">
      <div class="stat"><b>${defiDoneDays().length}</b><span>défis réussis</span></div>
      <div class="stat"><b>${bestStreak()}</b><span>meilleure série 🔥</span></div>
      <div class="stat"><b>${df.lvl}/10</b><span>niveau</span></div></div></div>`;

  // Tests de records max (comptent pour les rangs)
  const tests = ["pompes", "tractions", "c_squat_pdc", "gainage", "c_dips_triceps", "c_pompes_diamant"];
  html += `<div class="section-title">Mes records maison</div><div class="card list-card">${tests.map((id) => {
    const ex = exById(id), info = rankInfo(ex), rec = Math.max(0, ...defiRecords(id), rankValue(ex) || 0);
    return `<div class="list-item" data-act="defi-test" data-id="${id}">${rankBadge(info?.i ?? 0, 34)}
      <div class="grow"><b>${esc(ex.nom)}</b><div class="muted small">${rec ? `Record : ${rec} ${ex.type === "temps" ? "s" : "reps"} · ${RANKS[Math.max(0, info.i)].nom}` : "Pas encore testé"}</div></div>
      <span class="btn sm">Tester</span></div>`;
  }).join("")}</div>`;

  html += `<div class="card"><h3>Difficulté</h3><p class="muted small" style="margin:4px 0 10px">Le niveau monte tout seul tous les 3 défis réussis. Trop facile ou trop dur ? Ajuste ici (s'applique à partir de demain si tu as déjà commencé aujourd'hui).</p>
    <div class="row"><button class="btn sm" data-act="defi-lvl" data-v="-1">− Plus facile</button><div class="grow center"><b>${defiLevel()}</b>/10</div><button class="btn sm" data-act="defi-lvl" data-v="1">＋ Plus dur</button></div></div>`;
  return html;
}

// Chrono pour le gainage et les exos en secondes
let defiTimerInt = null;
function defiTimerModal(i) {
  const df = defiOf(dayStr()), it = df.items[i], ex = exById(it.exId);
  const total = it.target;
  openModal(ex.nom, `<div class="center">
    <div class="timer-big" id="dtTime">${fmtTime(total)}</div>
    <p class="muted small">${it.unit.includes("côté") ? "Fais un côté, puis relance pour l'autre côté." : "Tiens la position jusqu'à zéro."}</p>
    <div class="row"><button class="btn grow" data-act="close-modal">Annuler</button><button class="btn primary grow" id="dtStart">▶ Go</button></div></div>`,
    () => clearInterval(defiTimerInt));
  $("dtStart").onclick = () => {
    let left = 3; $("dtStart").disabled = true;
    $("dtTime").textContent = "Prêt…";
    clearInterval(defiTimerInt);
    let phase = "prep";
    defiTimerInt = setInterval(() => {
      left--;
      if (phase === "prep") { $("dtTime").textContent = left > 0 ? left : "GO"; if (left <= 0) { phase = "run"; left = total; beep(); } return; }
      $("dtTime").textContent = fmtTime(Math.max(0, left));
      if (left <= 0) {
        clearInterval(defiTimerInt); beep(); if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        $("dtTime").textContent = "✓"; $("dtStart").disabled = false; $("dtStart").textContent = "Refaire";
        if (!it.unit.includes("côté")) defiToggle(i, true);
      }
    }, 1000);
  };
}

function defiToggle(i, forceOn = false) {
  const d = dayStr(), df = defiOf(d);
  const rec = (state.defis[d] = state.defis[d] || { lvl: df.lvl, done: [] });
  const has = rec.done.includes(i);
  if (has && !forceOn) rec.done = rec.done.filter((x) => x !== i);
  else if (!has) rec.done.push(i);
  const wasComplete = rec.complete;
  rec.complete = rec.done.length === df.items.length;
  save();
  if (rec.complete && !wasComplete) {
    if (navigator.vibrate) navigator.vibrate([80, 60, 80, 60, 200]);
    toast(`🔥 Défi réussi ! Série : ${defiStreak()} jour${defiStreak() > 1 ? "s" : ""}`, 3500);
  }
  if (route.lastName === "defi") route();
}

function defiTestModal(id) {
  const ex = exById(id), timed = ex.type === "temps";
  openModal(`Test max : ${ex.nom}`, `<div class="stack">
    <p class="muted small" style="margin:0">${timed ? "Tiens le plus longtemps possible, puis note ton temps." : "Fais le maximum de reps propres en UNE seule série, puis note-le."} Ça compte pour ton rang.</p>
    <label class="field">${timed ? "Temps tenu (secondes)" : "Nombre de reps"}<input id="testIn" inputmode="numeric" autofocus></label>
    <button class="btn primary block" data-act="defi-test-save" data-id="${id}">Enregistrer</button>
    ${(state.defiRec[id] || []).length ? `<div class="section-title">Historique</div>${[...state.defiRec[id]].reverse().slice(0, 8).map((r) => `<div class="row between small"><span class="muted">${fmtDay(r.d)}</span><b>${r.v} ${timed ? "s" : "reps"}</b></div>`).join("")}` : ""}
  </div>`);
}
