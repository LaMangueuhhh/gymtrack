// Séances programmées à l'avance : on choisit une date (et une heure), la séance ne se lance pas.
// Le jour J elle apparaît sur l'accueil, dans l'agenda, et un rappel arrive 30 min avant l'heure.

const plannedOn = (d) => state.planned.filter((p) => p.date === d).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
const upcomingPlanned = () => state.planned.filter((p) => !p.done && p.date >= dayStr()).sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
const fmtPlanDay = (d) => (d === dayStr() ? "Aujourd'hui" : d === dayStr(new Date(Date.now() + 864e5)) ? "Demain" : fmtDay(d, { weekday: "long", day: "numeric", month: "short" }));

// Fenêtre « Programmer » : date + heure (optionnelle)
function planModal(w) {
  planModal.after = null;
  planModal.w = { nom: w.nom, ex: w.ex.map((x) => [...x]) };
  const tomorrow = dayStr(new Date(Date.now() + 864e5));
  openModal(`📅 Programmer « ${w.nom} »`, `<div class="stack">
    <div class="chips">${[0, 1, 2, 3, 4, 5, 6].map((k) => { const x = new Date(); x.setDate(x.getDate() + k); const d = dayStr(x);
      return `<button class="chip ${d === tomorrow ? "on" : ""}" data-act="plan-day" data-d="${d}">${k === 0 ? "Aujourd'hui" : k === 1 ? "Demain" : x.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}</button>`; }).join("")}</div>
    <div class="grid2"><label class="field">Date<input type="date" id="planDate" value="${tomorrow}" min="${dayStr()}"></label>
      <label class="field">Heure (optionnel)<input type="time" id="planTime" value="18:00"></label></div>
    <p class="muted small" style="margin:0">La séance ne démarre pas maintenant : elle t'attendra sur l'accueil le jour J, avec un rappel 30 min avant.</p>
    <button class="btn primary block big" data-act="plan-save">📅 Programmer</button></div>`);
}

function savePlan() {
  const date = $("planDate").value, time = $("planTime").value;
  if (!date) return toast("Choisis une date");
  state.planned.push({ id: uid(), date, time, nom: planModal.w.nom, ex: planModal.w.ex, done: null });
  save(); closeModal();
  toast(`📅 « ${planModal.w.nom} » programmée ${fmtPlanDay(date).toLowerCase()}${time ? " à " + time : ""}`, 3500);
  if (planModal.after) { const f = planModal.after; planModal.after = null; f(); }
  else if (route.lastName === "accueil" || route.lastName === "agenda") route();
}

function startPlanned(id) {
  const p = state.planned.find((x) => x.id === id);
  if (!p) return;
  startSession(p.nom, p.ex.map(([exId, sets, reps, restS]) => ({ exId, sets, target: `${sets} × ${reps}`, rest: restS })), { plannedId: p.id });
}

// Une ligne de séance programmée
function plannedRow(p, withDate = true) {
  const w = { ex: p.ex };
  return `<div class="list-item plan-row ${p.done ? "done" : ""}">
    <div class="plan-date"><b>${p.time || "📌"}</b>${withDate ? `<span>${esc(fmtPlanDay(p.date).split(" ").slice(0, 2).join(" "))}</span>` : ""}</div>
    <div class="grow"><b>${esc(p.nom)}</b><div class="muted small">⏱ ${workoutMinutes(w)} min · ${p.ex.length} exos${p.done ? " · ✅ faite" : ""}</div></div>
    ${p.done ? "" : `<button class="btn sm primary" data-act="plan-start" data-id="${p.id}">▶</button>`}
    <button class="icon-btn" data-act="plan-menu" data-id="${p.id}" aria-label="Options">⋯</button></div>`;
}

// Carte de l'accueil : séance prévue aujourd'hui (prioritaire sur la séance proposée)
function plannedTodayCard() {
  const p = plannedOn(dayStr()).find((x) => !x.done);
  if (!p) return "";
  return `<div class="card highlight"><p class="eyebrow">📌 Prévue aujourd'hui${p.time ? " à " + p.time : ""}</p><h2>${esc(p.nom)}</h2>
    <div class="w-thumbs big">${p.ex.slice(0, 4).map(([id]) => `<img src="${imgUrl(exById(id))}" alt="" loading="lazy">`).join("")}</div>
    <p class="muted small">⏱ ${workoutMinutes({ ex: p.ex })} min · ${p.ex.length} exos · ${workoutMuscles({ ex: p.ex }).join(", ")}</p>
    <div class="row"><button class="btn primary grow big" data-act="plan-start" data-id="${p.id}">▶ Commencer</button>
      <button class="btn" data-act="plan-menu" data-id="${p.id}">⋯</button></div></div>`;
}
function upcomingCard() {
  const list = upcomingPlanned().filter((p) => p.date > dayStr()).slice(0, 3);
  if (!list.length) return "";
  return `<div class="section-title">📅 Prochaines séances</div><div class="card list-card">${list.map((p) => plannedRow(p)).join("")}</div>`;
}

function planMenu(id) {
  const p = state.planned.find((x) => x.id === id);
  openModal(p.nom, `<div class="stack">
    <p class="muted small" style="margin:0">Prévue ${fmtPlanDay(p.date).toLowerCase()}${p.time ? " à " + p.time : ""} · ${p.ex.length} exos</p>
    ${p.done ? "" : `<button class="btn primary block" data-act="plan-start" data-id="${p.id}">▶ Commencer maintenant</button>`}
    <div class="grid2"><label class="field">Déplacer au<input type="date" id="mvDate" value="${p.date}" min="${dayStr()}"></label>
      <label class="field">Heure<input type="time" id="mvTime" value="${p.time || ""}"></label></div>
    <button class="btn block" data-act="plan-move" data-id="${p.id}">📅 Enregistrer la nouvelle date</button>
    <div class="card list-card" style="margin:0">${p.ex.map(([id, sets, reps]) => `<div class="list-item" data-act="ex-info" data-id="${id}"><img class="thumb" src="${imgUrl(exById(id))}" alt="" loading="lazy">
      <div class="grow"><b>${esc(exById(id).nom)}</b><div class="muted small">${sets} × ${esc(reps)}</div></div></div>`).join("")}</div>
    <button class="btn danger block" data-act="plan-del" data-id="${p.id}">🗑 Annuler cette séance prévue</button></div>`);
}

// Choisir quelle séance programmer depuis l'agenda (jour futur)
function planPickModal(d) {
  const mine = state.myWorkouts, ready = WORKOUTS;
  openModal(`📅 ${fmtPlanDay(d)}`, `<div class="stack">
    ${plannedOn(d).length ? `<div class="card list-card" style="margin:0">${plannedOn(d).map((p) => plannedRow(p, false)).join("")}</div>` : `<p class="muted small" style="margin:0">Rien de prévu ce jour-là.</p>`}
    <a class="btn primary block" href="#/creer" data-act="plan-create" data-d="${d}">✏️ Créer une séance pour ce jour</a>
    <div class="section-title" style="margin:6px 0 0">Ou choisis une séance existante</div>
    <div class="card list-card" style="margin:0">${[...mine, ...ready].map((w) => `<div class="list-item" data-act="plan-pick" data-id="${w.id}" data-d="${d}">
      <div class="grow"><b>${esc(w.nom)}</b><div class="muted small">${w.mine ? "Mes séances · " : ""}⏱ ${workoutMinutes(w)} min · ${w.ex.length} exos</div></div><span class="arrow">＋</span></div>`).join("")}</div></div>`);
}

// Rappel 30 min avant une séance programmée avec une heure (appelé avec les autres rappels)
function checkPlanned() {
  const now = new Date(), today = dayStr(now), mins = now.getHours() * 60 + now.getMinutes();
  for (const p of state.planned) {
    if (p.done || p.date !== today || !p.time || p.notified) continue;
    const t = toMin(p.time);
    if (mins >= t - 30 && mins <= t + 60) { p.notified = true; save(); notify("🏋️ GymTrack", `${mins < t ? "Dans " + (t - mins) + " min" : "C'est l'heure"} : « ${p.nom} » 💪`); }
  }
}
setInterval(checkPlanned, 30000);
