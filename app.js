// GymTrack — appli de suivi muscu / nutrition / corps.
const APP_VERSION = "10 · 25/10/2026";
// Tout est stocké en local sur le téléphone (localStorage). Aucun compte, aucun serveur, 100% gratuit.

// ============================================================
//  Outils
// ============================================================
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? 0 : n; };
const r1 = (n) => Math.round(n * 10) / 10;
const pad = (n) => String(n).padStart(2, "0");
const dayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtDay = (s, opts = { weekday: "short", day: "numeric", month: "short" }) => parseDay(s).toLocaleDateString("fr-FR", opts);
const fmtShort = (s) => parseDay(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const fmtTime = (sec) => `${Math.floor(sec / 60)}:${pad(Math.floor(sec % 60))}`;
const exById = (id) => EXERCISES.find((e) => e.id === id) || (state.customEx || []).find((e) => e.id === id);
const imgUrl = (ex, i = 0) => (ex && ex.img ? `${IMG_BASE}${ex.img}/${i}.jpg` : "icons/icon-192.png");

// Champs à saisir pour chaque série selon le type d'exercice
const FIELDS = {
  force: [["kg", "kg"], ["reps", "reps"]],
  pdc: [["kg", "lest kg"], ["reps", "reps"]],
  temps: [["sec", "secondes"]],
  cardio: [["min", "min"], ["km", "km"]],
  tapis: [["min", "min"], ["vit", "km/h"], ["pente", "pente %"]],
};
const FEELS = ["😫", "😕", "😐", "🙂", "💪"];
const MEALS = { pdj: "Petit-déjeuner", dej: "Déjeuner", diner: "Dîner", snack: "Collations" };

// ============================================================
//  Données (stockage local)
// ============================================================
const STORE_KEY = "gymtrack_v1";
const DEFAULT_STATE = {
  profile: { sexe: "h", age: "", taille: "", poids: "", activite: "1.55", objectif: "maintien", kcalPerso: "" },
  sessions: [],
  current: null,
  body: [],
  food: {},
  recentFoods: [],
  activeProgram: null,
  visits: [],
  hidden: [],
  water: {},
  healthSent: {},
  defis: {},
  defiRec: {},
  reminders: [],
  myWorkouts: [],
  steps: {},
  sleep: {},
  settings: { rest: 90, glass: 250, waterGoal: "", health: { on: false }, defiOffset: 0 },
};
let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s) return { ...structuredClone(DEFAULT_STATE), ...s, profile: { ...DEFAULT_STATE.profile, ...s.profile }, settings: { ...DEFAULT_STATE.settings, ...s.settings } };
  } catch (e) { /* données corrompues : on repart de zéro */ }
  return structuredClone(DEFAULT_STATE);
}
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => localStorage.setItem(STORE_KEY, JSON.stringify(state)), 150);
}
function saveNow() { clearTimeout(saveTimer); localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
window.addEventListener("pagehide", saveNow);
document.addEventListener("visibilitychange", () => document.hidden && saveNow());

// ============================================================
//  Calculs
// ============================================================
function currentWeight() {
  const last = [...state.body].sort((a, b) => a.date.localeCompare(b.date)).filter((b) => num(b.poids) > 0).pop();
  return last ? num(last.poids) : num(state.profile.poids);
}

// Besoin calorique (formule de Mifflin-St Jeor) + répartition des macros selon l'objectif
function nutritionGoals() {
  const p = state.profile;
  const w = currentWeight(), h = num(p.taille), a = num(p.age);
  const obj = OBJECTIFS[p.objectif] || OBJECTIFS.maintien;
  if (!w || !h || !a) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sexe === "f" ? -161 : 5);
  const tdee = bmr * num(p.activite || 1.55);
  const kcal = num(p.kcalPerso) || Math.round((tdee * (1 + obj.kcal)) / 10) * 10;
  const prot = Math.round(obj.prot * w);
  const lip = Math.round(0.9 * w);
  const gluc = Math.max(0, Math.round((kcal - prot * 4 - lip * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, prot, lip, gluc };
}

// Objectif calorique ADAPTATIF : le budget est calculé sur la semaine (lundi → dimanche).
// Si tu manges plus un jour, l'excédent est retiré des jours suivants (et inversement), réparti sur les jours restants.
// Un jour sans rien de noté compte comme « à l'objectif ».
const MIN_KCAL = () => (state.profile.sexe === "f" ? 1200 : 1500);
function dayKcal(d) { const e = state.food[d]; return e && e.length ? foodTotals(e).k : null; }
function weekDays(d) { const ws = weekStart(parseDay(d)); return [...Array(7)].map((_, i) => { const x = new Date(ws); x.setDate(x.getDate() + i); return dayStr(x); }); }
function dayGoals(d) {
  const g = nutritionGoals();
  if (!g) return null;
  const days = weekDays(d), idx = days.indexOf(d);
  // Les pas au-delà de ton activité habituelle ajoutent des calories à l'objectif du jour
  const steps = stepBonus(d), stepsBefore = days.slice(0, idx).reduce((a, x) => a + stepBonus(x), 0);
  const eatenBefore = days.slice(0, idx).reduce((a, x) => a + (dayKcal(x) ?? g.kcal + stepBonus(x)), 0);
  const weekEaten = eatenBefore + (dayKcal(d) || 0);
  const info = { base: g.kcal, steps, weekBudget: g.kcal * 7 + stepsBefore + steps, weekEaten, days, idx, adaptive: state.settings.adaptive !== false };
  const withMacros = (kcal) => ({ kcal, gluc: Math.max(0, Math.round((kcal - g.prot * 4 - g.lip * 9) / 4)) });
  if (!info.adaptive) return { ...g, ...info, ...withMacros(g.kcal + steps), delta: 0 };
  const raw = (g.kcal * 7 + stepsBefore - eatenBefore) / (7 - idx);
  const min = Math.max(MIN_KCAL(), Math.round(g.kcal * 0.75)), max = Math.round(g.kcal * 1.25);
  const adj = Math.round(Math.min(max, Math.max(min, raw)) / 10) * 10;
  return { ...g, ...info, ...withMacros(adj + steps), delta: adj - g.kcal, clamped: raw < min || raw > max };
}

function foodTotals(entries) {
  const t = { k: 0, p: 0, c: 0, f: 0 };
  for (const e of entries) {
    const q = num(e.g) / 100;
    t.k += num(e.k) * q; t.p += num(e.p) * q; t.c += num(e.c) * q; t.f += num(e.f) * q;
  }
  return t;
}

const isFilled = (type, s) => (type === "tapis" ? num(s.min) > 0 : FIELDS[type].some(([k]) => num(s[k]) > 0));

// Calories du tapis (équations ACSM) : marche < 7 km/h, course au-delà ; la pente compte beaucoup
function treadmillKcal(min, vit, pente, kg) {
  const S = (vit * 1000) / 60, G = pente / 100;
  const vo2 = vit < 7 ? 3.5 + 0.1 * S + 1.8 * S * G : 3.5 + 0.2 * S + 0.9 * S * G;
  return ((vo2 * kg) / 1000) * 5 * min;
}
// Vitesse d'une série de tapis (anciennes séances : déduite de la distance)
const tapisVit = (s) => num(s.vit) || (num(s.km) && num(s.min) ? (num(s.km) * 60) / num(s.min) : 0);
function setKcal(ex, s) {
  const kg = currentWeight() || 75;
  if (ex.type === "tapis") return treadmillKcal(num(s.min), tapisVit(s), num(s.pente), kg);
  if (ex.type === "cardio") return ((ex.met || 7) * kg * num(s.min)) / 60;
  return 0;
}

// Statistiques d'un exercice dans une séance
function exStats(type, sets, ex) {
  const done = sets.filter((s) => isFilled(type, s));
  const st = { sets: done.length };
  if (type === "force") {
    st.e1rm = Math.max(0, ...done.map((s) => (num(s.reps) <= 1 ? num(s.kg) : num(s.kg) * (1 + num(s.reps) / 30))));
    st.maxKg = Math.max(0, ...done.map((s) => num(s.kg)));
    st.volume = done.reduce((a, s) => a + num(s.kg) * num(s.reps), 0);
  } else if (type === "pdc") {
    st.maxReps = Math.max(0, ...done.map((s) => num(s.reps)));
    st.totalReps = done.reduce((a, s) => a + num(s.reps), 0);
    st.maxKg = Math.max(0, ...done.map((s) => num(s.kg)));
  } else if (type === "temps") {
    st.maxSec = Math.max(0, ...done.map((s) => num(s.sec)));
    st.totalSec = done.reduce((a, s) => a + num(s.sec), 0);
  } else if (type === "tapis") {
    st.min = done.reduce((a, s) => a + num(s.min), 0);
    st.km = r1(done.reduce((a, s) => a + (num(s.min) * tapisVit(s)) / 60, 0));
    st.vitMax = Math.max(0, ...done.map(tapisVit));
    st.penteMax = Math.max(0, ...done.map((s) => num(s.pente)));
    st.kcal = Math.round(done.reduce((a, s) => a + treadmillKcal(num(s.min), tapisVit(s), num(s.pente), currentWeight() || 75), 0));
  } else {
    st.min = done.reduce((a, s) => a + num(s.min), 0);
    st.km = done.reduce((a, s) => a + num(s.km), 0);
    st.kcal = Math.round(done.reduce((a, s) => a + setKcal(ex || { type: "cardio" }, s), 0));
  }
  return st;
}
const METRICS = {
  force: [["e1rm", "1RM estimé (kg)"], ["maxKg", "Charge max (kg)"], ["volume", "Volume (kg)"]],
  pdc: [["maxReps", "Reps max"], ["totalReps", "Reps totales"], ["maxKg", "Lest max (kg)"]],
  temps: [["maxSec", "Meilleur temps (s)"], ["totalSec", "Temps total (s)"]],
  cardio: [["kcal", "Calories (kcal)"], ["min", "Durée (min)"], ["km", "Distance (km)"]],
  tapis: [["kcal", "Calories (kcal)"], ["km", "Distance (km)"], ["min", "Durée (min)"], ["vitMax", "Vitesse max (km/h)"]],
};

function setText(type, s) {
  if (type === "force") return `${r1(num(s.kg))} kg × ${num(s.reps)}`;
  if (type === "pdc") return `${num(s.reps)} reps${num(s.kg) ? ` (+${r1(num(s.kg))} kg)` : ""}`;
  if (type === "temps") return `${num(s.sec)} s`;
  if (type === "tapis") return `${num(s.min)} min · ${r1(tapisVit(s))} km/h${num(s.pente) ? ` · ${num(s.pente)} %` : ""}`;
  return `${num(s.min)} min${num(s.km) ? ` · ${r1(num(s.km))} km` : ""}`;
}

function sessionVolume(s) {
  return s.exercises.reduce((a, e) => { const ex = exById(e.exId); return a + (ex && ex.type === "force" ? exStats("force", e.sets).volume : 0); }, 0);
}

// Historique d'un exercice : [{date, stats, sets, sessionId}] du plus ancien au plus récent
function exHistory(exId) {
  const ex = exById(exId);
  const out = [];
  for (const s of [...state.sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const e of s.exercises) if (e.exId === exId) out.push({ date: s.date, sets: e.sets, stats: exStats(ex.type, e.sets, ex), sessionId: s.id });
  }
  return out;
}
function lastPerf(exId) { const h = exHistory(exId); return h.length ? h[h.length - 1] : null; }

function weekStart(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function sessionsThisWeek() { const ws = dayStr(weekStart()); return state.sessions.filter((s) => s.date >= ws).length; }

// ============================================================
//  Petits éléments d'interface
// ============================================================
function toast(msg, ms = 2200) {
  const t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), ms);
}

let modalCleanup = null;
function openModal(title, html, cleanup) {
  closeModal();
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = html;
  $("modal").hidden = false;
  document.body.classList.add("modal-open");
  modalCleanup = cleanup || null;
}
function closeModal() {
  if (modalCleanup) { try { modalCleanup(); } catch (e) { /* ignore */ } modalCleanup = null; }
  $("modal").hidden = true;
  document.body.classList.remove("modal-open");
  $("modalBody").innerHTML = "";
}
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

let charts = [];
function destroyCharts() { charts.forEach((c) => c.destroy()); charts = []; }

// Style commun des graphiques (thème sombre, police du système)
if (typeof Chart !== "undefined") {
  Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = "#8b92a3";
  Chart.defaults.locale = "fr-FR";
}
const CH = { accent: "#c6ff3d", blue: "#4da3ff", orange: "#ff9f43", grid: "rgba(255,255,255,0.06)" };
// Dégradé vertical sous les courbes
const gradient = (color) => (ctx) => {
  const { chart } = ctx;
  if (!chart.chartArea) return color + "33";
  const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
  g.addColorStop(0, color + "55"); g.addColorStop(1, color + "00");
  return g;
};

// datasets : [{ label, data, color?, type?: "bar"|"line", axis?: "y2", dashed?, colors? (une couleur par barre) }]
function lineChart(canvasId, labels, datasets, opts = {}) {
  const el = $(canvasId);
  if (!el || typeof Chart === "undefined") return;
  const n = labels.length;
  charts.push(new Chart(el, {
    data: {
      labels,
      datasets: datasets.map((d, i) => {
        const color = d.color || [CH.accent, CH.blue, CH.orange][i];
        if ((d.type || opts.type) === "bar") {
          return { type: "bar", label: d.label, data: d.data, yAxisID: d.axis || "y", order: 2,
            backgroundColor: d.colors || color + "cc", hoverBackgroundColor: d.colors || color, borderRadius: 6, borderSkipped: false, maxBarThickness: 26 };
        }
        return { type: "line", label: d.label, data: d.data, yAxisID: d.axis || "y", order: 1,
          borderColor: color, borderWidth: d.dashed ? 1.5 : 2.5, borderDash: d.dashed ? [5, 5] : [], tension: 0.35, cubicInterpolationMode: "monotone",
          fill: !d.dashed && datasets.length === 1, backgroundColor: gradient(color), spanGaps: true,
          pointRadius: d.dashed ? 0 : (ctx) => (ctx.dataIndex === n - 1 || n <= 8 ? 4 : 0),
          pointBackgroundColor: "#0f1115", pointBorderColor: color, pointBorderWidth: 2, pointHoverRadius: 6, pointHitRadius: 14 };
      }),
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
      layout: { padding: { top: 6, right: 4 } },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: opts.legend ?? datasets.length > 1, position: "bottom", labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, padding: 14 } },
        tooltip: {
          backgroundColor: "#232731", borderColor: "#2e3340", borderWidth: 1, titleColor: "#f1f3f7", bodyColor: "#f1f3f7",
          padding: 10, cornerRadius: 10, displayColors: datasets.length > 1, boxPadding: 4,
          callbacks: { label: (c) => `${c.dataset.label} : ${c.formattedValue}${opts.unit && !c.dataset.axis ? " " + opts.unit : ""}` },
        },
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
        y: { grid: { color: CH.grid }, border: { display: false }, beginAtZero: !!opts.zero, ticks: { maxTicksLimit: 5, padding: 6 }, grace: "8%" },
        ...(opts.y2 ? { y2: { position: "right", min: 0, max: 10, grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 3 } } } : {}),
      },
    },
  }));
}

// En-tête de graphique : grosse valeur + évolution
function kpiHead(value, unit, delta, deltaLabel, inverse = false) {
  const good = inverse ? delta < 0 : delta > 0;
  const badge = delta == null || !isFinite(delta) ? "" :
    `<span class="kpi-delta ${delta === 0 ? "" : good ? "good" : "bad"}">${delta > 0 ? "▲ +" : delta < 0 ? "▼ " : ""}${r1(delta)}${unit ? " " + unit : ""}</span>`;
  return `<div class="kpi"><div><b>${value}</b><span>${unit || ""}</span></div><div class="kpi-sub">${badge}<small>${deltaLabel || ""}</small></div></div>`;
}

// Filtre de période pour les courbes
const PERIODS = [["1m", "1 mois", 31], ["3m", "3 mois", 92], ["6m", "6 mois", 183], ["all", "Tout", 0]];
function periodChips() {
  return `<div class="seg small-seg">${PERIODS.map(([k, l]) => `<button class="${ui.period === k ? "on" : ""}" data-act="period" data-k="${k}">${l}</button>`).join("")}</div>`;
}
function inPeriod(date) {
  const days = PERIODS.find(([k]) => k === ui.period)[2];
  if (!days) return true;
  const d = new Date(); d.setDate(d.getDate() - days);
  return date >= dayStr(d);
}

const muscleTags = (ex) =>
  ex.muscles.map((m) => `<span class="tag main">${MUSCLES[m]}</span>`).join("") +
  ex.secondaires.map((m) => `<span class="tag sec">${MUSCLES[m]}</span>`).join("");

// ============================================================
//  Routeur
// ============================================================
const ROUTES = {
  accueil: viewHome,
  agenda: viewAgenda,
  seances: viewAgenda,
  seance: viewSessionDetail,
  live: viewLive,
  entrainer: viewTrain,
  exos: () => viewTrain("exos"),
  exo: viewExercise,
  type: viewWorkout,
  sante: viewHealth,
  defi: viewDefi,
  creer: viewBuilder,
  import: viewImport,
  notifs: viewNotifs,
  rangs: viewRanks,
  progres: (id) => (id ? viewProgress(id) : viewProgressList()),
  programmes: () => viewTrain("programmes"),
  programme: viewProgram,
  nutrition: viewNutrition,
  corps: viewBody,
  reglages: viewSettings,
};
const TAB_OF = { agenda: "progres", rangs: "progres", seances: "progres", seance: "progres", live: "entrainer", exos: "entrainer", exo: "entrainer", programmes: "entrainer", programme: "entrainer", type: "entrainer", creer: "entrainer", import: "entrainer", reglages: "", sante: "", notifs: "" };
const TOP_LEVEL = ["accueil", "entrainer", "exos", "programmes", "defi", "agenda", "rangs", "seances", "progres", "nutrition", "corps"];
// Onglets internes de « Progrès »
const progSeg = (k) => `<div class="seg" style="margin-bottom:14px">${[["progres", "Exercices"], ["rangs", "Rangs"], ["agenda", "Agenda"]]
  .map(([r, l]) => `<button class="${k === r ? "on" : ""}" data-act="go" data-to="#/${r}">${l}</button>`).join("")}</div>`;
let ui = { exGroup: "Tous", exSearch: "", showHidden: false, foodDay: dayStr(), calMonth: dayStr().slice(0, 7), bodyMetric: "poids", progMetric: null, progFilter: "tous", period: "all", trainTab: "seances", wCat: "Tous" };

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/");
  const name = ROUTES[parts[0]] ? parts[0] : "accueil";
  const arg = parts[1] ? decodeURIComponent(parts[1]) : null;
  destroyCharts();
  const tab = TAB_OF[name] ?? name;
  document.querySelectorAll(".tabbar a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
  $("backBtn").hidden = TOP_LEVEL.includes(name) && !(name === "progres" && arg);
  const app = $("app");
  const html = ROUTES[name](arg);
  if (html !== undefined) app.innerHTML = html;
  if (route.after) { const f = route.after; route.after = null; f(); }
  if (route.lastName !== name || route.lastArg !== arg) window.scrollTo(0, 0);
  route.lastName = name; route.lastArg = arg;
  updateLiveBar();
}
// Petite barre « séance en cours » visible sur toutes les pages
function updateLiveBar() {
  const bar = $("liveBar");
  const show = !!state.current && route.lastName !== "live" && $("restTimer").hidden;
  bar.hidden = !show;
  document.body.classList.toggle("has-livebar", show);
  if (show) $("liveBarText").textContent = `${state.current.name} · ${fmtTime((Date.now() - state.current.start) / 1000)}`;
}
const setTitle = (t) => { $("title").textContent = t; document.title = `${t} · GymTrack`; };
const after = (f) => { route.after = f; };
const go = (h) => { if (location.hash === h) route(); else location.hash = h; };
// Changer de page ferme la fenêtre ouverte (sinon elle reste par-dessus la nouvelle page)
window.addEventListener("hashchange", () => { if (!$("modal").hidden) closeModal(); route(); });

// ============================================================
//  ACCUEIL
// ============================================================
function viewHome() {
  setTitle("GymTrack");
  const g = dayGoals(dayStr());
  const today = foodTotals(state.food[dayStr()] || []);
  const w = currentWeight();
  const h = new Date().getHours();
  const monthDays = new Set([...state.visits.filter((v) => (v.status || "gym") === "gym").map((v) => v.date), ...state.sessions.map((s) => s.date)].filter((d) => d.startsWith(dayStr().slice(0, 7)))).size;
  let html = `<div class="hello"><h2>${h < 6 ? "Bonne nuit" : h < 18 ? "Salut" : "Bonsoir"} 👋</h2>
    <span class="muted" style="text-transform:capitalize">${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span></div>`;

  if (!g) {
    html += `<div class="card highlight"><h2>Bienvenue !</h2>
      <p class="muted" style="margin-top:0">Remplis ton profil (âge, taille, poids, objectif) : l'appli calculera tes besoins en calories et en protéines.</p>
      <a class="btn primary block" href="#/corps">Remplir mon profil</a></div>`;
  }

  html += checkinCard() + unfilledCard() + painsCard();

  // Séance du jour : prochaine séance du programme actif, sinon une proposition
  const ap = state.activeProgram && PROGRAMS.find((p) => p.id === state.activeProgram.id);
  if (state.current) {
    html += `<div class="card highlight"><p class="eyebrow">Séance en cours</p><h2>${esc(state.current.name)}</h2>
      <a class="btn primary block big" href="#/live">⏱️ Reprendre</a></div>`;
  } else if (ap) {
    const idx = (state.activeProgram.next || 0) % ap.seances.length, day = ap.seances[idx];
    html += `<div class="card highlight"><p class="eyebrow">${esc(ap.nom)}</p><h2>${esc(day.nom)}</h2>
      <div class="w-thumbs big">${day.ex.slice(0, 4).map(([id]) => `<img src="${imgUrl(exById(id))}" alt="" loading="lazy">`).join("")}</div>
      <p class="muted small">${day.ex.map(([id]) => esc(exById(id).nom)).join(" · ")}</p>
      <div class="row"><button class="btn primary grow big" data-act="start-program" data-prog="${ap.id}" data-day="${idx}">▶ Commencer</button>
      <a class="btn" href="#/programme/${ap.id}">Voir</a></div></div>`;
  } else {
    const sw = suggestedWorkout();
    html += `<div class="card highlight"><p class="eyebrow">Séance proposée aujourd'hui</p><h2>${esc(sw.nom)}</h2>
      <div class="w-thumbs big">${sw.ex.slice(0, 4).map(([id]) => `<img src="${imgUrl(exById(id))}" alt="" loading="lazy">`).join("")}</div>
      <p class="muted small">⏱ ${workoutMinutes(sw)} min · ${sw.ex.length} exos · ${workoutMuscles(sw).join(", ")}</p>
      <div class="row"><button class="btn primary grow big" data-act="start-workout" data-id="${sw.id}">▶ Commencer</button>
      <a class="btn" href="#/entrainer/seances">Autres</a></div></div>`;
  }

  html += `<div class="grid3">
    <a class="stat" href="#/agenda"><b>${sessionsThisWeek()}</b><span>séances cette semaine</span></a>
    <a class="stat" href="#/agenda"><b>${monthDays}</b><span>jours à la salle ce mois</span></a>
    <a class="stat" href="#/corps"><b>${w ? r1(w) : "–"}</b><span>kg</span></a>
  </div>`;

  const df = defiOf(dayStr()), dStreak = defiStreak();
  html += `<a class="card row defi-mini" href="#/defi"><span class="defi-flame">🔥</span><div class="grow"><b>${state.defis[dayStr()]?.complete ? "Défi du jour réussi !" : "Défi du jour"}</b>
    <div class="muted small">${df.items.map((it) => exById(it.exId).nom).slice(0, 3).join(" · ")}…</div>
    <div class="progress thin"><div style="width:${(df.done.length / df.items.length) * 100}%"></div></div></div>
    <div class="streak small-streak"><b>${dStreak}</b><span>jour${dStreak > 1 ? "s" : ""}</span></div></a>`;
  html += stepsCard(dayStr());
  html += sleepCard(dayStr());
  html += waterCard(dayStr());

  html += `<a class="card nutri-mini" href="#/nutrition"><div class="row between"><h3>🍽️ Calories</h3><span><b>${Math.round(today.k)}</b> <span class="muted small">${g ? "/ " + g.kcal : ""} kcal</span></span></div>
    ${g ? `<div class="progress ${today.k > g.kcal * 1.05 ? "over" : ""}" style="margin-top:8px"><div style="width:${Math.min(100, (today.k / g.kcal) * 100)}%"></div></div>
    <div class="muted small" style="margin-top:6px">Protéines ${Math.round(today.p)} / ${g.prot} g</div>` : ""}</a>`;

  html += `<div class="grid2 quick">
      <button class="btn" data-act="start-free">🏋️ Séance libre</button>
      <a class="btn" href="#/entrainer/seances">📋 Séances prêtes</a>
      <button class="btn" data-act="go" data-to="#/nutrition" data-then="add-food">🍽️ Ajouter un repas</button>
      <button class="btn" data-act="add-body">⚖️ Nouvelle pesée</button>
    </div>`;

  const last = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start)[0];
  if (last) html += `<div class="section-title">Dernière séance</div><div class="card list-card">${sessionLine(last)}</div>`;
  return html;
}

function macroBars(t, g, withKcal = true) {
  const bar = (label, v, goal, unit) => {
    const pct = goal ? Math.min(100, (v / goal) * 100) : 0;
    return `<div class="macro"><div class="row between"><span>${label}</span><span class="muted">${Math.round(v)} / ${goal} ${unit}</span></div>
      <div class="progress ${v > goal * 1.05 ? "over" : ""}"><div style="width:${pct}%"></div></div></div>`;
  };
  return (withKcal ? bar("Calories", t.k, g.kcal, "kcal") : "") + bar("Protéines", t.p, g.prot, "g") + bar("Glucides", t.c, g.gluc, "g") + bar("Lipides", t.f, g.lip, "g");
}

// ============================================================
//  SÉANCES (historique + stats)
// ============================================================
function sessionLine(s) {
  const vol = sessionVolume(s);
  return `<div class="list-item" data-act="go" data-to="#/seance/${s.id}">
    <div class="grow"><b>${esc(s.name)}</b>
      <div class="muted small">${fmtDay(s.date)} · ${s.exercises.length} exo${s.exercises.length > 1 ? "s" : ""}${vol ? ` · ${Math.round(vol)} kg soulevés` : ""}${s.duration ? ` · ${Math.round(s.duration / 60)} min` : ""}</div>
      ${s.fatigue ? `<div class="small">Fatigue ${s.fatigue}/10 ${s.feel ? FEELS[s.feel - 1] : ""}</div>` : ""}
    </div><span class="arrow">›</span></div>`;
}

// ============================================================
//  AGENDA (présence à la salle + historique des séances)
// ============================================================
const nowHM = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toMin = (hm) => { if (!hm) return null; const [h, m] = String(hm).split(":").map(Number); return isNaN(h) ? null : h * 60 + (m || 0); };
// Durée en minutes entre arrivée et départ (gère le passage de minuit)
function visitMinutes(v) {
  const a = toMin(v.arrivee), b = toMin(v.depart);
  if (a == null || b == null) return 0;
  return (b - a + 1440) % 1440;
}
const fmtDur = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${pad(m % 60)}`);
const visitOf = (d) => state.visits.find((v) => v.date === d);

// Statut d'un jour : "gym" (salle), "repos" 😴 ou "flemme" 🖕
const DAY_STATUS = {
  gym: { icon: "🏋️", nom: "Salle" },
  repos: { icon: "😴", nom: "Repos" },
  flemme: { icon: "🖕", nom: "Flemme" },
};
const dayStatus = (d) => { const v = visitOf(d); if (v) return v.status || "gym"; return state.sessions.some((s) => s.date === d) ? "gym" : null; };
const dayHasGym = (d) => dayStatus(d) === "gym";
// Premier jour d'utilisation : on ne demande pas de remplir les jours d'avant
function trackingStart() {
  const dates = [state.settings.installDate, ...state.sessions.map((s) => s.date), ...state.visits.map((v) => v.date)].filter(Boolean).sort();
  return dates[0] || dayStr();
}
// Jours passés (7 derniers) pas encore remplis
function unfilledDays(n = 7) {
  const start = trackingStart(), out = [];
  for (let i = n; i >= 1; i--) { const x = new Date(); x.setDate(x.getDate() - i); const d = dayStr(x); if (d >= start && !dayStatus(d)) out.push(d); }
  return out;
}
function setDayStatus(d, status) {
  let v = visitOf(d);
  if (!v) { v = { id: uid(), date: d, arrivee: "", depart: "", note: "" }; state.visits.push(v); }
  v.status = status;
  if (status !== "gym") { v.arrivee = ""; v.depart = ""; }
  save();
}

function checkinCard() {
  const today = dayStr(), v = visitOf(today), st = dayStatus(today);
  if (v && st === "gym" && v.arrivee && !v.depart) {
    const since = (toMin(nowHM()) - toMin(v.arrivee) + 1440) % 1440;
    return `<div class="card" style="border-color:var(--accent)"><div class="row">
      <div class="grow"><b>📍 À la salle depuis ${fmtDur(since)}</b><div class="muted small">Arrivé à ${v.arrivee}</div></div>
      <button class="btn primary" data-act="checkout">🚪 Je pars</button></div></div>`;
  }
  if (st === "gym") {
    return `<div class="card"><div class="row"><div class="grow"><b>✅ Salle faite aujourd'hui</b>
      <div class="muted small">${v && v.depart ? `${v.arrivee || "?"} → ${v.depart} · ${fmtDur(visitMinutes(v))}` : "Séance enregistrée"}</div></div>
      <button class="btn sm" data-act="day" data-d="${today}">Modifier</button></div></div>`;
  }
  if (st) {
    const S = DAY_STATUS[st];
    return `<div class="card day-${st}"><div class="row"><span class="status-emoji">${S.icon}</span><div class="grow"><b>${st === "repos" ? "Jour de repos" : "Jour de flemme"}</b>
      <div class="muted small">${st === "repos" ? "La récup fait partie de l'entraînement." : "Ça arrive… mais demain on y retourne."}</div></div>
      <button class="btn sm" data-act="day" data-d="${today}">Modifier</button></div></div>`;
  }
  return `<div class="card checkin"><b>Aujourd'hui : salle, repos ou flemme ?</b>
    <button class="btn primary block" data-act="checkin" style="margin-top:10px">📍 J'arrive à la salle (${nowHM()})</button>
    <div class="grid2" style="margin-top:8px"><button class="btn" data-act="quick-status" data-d="${today}" data-s="repos">😴 Repos</button>
      <button class="btn" data-act="quick-status" data-d="${today}" data-s="flemme">🖕 Flemme</button></div></div>`;
}

// Rappel des jours oubliés (accueil + agenda)
function unfilledCard() {
  const days = unfilledDays();
  if (!days.length) return "";
  const d = days[days.length - 1];
  return `<div class="card todo-card"><b>📅 ${days.length > 1 ? `${days.length} jours pas remplis` : "Jour pas rempli"}</b>
    <div class="muted small" style="margin:2px 0 10px">${fmtDay(d, { weekday: "long", day: "numeric", month: "long" })} : tu y es allé ou pas ?</div>
    <div class="grid3"><button class="btn sm" data-act="day" data-d="${d}">🏋️ Salle</button>
      <button class="btn sm" data-act="quick-status" data-d="${d}" data-s="repos">😴 Repos</button>
      <button class="btn sm" data-act="quick-status" data-d="${d}" data-s="flemme">🖕 Flemme</button></div></div>`;
}

function viewAgenda() {
  setTitle("Agenda");
  return progSeg("agenda") + agendaHtml();
}
function agendaHtml() {
  const [y, m] = ui.calMonth.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const nbDays = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const monthDays = [...Array(nbDays)].map((_, i) => dayStr(new Date(y, m - 1, i + 1)));
  const count = (s) => monthDays.filter((d) => dayStatus(d) === s).length;
  const visits = state.visits.filter((v) => v.date.startsWith(ui.calMonth) && v.depart && (v.status || "gym") === "gym");
  const total = visits.reduce((a, v) => a + visitMinutes(v), 0);
  const today = dayStr(), start = trackingStart();

  let html = state.current
    ? `<a class="btn primary block" href="#/live" style="margin-bottom:12px">⏱️ Reprendre la séance en cours</a>`
    : `<div class="grid2" style="margin-bottom:12px"><button class="btn primary" data-act="start-free">＋ Séance libre</button><a class="btn" href="#/programmes">📋 Programmes</a></div>`;
  html += checkinCard() + unfilledCard();

  html += `<div class="card"><div class="row between" style="margin-bottom:10px">
      <button class="icon-btn" data-act="cal-month" data-delta="-1">‹</button>
      <b style="text-transform:capitalize">${first.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</b>
      <button class="icon-btn" data-act="cal-month" data-delta="1">›</button></div>
    <div class="cal">${["L", "M", "M", "J", "V", "S", "D"].map((d) => `<div class="cal-h">${d}</div>`).join("")}
      ${'<div></div>'.repeat(offset)}
      ${monthDays.map((d, i) => {
        const v = visitOf(d), st = dayStatus(d), min = v && st === "gym" ? visitMinutes(v) : 0;
        const todo = !st && d < today && d >= start;
        return `<button class="cal-day ${st === "gym" ? "on" : st ? "st-" + st : ""} ${todo ? "todo" : ""} ${d === today ? "today" : ""}" data-act="day" data-d="${d}" ${d > today ? "disabled" : ""}>
          <span>${i + 1}</span>${st && st !== "gym" ? `<small>${DAY_STATUS[st].icon}</small>` : min ? `<small>${fmtDur(min)}</small>` : st ? "<small>✓</small>" : todo ? "<small>?</small>" : ""}</button>`;
      }).join("")}
    </div>
    <div class="cal-legend"><span><i class="on"></i>Salle</span><span>😴 Repos</span><span>🖕 Flemme</span><span><i class="todo"></i>À remplir</span></div></div>
    <div class="grid3">
      <div class="stat"><b>${count("gym")}</b><span>🏋️ jours à la salle</span></div>
      <div class="stat"><b>${count("repos")}</b><span>😴 repos</span></div>
      <div class="stat"><b style="color:${count("flemme") ? "var(--red)" : "inherit"}">${count("flemme")}</b><span>🖕 flemme</span></div>
    </div>
    <div class="grid2">
      <div class="stat"><b>${total ? fmtDur(total) : "–"}</b><span>temps total à la salle</span></div>
      <div class="stat"><b>${visits.length ? fmtDur(Math.round(total / visits.length)) : "–"}</b><span>durée moyenne</span></div>
    </div>`;

  const list = state.sessions.filter((s) => s.date.startsWith(ui.calMonth)).sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start);
  html += `<div class="section-title">Séances du mois</div>` +
    (list.length ? `<div class="card">${list.map(sessionLine).join("")}</div>` : `<div class="empty">Aucune séance ce mois-ci</div>`);
  return html;
}

function dayModal(d) {
  const v = visitOf(d) || {};
  const sess = state.sessions.filter((s) => s.date === d);
  dayModal.status = dayStatus(d) || "gym";
  openModal(fmtDay(d, { weekday: "long", day: "numeric", month: "long" }), `<div class="stack">
    <div class="status-pick">${Object.entries(DAY_STATUS).map(([k, s]) => `<button class="${dayModal.status === k ? "on" : ""} sp-${k}" data-act="day-status" data-s="${k}"><span>${s.icon}</span>${s.nom}</button>`).join("")}</div>
    <div id="gymFields" ${dayModal.status === "gym" ? "" : "hidden"} class="stack">
      <div class="grid2"><label class="field">Arrivée<input type="time" id="vArr" value="${v.arrivee || ""}"></label>
        <label class="field">Départ<input type="time" id="vDep" value="${v.depart || ""}"></label></div>
      <div class="card center" style="margin:0"><div class="muted small">Temps passé à la salle</div><div style="font-size:26px;font-weight:800" id="vDur">–</div></div></div>
    <label class="field">Note (optionnel)<input id="vNote" value="${esc(v.note || "")}" placeholder="Ex : courbatures, salle blindée, malade…"></label>
    <button class="btn primary block" data-act="save-visit" data-d="${d}">Enregistrer</button>
    ${v.id ? `<button class="btn danger block" data-act="del-visit" data-d="${d}">Effacer ce jour</button>` : ""}
    ${sess.length ? `<div class="section-title" style="margin-top:6px">Séances ce jour-là</div><div class="card" style="margin:0">${sess.map(sessionLine).join("")}</div>` : ""}
  </div>`);
  const upd = () => { const m = visitMinutes({ arrivee: $("vArr").value, depart: $("vDep").value }); $("vDur").textContent = m ? fmtDur(m) : "–"; };
  $("vArr").addEventListener("input", upd); $("vDep").addEventListener("input", upd); upd();
}

// ============================================================
//  PROGRÈS (comparaison des performances par exercice)
// ============================================================
// Meilleure série d'une séance (la plus lourde, puis le plus de reps)
function bestSet(type, sets) {
  const score = (s) => type === "force" ? num(s.kg) * 1000 + num(s.reps)
    : type === "pdc" ? num(s.kg) * 1000 + num(s.reps) : type === "temps" ? num(s.sec) : num(s.min) * 1000 + num(s.km);
  return [...sets].sort((a, b) => score(b) - score(a))[0];
}

// Compare deux passages d'un exercice : plus lourd ? plus de reps ? tenu plus longtemps ?
function compareRuns(ex, cur, prev) {
  const c = cur.stats, p = prev.stats, t = ex.type;
  const up = (txt) => ({ cls: "up", txt }), same = (txt) => ({ cls: "same", txt }), down = (txt) => ({ cls: "down", txt });
  const repsAtMax = (h) => Math.max(0, ...h.sets.filter((s) => num(s.kg) === h.stats.maxKg).map((s) => num(s.reps)));
  if (t === "force") {
    const dKg = r1(c.maxKg - p.maxKg);
    if (ex.inverse) { // machine d'assistance : moins de kg = plus fort
      if (dKg < 0) return up(`Moins d'assistance : ${dKg} kg`);
      if (dKg > 0) return down(`Plus d'assistance : +${dKg} kg`);
    } else {
      if (dKg > 0) return up(`Plus lourd : +${dKg} kg`);
      if (dKg < 0) {
        if (c.e1rm > p.e1rm) return up(`Moins lourd mais plus de reps (force +${r1(c.e1rm - p.e1rm)} kg)`);
        const dr = c.volume - p.volume;
        return dr >= 0 ? same(`Moins lourd (${dKg} kg) mais plus de volume`) : down(`Moins lourd : ${dKg} kg`);
      }
    }
    const dr = repsAtMax(cur) - repsAtMax(prev);
    if (dr > 0) return up(`Même charge, +${dr} rep${dr > 1 ? "s" : ""}`);
    if (dr < 0) return down(`Même charge, ${dr} rep${dr < -1 ? "s" : ""}`);
    const dv = Math.round(c.volume - p.volume);
    return dv > 0 ? up(`Plus de séries / volume (+${dv} kg)`) : dv < 0 ? down(`Moins de volume (${dv} kg)`) : same("Identique à la dernière fois");
  }
  if (t === "pdc") {
    const dKg = r1(c.maxKg - p.maxKg), dr = c.maxReps - p.maxReps, dt = c.totalReps - p.totalReps;
    if (dKg > 0) return up(`Plus de lest : +${dKg} kg`);
    if (dr > 0) return up(`+${dr} rep${dr > 1 ? "s" : ""} sur ta meilleure série`);
    if (dt > 0) return up(`+${dt} reps au total`);
    if (dr < 0 || dt < 0 || dKg < 0) return down(`${dr < 0 ? dr : dt} reps`);
    return same("Identique à la dernière fois");
  }
  if (t === "temps") {
    const d = c.maxSec - p.maxSec;
    return d > 0 ? up(`Tenu plus longtemps : +${d} s`) : d < 0 ? down(`Moins longtemps : ${d} s`) : same("Même durée");
  }
  if (t === "tapis" || t === "cardio") {
    const dk = Math.round((c.kcal || 0) - (p.kcal || 0));
    if (t === "tapis" && c.penteMax > p.penteMax && c.min >= p.min) return up(`Plus de pente : ${c.penteMax} % (+${dk} kcal)`);
    if (dk > 10) return up(`Plus de calories brûlées : +${dk} kcal`);
    if (dk < -10) return down(`Moins de calories : ${dk} kcal`);
  }
  const vC = c.min ? c.km / c.min : 0, vP = p.min ? p.km / p.min : 0;
  if (c.km && p.km && vC > vP * 1.01) return up(`Plus rapide : ${r1(vC * 60)} km/h`);
  const dm = r1(c.min - p.min), dk = r1(c.km - p.km);
  if (dk > 0) return up(`Plus loin : +${dk} km`);
  if (dm > 0) return up(`Plus longtemps : +${dm} min`);
  if (dm < 0 || dk < 0) return down("Moins long que la dernière fois");
  return same("Identique à la dernière fois");
}

function sparkline(values) {
  if (values.length < 2) return "";
  const w = 80, h = 28, min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="#c6ff3d" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

function viewProgressList() {
  setTitle("Progrès");
  return progSeg("progres") + progressListHtml();
}
function progressListHtml() {
  const done = {};
  for (const s of state.sessions) for (const e of s.exercises) if (exById(e.exId) && exById(e.exId).groupe !== "Étirements") done[e.exId] = s.date > (done[e.exId] || "") ? s.date : done[e.exId];
  const ids = Object.keys(done).sort((a, b) => done[b].localeCompare(done[a]));
  if (!ids.length) {
    return `<div class="empty"><span class="big">📈</span>Pas encore de données.<br>Note tes séries, tes reps et tes charges pendant tes séances : ici tu verras pour chaque exercice si tu progresses.</div>
      <button class="btn primary block" data-act="start-free">＋ Lancer une séance</button>`;
  }
  const rows = ids.map((id) => {
    const ex = exById(id), h = exHistory(id), cur = h[h.length - 1], prev = h[h.length - 2];
    const v = prev ? compareRuns(ex, cur, prev) : { cls: "new", txt: "Première fois : refais-le pour comparer" };
    const key = METRICS[ex.type][0][0];
    return { ex, h, cur, prev, v, spark: sparkline(h.slice(-12).map((x) => x.stats[key] || 0)) };
  });
  const count = (c) => rows.filter((r) => r.v.cls === c).length;
  let html = `<div class="grid3">
      <div class="stat"><b style="color:var(--green)">${count("up")}</b><span>en progrès 📈</span></div>
      <div class="stat"><b>${count("same")}</b><span>stables ➖</span></div>
      <div class="stat"><b style="color:var(--orange)">${count("down")}</b><span>en baisse 📉</span></div></div>
    <p class="muted small">Comparaison de ta dernière fois avec la fois d'avant, pour chaque exercice.</p>`;
  html += rows.map(({ ex, cur, prev, v, spark }) => {
    const b = bestSet(ex.type, cur.sets), pb = prev && bestSet(ex.type, prev.sets);
    return `<div class="card prog-card" data-act="go" data-to="#/progres/${ex.id}">
      <div class="row"><img class="thumb" src="${imgUrl(ex)}" alt="" loading="lazy">
        <div class="grow"><b>${esc(ex.nom)}</b>${(() => { const ri = rankInfo(ex); return ri && ri.i >= 0 ? ` <span class="rank-pill" style="--rc:${RANKS[ri.i].c1}">${rankBadge(ri.i, 16)}${RANKS[ri.i].nom}</span>` : ""; })()}
          <div class="verdict ${v.cls}">${v.cls === "up" ? "▲" : v.cls === "down" ? "▼" : v.cls === "same" ? "＝" : "★"} ${esc(v.txt)}</div></div>
        ${spark}</div>
      <div class="small muted" style="margin-top:8px">Dernière (${fmtShort(cur.date)}) : <b style="color:var(--text)">${b ? setText(ex.type, b) : "–"}</b>${pb ? ` · Avant (${fmtShort(prev.date)}) : ${setText(ex.type, pb)}` : ""}</div>
    </div>`;
  }).join("");

  // 12 dernières semaines : volume soulevé, nombre de séances et fatigue moyenne
  const weeks = [...Array(12)].map((_, i) => { const d = weekStart(); d.setDate(d.getDate() - 7 * (11 - i)); return dayStr(d); });
  const wk = weeks.map((ws, i) => {
    const ss = state.sessions.filter((s) => s.date >= ws && (i === 11 || s.date < weeks[i + 1]));
    const fat = ss.filter((s) => s.fatigue);
    return { vol: Math.round(ss.reduce((a, s) => a + sessionVolume(s), 0)), n: ss.length, fat: fat.length ? r1(fat.reduce((a, s) => a + s.fatigue, 0) / fat.length) : null };
  });
  const thisW = wk[11], prevW = wk[10];
  html += `<div class="section-title">Semaine par semaine</div><div class="card">
    <p class="eyebrow" style="color:var(--muted)">Volume soulevé cette semaine</p>
    ${kpiHead(thisW.vol.toLocaleString("fr-FR"), "kg", thisW.vol - prevW.vol, "vs semaine dernière")}
    <div class="chart-box"><canvas id="volChart"></canvas></div></div>
    <div class="card"><div class="row between"><h3>Séances & fatigue</h3><span class="muted small">${thisW.n} séance${thisW.n > 1 ? "s" : ""} cette semaine</span></div>
    <div class="chart-box short"><canvas id="fatChart"></canvas></div></div>`;
  after(() => {
    const labels = weeks.map((w) => fmtShort(w));
    lineChart("volChart", labels, [{ label: "Volume", data: wk.map((w) => w.vol), type: "bar", colors: wk.map((_, i) => (i === 11 ? CH.accent : CH.accent + "66")) }], { zero: true, unit: "kg" });
    lineChart("fatChart", labels, [
      { label: "Séances", data: wk.map((w) => w.n), type: "bar", color: CH.blue },
      { label: "Fatigue /10", data: wk.map((w) => w.fat), color: CH.orange, axis: "y2" },
    ], { zero: true, y2: true });
  });
  return html;
}

function viewSessionDetail(id) {
  const s = state.sessions.find((x) => x.id === id);
  if (!s) { go("#/agenda"); return; }
  setTitle(s.name);
  let html = `<div class="card"><div class="muted">${fmtDay(s.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
    <div class="grid3" style="margin-top:10px">
      <div class="stat"><b>${s.duration ? Math.round(s.duration / 60) : "–"}</b><span>minutes</span></div>
      ${sessionCardioKcal(s) && !sessionVolume(s) ? `<div class="stat"><b>${sessionCardioKcal(s)}</b><span>kcal cardio 🔥</span></div>` : `<div class="stat"><b>${Math.round(sessionVolume(s))}</b><span>kg soulevés${sessionCardioKcal(s) ? ` · 🔥 ${sessionCardioKcal(s)} kcal cardio` : ""}</span></div>`}
      <div class="stat"><b>${s.fatigue || "–"}${s.feel ? " " + FEELS[s.feel - 1] : ""}</b><span>fatigue /10</span></div>
    </div>${s.pains && Object.keys(s.pains).length ? `<p class="small">🩹 Douleurs : ${Object.entries(s.pains).map(([j, l]) => `<b>${JOINTS[j]?.nom || j}</b> (${PAIN_LEVELS[l]})`).join(", ")}</p>` : ""}${s.notes ? `<p style="white-space:pre-wrap">📝 ${esc(s.notes)}</p>` : ""}</div>`;
  for (const e of s.exercises) {
    const ex = exById(e.exId);
    if (!ex) continue;
    html += `<div class="card"><div class="row" data-act="go" data-to="#/progres/${ex.id}" style="cursor:pointer">
      <img class="thumb" src="${imgUrl(ex)}" alt="" style="width:48px;height:48px;border-radius:8px;background:#fff;object-fit:cover">
      <div class="grow"><b>${esc(ex.nom)}</b></div><span class="arrow">📈</span></div>
      <ol class="steps" style="margin-top:8px">${e.sets.map((x) => `<li>${setText(ex.type, x)}</li>`).join("")}</ol></div>`;
  }
  html += `<button class="btn block" style="margin-bottom:10px" data-act="share-s" data-id="${s.id}">📤 Partager cette séance à un ami</button>
    <div class="grid2"><button class="btn" data-act="redo-session" data-id="${s.id}">🔁 Refaire</button>
    <button class="btn danger" data-act="del-session" data-id="${s.id}">🗑 Supprimer</button></div>`;
  return html;
}

// ============================================================
//  SÉANCE EN COURS
// ============================================================
function newSet(prev) { return { kg: prev?.kg ?? "", reps: prev?.reps ?? "", sec: prev?.sec ?? "", min: prev?.min ?? "", km: prev?.km ?? "", vit: prev?.vit ?? "", pente: prev?.pente ?? "", done: false }; }

// Séance « cardio » ou « étirements » : pas d'échauffement ni de marche inclinée ajoutés
const isCardioLike = (ex) => ex.groupe === "Cardio" || ex.groupe === "Étirements" || ex.muscles.includes("cardio");
function sessionKind(items, cat) {
  if (cat === "Cardio / HIIT" || cat === "Étirements") return "cardio";
  if (items.length && items.filter((it) => isCardioLike(exById(it.exId))).length >= items.length / 2) return "cardio";
  return "muscu";
}
// Échauffement au début + marche inclinée à la fin (réglables dans Réglages)
function addWarmupCooldown(items, cat) {
  if (sessionKind(items, cat) === "cardio") return items;
  const out = [...items];
  // Échauffement ciblé si une douleur a été signalée récemment (toujours ajouté, même si l'échauffement est désactivé)
  const rp = recentPains(), extra = [];
  if (rp) for (const [j] of rp.list) for (const id of JOINTS[j].warm) if (!extra.includes(id) && !(state.settings.warmup !== false && WARMUP.some(([w]) => w === id))) extra.push(id);
  const painWarm = extra.map((exId) => ({ exId, sets: 1, target: "30 s", rest: 0, role: "warmup" }));
  if (state.settings.warmup !== false) out.unshift(...WARMUP.map(([exId, sets, target]) => ({ exId, sets, target, rest: 0, role: "warmup" })), ...painWarm);
  else out.unshift(...painWarm);
  const last = items[items.length - 1];
  const endsWithCardio = last && ["cardio", "tapis"].includes(exById(last.exId).type);
  if (state.settings.walk !== false && !endsWithCardio) {
    const w = state.settings.walkMin || 12;
    out.push({ exId: "marche_inclinee", sets: 1, target: `${w} min · pente 10 % · 5 km/h`, rest: 0, role: "cooldown" });
  }
  return out;
}
// Valeurs déjà remplies pour l'échauffement et la marche (il suffit de cocher ✓)
function presetSet(it) {
  const ex = exById(it.exId), t = String(it.target || "");
  if (it.role === "cooldown") return { ...newSet(), min: String(state.settings.walkMin || 12), vit: "5", pente: "10" };
  if (ex.type === "tapis") { // ex : « 30 min · 4,8 km/h · 12 % »
    const m = t.match(/(\d+)\s*min/), v = t.match(/([\d,.]+)\s*km\/h/), g = t.match(/([\d,.]+)\s*%/);
    return { ...newSet(), min: m ? m[1] : "", vit: v ? v[1].replace(",", ".") : "", pente: g ? g[1].replace(",", ".") : "" };
  }
  if (it.role !== "warmup") return newSet();
  if (ex.type === "temps") return { ...newSet(), sec: (t.match(/(\d+)\s*s\b/) || [0, "30"])[1] };
  return { ...newSet(), reps: (t.match(/\d+/) || ["5"])[0] };
}

function startSession(name, items, extra = {}, cat) {
  if (state.current && !confirm("Une séance est déjà en cours. La remplacer ?")) return;
  const all = addWarmupCooldown(items, cat);
  state.current = {
    id: uid(), name, start: Date.now(), date: dayStr(), ...extra,
    exercises: all.map((it) => ({ exId: it.exId, role: it.role, target: it.target || "", rest: it.rest ?? state.settings.rest, sets: Array.from({ length: it.sets || 1 }, () => presetSet(it)) })),
  };
  save();
  go("#/live");
}

function viewLive() {
  const c = state.current;
  if (!c) { go("#/agenda"); return; }
  setTitle("Séance en cours");
  const total = c.exercises.reduce((a, e) => a + e.sets.length, 0), done = c.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  let html = `<div class="live-head">
      <div class="grow"><div class="live-time" id="elapsed">${fmtTime((Date.now() - c.start) / 1000)}</div>
        <div class="progress thin"><div style="width:${total ? (done / total) * 100 : 0}%"></div></div>
        <div class="muted small">${done}/${total} séries validées</div></div>
      <button class="btn primary" data-act="finish-session">Terminer</button></div>
    <input class="live-name" data-in="cur-name" value="${esc(c.name)}" aria-label="Nom de la séance">
    ${recentPains() ? `<div class="pain-banner">🩹 Douleur récente : ${recentPains().list.map(([j, l]) => `${JOINTS[j].nom.toLowerCase()} (${PAIN_LEVELS[l]})`).join(", ")}. Échauffement ciblé ajouté, exos à risque marqués ⚠️ → remplace-les avec ⇄ ou vas-y léger.</div>` : ""}
    ${c.exercises.length ? `<p class="muted small" style="margin:0 2px 10px">Remplis kg et reps puis touche ✓ : le chrono de repos se lance tout seul. Les chiffres en gris = ta dernière fois.</p>` : ""}`;

  c.exercises.forEach((e, i) => {
    const ex = exById(e.exId);
    if (!ex) return;
    const fields = FIELDS[ex.type];
    const prev = lastPerf(ex.id);
    const nDone = e.sets.filter((s) => s.done).length;
    if (e.role === "warmup" && c.exercises[i - 1]?.role !== "warmup") html += `<div class="phase">🔥 Échauffement · 5 min <span class="muted small">— coche chaque exo une fois fait</span></div>`;
    if (!e.role && (c.exercises[i - 1]?.role === "warmup")) html += `<div class="phase">💪 Séance</div>`;
    if (e.role === "cooldown") html += `<div class="phase">🚶 Retour au calme</div>`;
    html += `<div class="card ex-live ${e.role ? "phase-" + e.role : ""} ${nDone === e.sets.length ? "all-done" : ""}">
      <div class="row">
        <img src="${imgUrl(ex)}" alt="" data-act="ex-info" data-id="${ex.id}" style="width:52px;height:52px;border-radius:10px;object-fit:cover;background:#fff;cursor:pointer">
        <div class="grow"><b>${esc(ex.nom)}</b> <span class="muted small">${nDone}/${e.sets.length}</span> ${e.role ? "" : painBadge(ex.id)}
          ${e.target ? `<div class="small" style="color:var(--accent)">Objectif : ${esc(e.target)}${e.rest ? ` · repos ${fmtTime(e.rest)}` : ""}</div>` : ""}
          ${prev ? `<div class="prev">Dernière fois : ${prev.sets.filter((s) => isFilled(ex.type, s)).map((s) => setText(ex.type, s)).join(" · ")}</div>` : ""}
        </div>
        ${e.role ? "" : `<button class="icon-btn swap-btn" data-act="ex-swap" data-i="${i}" aria-label="Remplacer par une alternative">⇄</button>`}
        <button class="icon-btn" data-act="ex-menu" data-i="${i}" aria-label="Options">⋯</button>
      </div>
      <table class="set-table"><tr><th>#</th>${fields.map(([, l]) => `<th>${l}</th>`).join("")}<th>✓</th></tr>
      ${e.sets.map((s, j) => {
        const ps = prev && prev.sets[j];
        return `<tr class="${s.done ? "done" : ""}"><td>${j + 1}</td>
          ${fields.map(([k]) => `<td><input inputmode="decimal" enterkeyhint="next" autocomplete="off" data-in="set" data-i="${i}" data-j="${j}" data-k="${k}" value="${esc(s[k])}" placeholder="${ps && num(ps[k]) ? esc(ps[k]) : "–"}"></td>`).join("")}
          <td><button class="check" data-act="set-done" data-i="${i}" data-j="${j}">✓</button></td></tr>`;
      }).join("")}</table>
      ${["cardio", "tapis"].includes(ex.type) ? `<div class="cardio-kcal" id="kc${i}">${cardioLine(ex, e.sets)}</div>` : ""}
      ${e.role ? "" : `<div class="row" style="margin-top:8px"><button class="btn sm grow" data-act="add-set" data-i="${i}">＋ Série</button>
      ${e.sets.length > 1 ? `<button class="btn sm" data-act="del-set" data-i="${i}">− Série</button>` : ""}</div>`}
    </div>`;
  });

  if (!c.exercises.length) html += `<div class="empty"><span class="big">🏋️</span>Ajoute ton premier exercice</div>`;
  html += `<button class="btn block big" data-act="pick-ex">＋ Ajouter un exercice</button>
    <div class="grid2" style="margin-top:12px"><button class="btn danger" data-act="cancel-session">Annuler la séance</button>
    <button class="btn primary" data-act="finish-session">✔ Terminer</button></div>`;
  return html;
}

// Résumé calories / distance d'un exercice cardio pendant la séance
function cardioLine(ex, sets) {
  const valid = sets.filter((s) => isFilled(ex.type, s)), st = exStats(ex.type, valid, ex);
  if (!valid.length) return ex.type === "tapis" ? "Indique la durée, la vitesse et la pente : les calories se calculent toutes seules." : "Indique la durée : les calories se calculent toutes seules.";
  return `🔥 ≈ <b>${st.kcal} kcal</b>${st.km ? ` · ${String(st.km).replace(".", ",")} km` : ""}${ex.type === "tapis" && st.penteMax ? ` · pente ${st.penteMax} %` : ""}`;
}
const sessionCardioKcal = (s) => s.exercises.reduce((a, e) => { const ex = exById(e.exId); return a + (ex && ["cardio", "tapis"].includes(ex.type) ? exStats(ex.type, e.sets, ex).kcal || 0 : 0); }, 0);

// Chrono de la séance
setInterval(() => {
  const el = $("elapsed");
  if (el && state.current) el.textContent = fmtTime((Date.now() - state.current.start) / 1000);
  if (state.current && !$("liveBar").hidden) $("liveBarText").textContent = `${state.current.name} · ${fmtTime((Date.now() - state.current.start) / 1000)}`;
}, 1000);

// Chrono de repos
const rest = { end: 0, int: null };
function startRest(sec) {
  rest.end = Date.now() + sec * 1000;
  $("restTimer").hidden = false;
  document.body.classList.add("resting");
  updateLiveBar();
  clearInterval(rest.int);
  tickRest();
  rest.int = setInterval(tickRest, 250);
}
function tickRest() {
  const left = Math.ceil((rest.end - Date.now()) / 1000);
  if (left <= 0) {
    stopRest();
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    beep();
    toast("⏰ Repos terminé, série suivante !");
    return;
  }
  $("restTime").textContent = fmtTime(left);
}
function stopRest() { clearInterval(rest.int); $("restTimer").hidden = true; document.body.classList.remove("resting"); updateLiveBar(); }
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.2;
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch (e) { /* pas de son, tant pis */ }
}

const EX_FILTERS = ["Tous", "🏢 Machines", ...GROUPES];
const inGroup = (e, g) => g === "Tous" || (g === "🏢 Machines" ? e.machine : e.groupe === g || (e.aussi || []).includes(g));
const isHidden = (e) => state.hidden.includes(e.id);

function pickExerciseModal(onPick) {
  const render = (q = "", grp = "Tous") => {
    const list = EXERCISES.filter((e) => inGroup(e, grp) && !isHidden(e) && e.nom.toLowerCase().includes(q.toLowerCase()));
    return list.map((e) => `<div class="list-item" data-act="pick" data-id="${e.id}"><img class="thumb" src="${imgUrl(e)}" alt="" loading="lazy">
      <div class="grow"><b>${esc(e.nom)}</b><div class="muted small">${e.groupe} · ${esc(e.marque || e.materiel)}</div></div><span class="arrow">＋</span></div>`).join("") || `<div class="empty">Aucun exercice</div>`;
  };
  openModal("Ajouter un exercice", `<input id="pickQ" placeholder="🔍 Rechercher…" autocomplete="off">
    <div class="chips" style="margin:10px 0">${EX_FILTERS.map((g, i) => `<button class="chip ${i ? "" : "on"}" data-act="pick-grp" data-g="${g}">${g}</button>`).join("")}</div>
    <div id="pickList">${render()}</div>`);
  let grp = "Tous";
  const refresh = () => ($("pickList").innerHTML = render($("pickQ").value, grp));
  $("pickQ").addEventListener("input", refresh);
  pickExerciseModal.onGroup = (g) => { grp = g; document.querySelectorAll("[data-act=pick-grp]").forEach((c) => c.classList.toggle("on", c.dataset.g === g)); refresh(); };
  pickExerciseModal.onPick = (id) => { closeModal(); onPick(id); };
}

function finishModal() {
  const c = state.current;
  const filled = c.exercises.reduce((a, e) => a + e.sets.filter((s) => isFilled(exById(e.exId).type, s)).length, 0);
  if (!filled) { toast("Remplis au moins une série avant de terminer 😉"); return; }
  let fatigue = 6, feel = 4;
  openModal("Fin de séance 💪", `<div class="stack">
    <label class="field">Fatigue / difficulté ressentie : <b id="fatV" style="color:var(--text)">6</b>/10
      <input type="range" min="1" max="10" value="6" id="fatIn"></label>
    <div class="row between small muted"><span>Facile</span><span>Épuisé</span></div>
    <div class="field">Comment tu te sens ?</div>
    <div class="feel-row">${FEELS.map((f, i) => `<button data-act="feel" data-v="${i + 1}" class="${i === 3 ? "on" : ""}">${f}</button>`).join("")}</div>
    ${painPickerHtml()}
    <label class="field">Notes (sensations, ce qui a bien marché…)<textarea id="notesIn" placeholder="Ex : bonnes sensations au développé, un peu mal au coude sur les dips"></textarea></label>
    <button class="btn primary block" data-act="save-session">Enregistrer la séance</button></div>`);
  finishModal.pains = {};
  $("fatIn").addEventListener("input", (e) => { fatigue = +e.target.value; $("fatV").textContent = fatigue; });
  finishModal.getFeel = () => feel;
  finishModal.setFeel = (v) => { feel = v; document.querySelectorAll("[data-act=feel]").forEach((b) => b.classList.toggle("on", +b.dataset.v === v)); };
  finishModal.getFatigue = () => fatigue;
}

function saveSession() {
  const c = state.current;
  const prs = [];
  const exercises = c.exercises.map((e) => {
    const ex = exById(e.exId);
    return { exId: e.exId, ...(e.role ? { role: e.role } : {}), sets: e.sets.filter((s) => isFilled(ex.type, s)).map((s) => { const o = {}; FIELDS[ex.type].forEach(([k]) => (o[k] = num(s[k]))); return o; }) };
  }).filter((e) => e.sets.length);
  // Détection des records personnels
  for (const e of exercises) {
    const ex = exById(e.exId);
    const key = METRICS[ex.type][0][0];
    const best = Math.max(0, ...exHistory(e.exId).map((h) => h.stats[key] || 0));
    const now = exStats(ex.type, e.sets)[key] || 0;
    if (best > 0 && now > best) prs.push(ex.nom);
  }
  const rankBefore = Object.fromEntries(exercises.map((e) => [e.exId, rankInfo(exById(e.exId))?.i ?? -1]));
  const s = {
    id: c.id, name: c.name || "Séance", date: c.date, start: c.start, duration: Math.round((Date.now() - c.start) / 1000),
    exercises, fatigue: finishModal.getFatigue(), feel: finishModal.getFeel(), notes: $("notesIn").value.trim(), programId: c.programId || null, pains: { ...finishModal.pains },
  };
  state.sessions.push(s);
  const rankUps = exercises.map((e) => { const ex = exById(e.exId), ri = rankInfo(ex); return ri && ri.i > rankBefore[e.exId] && ri.i > 0 ? `${ex.nom} → ${RANKS[ri.i].nom}` : null; }).filter(Boolean);
  const vToday = visitOf(c.date);
  if (!vToday) state.visits.push({ id: uid(), date: c.date, status: "gym", arrivee: nowHM(new Date(c.start)), depart: nowHM(), note: "" });
  else if (vToday.status && vToday.status !== "gym") Object.assign(vToday, { status: "gym", arrivee: nowHM(new Date(c.start)), depart: nowHM() });
  if (c.programId && state.activeProgram && state.activeProgram.id === c.programId) {
    const p = PROGRAMS.find((x) => x.id === c.programId);
    state.activeProgram.next = (c.dayIdx + 1) % p.seances.length;
  }
  state.current = null;
  saveNow();
  stopRest();
  closeModal();
  go(`#/seance/${s.id}`);
  setTimeout(() => sendHealth("seance", Math.max(1, Math.round(s.duration / 60))), 700);
  toast(rankUps.length ? `🎖️ Nouveau rang ! ${rankUps.join(" · ")}` : prs.length ? `🏆 Nouveau record : ${prs.join(", ")} !` : "Séance enregistrée 💪", 4000);
}

// ============================================================
//  EXERCICES
// ============================================================
function exListHtml() {
  const q = ui.exSearch.toLowerCase().trim();
  const match = EXERCISES.filter((e) => inGroup(e, ui.exGroup) &&
    (e.nom.toLowerCase().includes(q) || e.muscles.some((m) => MUSCLES[m].toLowerCase().includes(q))));
  const nbHidden = match.filter(isHidden).length;
  const list = ui.showHidden ? match : match.filter((e) => !isHidden(e));
  return `<div class="ex-grid">${list.map((e) => `<div class="ex-card" data-act="go" data-to="#/exo/${e.id}">
      <img src="${imgUrl(e)}" alt="" loading="lazy" ${isHidden(e) ? 'style="opacity:.35"' : ""}><div>${e.machine ? "🏢 " : ""}${esc(e.nom)}<small>${e.muscles.map((m) => MUSCLES[m]).join(", ")}</small></div></div>`).join("") || `<div class="empty" style="grid-column:1/-1">Aucun résultat</div>`}</div>
    ${nbHidden ? `<button class="btn block" style="margin-top:12px" data-act="show-hidden">${ui.showHidden ? "Cacher" : "Afficher"} les ${nbHidden} exercice${nbHidden > 1 ? "s" : ""} masqué${nbHidden > 1 ? "s" : ""}</button>` : ""}`;
}

function viewExercises() {
  setTitle("Exercices");
  const html = `<input id="exSearch" type="search" placeholder="🔍 Exercice ou muscle…" value="${esc(ui.exSearch)}" autocomplete="off" enterkeyhint="search">
    <div class="chips" style="margin:10px 0 14px">${EX_FILTERS.map((g) => `<button class="chip ${ui.exGroup === g ? "on" : ""}" data-act="ex-grp" data-g="${g}">${g}</button>`).join("")}</div>
    ${ui.exGroup === "🏢 Machines" ? `<p class="muted small" style="margin-top:0">Machines Technogym / Hammer Strength de type Fitness Park. Une machine n'est pas dans ta salle ? Ouvre-la et touche « Pas dans ma salle ».</p>` : ""}
    <div id="exList">${exListHtml()}</div>`;
  // Recherche : on ne redessine que la liste, pour garder le clavier ouvert
  after(() => { const inp = $("exSearch"); inp.addEventListener("input", () => { ui.exSearch = inp.value; $("exList").innerHTML = exListHtml(); }); });
  return html;
}

function exerciseDetailHtml(ex, withActions = true) {
  return `<img class="ex-hero" id="exAnim" src="${imgUrl(ex, 0)}" alt="${esc(ex.nom)}">
    <p class="muted small center">Position de départ ⇄ position d'arrivée</p>
    <div class="card"><h2>💪 Muscles travaillés</h2>${bodyMap(ex)}
      <div style="margin-top:10px">${muscleTags(ex)}</div>
      <p class="muted small" style="margin-bottom:0">🛠 ${esc(ex.materiel)}${ex.marque ? ` · ${esc(ex.marque)}` : ""}</p>
      ${ex.machine && withActions ? `<button class="btn sm block" style="margin-top:10px" data-act="toggle-hidden" data-id="${ex.id}">${isHidden(ex) ? "✅ En fait, elle est dans ma salle" : "🚫 Pas dans ma salle (masquer)"}</button>` : ""}</div>
    <div class="card"><h2>📋 Exécution</h2><ol class="steps">${ex.etapes.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></div>
    <div class="card"><h2>✅ Conseils</h2><ul class="steps">${ex.conseils.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
    <div class="card"><h2>⚠️ Erreurs à éviter</h2><ul class="steps">${ex.erreurs.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
    ${withActions && !ex.role && ex.groupe !== "Étirements" ? (() => { const alts = alternativesFor(ex.id, 6); return alts.length ? `<div class="section-title">🔄 Alternatives</div><p class="muted small" style="margin:-4px 4px 8px">Machine prise ou mouvement qui ne te plaît pas ? Ces exos travaillent pareil.</p><div class="card list-card">${alts.map((a) => altRow(a)).join("")}</div>` : ""; })() : ""}
    ${withActions && hasRank(ex) ? (() => { const ri = rankInfo(ex); return ri && !ri.noWeight ? `<a class="card row" href="#/progres/${ex.id}">${rankBadge(Math.max(0, ri.i), 40)}<div class="grow"><b>${ri.i < 0 ? "Pas encore classé" : "Rang " + RANKS[ri.i].nom}</b>
      <div class="muted small">${ri.next != null ? `Prochain : ${RANKS[ri.i + 1].nom} à ${fmtRankVal(ri.next, ri.t.unit)}` : "Rang maximum"}</div></div><span class="arrow">›</span></a>` : ""; })() : ""}
    ${withActions ? `<div class="grid2"><a class="btn" href="#/progres/${ex.id}">📈 Ma progression</a>
      <button class="btn primary" data-act="add-to-live" data-id="${ex.id}">＋ À ma séance</button></div>` : ""}`;
}

// Fait alterner les 2 images (départ / arrivée) pour montrer le mouvement
let animInt;
function animateExercise(ex) {
  clearInterval(animInt);
  let i = 0;
  const pre = new Image(); pre.src = imgUrl(ex, 1);
  animInt = setInterval(() => { const el = $("exAnim"); if (!el) return clearInterval(animInt); i = 1 - i; el.src = imgUrl(ex, i); }, 1100);
}

function viewExercise(id) {
  const ex = exById(id);
  if (!ex) { go("#/exos"); return; }
  setTitle(ex.nom);
  after(() => animateExercise(ex));
  return exerciseDetailHtml(ex);
}

function viewProgress(id) {
  const ex = exById(id);
  if (!ex) { go("#/progres"); return; }
  setTitle(ex.nom);
  const hist = exHistory(id);
  const metrics = METRICS[ex.type];
  const metric = metrics.find(([k]) => k === ui.progMetric) ? ui.progMetric : metrics[0][0];
  if (!hist.length) {
    return `${rankCard(ex)}<div class="empty"><span class="big">📈</span>Pas encore de données pour cet exercice.<br>Fais-le dans une séance pour voir ta courbe !</div>
      <a class="btn block" href="#/exo/${id}">Voir la fiche de l'exercice</a>`;
  }
  const best = (k) => Math.max(...hist.map((h) => h.stats[k] || 0));
  const fmtV = (k, v) => (k === "volume" ? Math.round(v).toLocaleString("fr-FR") : r1(v));
  const shown = hist.filter((h) => inPeriod(h.date));
  const pts = shown.length ? shown : hist.slice(-1);
  const first = pts[0].stats[metric] || 0, lastV = pts[pts.length - 1].stats[metric] || 0;
  const label = metrics.find(([k]) => k === metric)[1];
  let html = `${rankCard(ex)}<div class="chips" style="margin-bottom:12px">${metrics.map(([k, l]) => `<button class="chip ${k === metric ? "on" : ""}" data-act="prog-metric" data-k="${k}">${l}</button>`).join("")}</div>
    <div class="card">
      ${kpiHead(fmtV(metric, lastV), (label.match(/\((.*)\)/) || [0, label.toLowerCase()])[1], pts.length > 1 ? lastV - first : null, pts.length > 1 ? `depuis le ${fmtShort(pts[0].date)}` : "refais-le pour voir ta courbe", ex.inverse && metric !== "volume")}
      <div class="chart-box"><canvas id="progChart"></canvas></div>
      ${periodChips()}</div>
    <div class="section-title">Records</div><div class="grid${metrics.length === 3 ? 3 : 2}">${metrics.map(([k, l]) => `<div class="stat"><b>${fmtV(k, best(k))}</b><span>${l}</span></div>`).join("")}</div>
    <div class="section-title">Historique séance par séance</div><div class="card">${hist.map((h, i) => ({ h, v: i ? compareRuns(ex, h, hist[i - 1]) : null })).reverse().map(({ h, v }) => `<div class="list-item" data-act="go" data-to="#/seance/${h.sessionId}">
      <div class="grow"><b>${fmtDay(h.date)}</b><div class="muted small">${h.sets.map((s) => setText(ex.type, s)).join(" · ")}</div>
      ${v ? `<div class="verdict ${v.cls}">${v.cls === "up" ? "▲" : v.cls === "down" ? "▼" : "＝"} ${esc(v.txt)}</div>` : `<div class="verdict new">★ Première fois</div>`}</div></div>`).join("")}</div>
    <a class="btn block" href="#/exo/${id}">📖 Fiche technique</a>`;
  after(() => lineChart("progChart", pts.map((h) => fmtShort(h.date)), [{ label, data: pts.map((h) => r1(h.stats[metric] || 0)) }]));
  return html;
}

// ============================================================
//  PROGRAMMES
// ============================================================
function viewPrograms() {
  setTitle("Programmes");
  const filters = [["tous", "Tous"], ["debutant", "Débutant"], ["masse", "Prise de masse"], ["seche", "Sèche"], ["perte", "Perte de poids"], ["force", "Force"], ["calisthenie", "Calisthénie"], ["mobilite", "Étirements"]];
  const list = PROGRAMS.filter((p) => ui.progFilter === "tous" || p.objectif === ui.progFilter);
  return `<div class="chips" style="margin-bottom:12px">${filters.map(([k, l]) => `<button class="chip ${ui.progFilter === k ? "on" : ""}" data-act="prog-filter" data-k="${k}">${l}</button>`).join("")}</div>
    ${list.map((p) => `<div class="card" data-act="go" data-to="#/programme/${p.id}" style="cursor:pointer">
      <div class="row between"><h2 style="margin:0">${esc(p.nom)}</h2>${state.activeProgram?.id === p.id ? `<span class="tag main">Actif</span>` : ""}</div>
      <p class="muted small">${p.seances.length} séances types · jusqu'à ${p.jours} j/semaine</p>
      <p class="small" style="margin:0">${esc(p.desc)}</p></div>`).join("")}`;
}

function viewProgram(id) {
  const p = PROGRAMS.find((x) => x.id === id);
  if (!p) { go("#/programmes"); return; }
  setTitle(p.nom);
  const active = state.activeProgram?.id === p.id;
  return `<div class="card"><p style="margin-top:0">${esc(p.desc)}</p>
    ${active ? `<button class="btn block" data-act="unset-program">✔ Programme actif (désactiver)</button>` : `<button class="btn primary block" data-act="set-program" data-id="${p.id}">⭐ Choisir ce programme</button>`}</div>
    ${p.seances.map((s, i) => `<div class="card"><h2>${esc(s.nom)}</h2>
      ${s.ex.map(([exId, sets, reps, restS]) => { const ex = exById(exId); return `<div class="list-item" data-act="ex-info" data-id="${exId}">
        <img class="thumb" src="${imgUrl(ex)}" alt="" loading="lazy"><div class="grow"><b>${esc(ex.nom)}</b>
        <div class="muted small">${sets} × ${esc(reps)}${restS ? ` · repos ${fmtTime(restS)}` : ""}</div></div><span class="arrow">ⓘ</span></div>`; }).join("")}
      <button class="btn primary block" style="margin-top:10px" data-act="start-program" data-prog="${p.id}" data-day="${i}">▶ Commencer cette séance</button></div>`).join("")}`;
}

function startProgramDay(pid, idx) {
  const p = PROGRAMS.find((x) => x.id === pid);
  const day = p.seances[idx];
  startSession(day.nom, day.ex.map(([exId, sets, reps, restS]) => ({ exId, sets, target: `${sets} × ${reps}`, rest: restS })), { programId: pid, dayIdx: idx });
}

// ============================================================
//  ENTRAÎNER (séances toutes faites, programmes, exercices)
// ============================================================
// Durée estimée d'une séance type (en minutes)
const allWorkouts = () => [...state.myWorkouts, ...WORKOUTS];
function workoutMinutes(w) {
  let sec = 0;
  for (const [, sets, reps, restS] of w.ex) {
    const m = String(reps).match(/(\d+)\s*min/), s = String(reps).match(/(\d+)\s*s\b/);
    sec += sets * (m ? +m[1] * 60 : s ? +s[1] : 45) + Math.max(0, sets - 1) * restS + 60;
  }
  return Math.max(10, Math.round(sec / 300) * 5);
}
function workoutMuscles(w) {
  const c = {};
  for (const [id] of w.ex) for (const m of exById(id).muscles) if (m !== "cardio") c[m] = (c[m] || 0) + 1;
  return Object.keys(c).sort((a, b) => c[b] - c[a]).slice(0, 3).map((m) => MUSCLES[m]);
}
const LEVELS = ["", "Débutant", "Intermédiaire", "Confirmé"];
const levelDots = (n) => `<span class="lvl" title="${LEVELS[n]}">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;

function workoutCard(w) {
  return `<div class="w-card" data-act="go" data-to="#/type/${w.id}">
    <div class="w-thumbs">${w.ex.slice(0, 3).map(([id]) => `<img src="${imgUrl(exById(id))}" alt="" loading="lazy">`).join("")}</div>
    <div class="grow"><b>${esc(w.nom)}</b>
      <div class="muted small">⏱ ${workoutMinutes(w)} min · ${w.ex.length} exos · ${levelDots(w.niveau)}</div>
      <div class="small w-muscles">${workoutMuscles(w).join(" · ")}</div></div>
    <span class="arrow">›</span></div>`;
}

function viewTrain(tab) {
  if (tab) ui.trainTab = tab;
  const t = ui.trainTab;
  let html = state.current
    ? `<a class="btn primary block big" href="#/live">⏱️ Reprendre la séance en cours</a>`
    : `<div class="grid2"><a class="btn primary big" href="#/creer">✏️ Créer ma séance</a><button class="btn big" data-act="start-free">＋ Séance libre</button></div>
       <button class="btn sm block" style="margin-top:8px" data-act="import-open">📥 Importer une séance d'un ami (QR / lien)</button>`;
  html += `<div class="seg" style="margin:14px 0">${[["seances", "Séances prêtes"], ["programmes", "Programmes"], ["exos", "Exercices"]]
    .map(([k, l]) => `<button class="${t === k ? "on" : ""}" data-act="go" data-to="#/entrainer/${k}">${l}</button>`).join("")}</div>`;
  if (t === "programmes") html += viewPrograms();
  else if (t === "exos") html += viewExercises();
  else {
    const all = allWorkouts();
    const list = all.filter((w) => ui.wCat === "Tous" || w.cat === ui.wCat);
    html += `<div class="chips" style="margin-bottom:12px">${["Tous", ...(state.myWorkouts.length ? ["Mes séances"] : []), ...WORKOUT_CATS].map((c) => `<button class="chip ${ui.wCat === c ? "on" : ""}" data-act="w-cat" data-c="${c}">${c}</button>`).join("")}</div>
      <p class="muted small" style="margin-top:0">${list.length} séances toutes faites : choisis, appuie sur « Commencer », l'appli te guide.</p>
      <div class="card list-card">${list.map(workoutCard).join("")}</div>`;
  }
  setTitle("Entraîner");
  return html;
}

function viewWorkout(id) {
  const w = allWorkouts().find((x) => x.id === id);
  if (!w) { go("#/entrainer"); return; }
  setTitle(w.nom);
  const muscles = {};
  for (const [exId] of w.ex) { const ex = exById(exId); ex.muscles.forEach((m) => (muscles[m] = "main")); ex.secondaires.forEach((m) => (muscles[m] = muscles[m] || "sec")); }
  const fake = { muscles: Object.keys(muscles).filter((m) => muscles[m] === "main"), secondaires: Object.keys(muscles).filter((m) => muscles[m] === "sec") };
  return `<div class="card"><p style="margin-top:0">${esc(w.desc)}</p>
      <div class="grid3"><div class="stat"><b>${workoutMinutes(w)}</b><span>minutes env.</span></div>
        <div class="stat"><b>${w.ex.length}</b><span>exercices</span></div>
        <div class="stat"><b style="font-size:16px;padding:5px 0">${levelDots(w.niveau)}</b><span>${LEVELS[w.niveau]}</span></div></div>
      <button class="btn primary block big" style="margin-top:12px" data-act="start-workout" data-id="${w.id}">▶ Commencer</button>
      <button class="btn sm block" style="margin-top:8px" data-act="share-w" data-id="${w.id}">📤 Partager à un ami</button>
      ${w.mine ? `<div class="grid2" style="margin-top:8px"><button class="btn sm" data-act="my-edit" data-id="${w.id}">✏️ Modifier</button><button class="btn sm danger" data-act="my-del" data-id="${w.id}">🗑 Supprimer</button></div>` : ""}</div>
    <div class="card"><h2>Muscles travaillés</h2>${bodyMap(fake)}</div>
    <div class="card list-card">${w.ex.map(([exId, sets, reps, restS]) => { const ex = exById(exId); return `<div class="list-item" data-act="ex-info" data-id="${exId}">
      <img class="thumb" src="${imgUrl(ex)}" alt="" loading="lazy"><div class="grow"><b>${esc(ex.nom)}</b>
      <div class="muted small">${sets} × ${esc(reps)}${restS ? ` · repos ${fmtTime(restS)}` : ""}</div></div><span class="arrow">ⓘ</span></div>`; }).join("")}</div>`;
}

// Séance proposée sur l'accueil quand aucun programme n'est actif (change chaque jour)
function suggestedWorkout() {
  const byGoal = { perte: ["Cardio / HIIT", "Full body", "Express"], seche: ["Full body", "Cardio / HIIT", "Jambes"], masse: ["Pecs", "Dos", "Jambes", "Épaules", "Bras"], maintien: ["Full body", "Machines", "Express"] };
  const cats = byGoal[state.profile.objectif] || byGoal.maintien;
  const pool = WORKOUTS.filter((w) => cats.includes(w.cat));
  const n = Math.floor(Date.now() / 86400000);
  return pool[n % pool.length];
}

// ============================================================
//  EAU
// ============================================================
function waterGoal() {
  if (num(state.settings.waterGoal)) return num(state.settings.waterGoal);
  const w = currentWeight();
  return w ? Math.min(4000, Math.max(1500, Math.round((w * 35) / 250) * 250)) : 2000;
}
function waterCard(d) {
  const ml = state.water[d] || 0, goal = waterGoal(), glass = num(state.settings.glass) || 250;
  const n = Math.max(Math.ceil(goal / glass), Math.ceil(ml / glass));
  const full = Math.floor(ml / glass);
  const cup = (on) => `<svg viewBox="0 0 24 30" class="cup ${on ? "on" : ""}"><path d="M3 3h18l-2.2 23.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8z" class="cup-glass"/>${on ? `<path d="M4.3 10h15.4l-1.8 16a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z" class="cup-water"/>` : ""}</svg>`;
  return `<div class="card water">
    <div class="row between"><h3>💧 Eau</h3><span><b>${(ml / 1000).toLocaleString("fr-FR")} L</b> <span class="muted small">/ ${(goal / 1000).toLocaleString("fr-FR")} L</span></span></div>
    <div class="cups">${[...Array(Math.min(n, 20))].map((_, i) => cup(i < full)).join("")}</div>
    <div class="progress water-bar"><div style="width:${Math.min(100, (ml / goal) * 100)}%"></div></div>
    <div class="row" style="margin-top:10px"><button class="btn sm" data-act="water" data-d="${d}" data-v="-1" ${ml ? "" : "disabled"} aria-label="Retirer un verre">−</button>
      <button class="btn sm primary grow" data-act="water" data-d="${d}" data-v="1">＋ 1 verre (${glass} ml)</button></div>
  </div>`;
}

// ============================================================
//  APPLE SANTÉ (via l'app Raccourcis de l'iPhone)
// ============================================================
// Une appli web n'a pas le droit d'écrire directement dans Santé : on passe par des raccourcis
// que l'utilisateur crée une fois, et que l'appli lance avec la valeur à enregistrer.
const HEALTH = {
  eau: { nom: "GymTrack Eau", titre: "💧 Eau bue", action: "Enregistrer un échantillon de santé", type: "Eau", unite: "mL", quand: "à chaque verre ajouté", test: 250 },
  poids: { nom: "GymTrack Poids", titre: "⚖️ Poids", action: "Enregistrer un échantillon de santé", type: "Poids", unite: "kg", quand: "à chaque pesée", test: null },
  seance: { nom: "GymTrack Séance", titre: "🏋️ Séance de muscu", action: "Enregistrer un entraînement", type: "Musculation traditionnelle", unite: "minutes (Durée)", quand: "à la fin de chaque séance", test: null },
  kcal: { nom: "GymTrack Calories", titre: "🍽️ Calories mangées", action: "Enregistrer un échantillon de santé", type: "Énergie alimentaire", unite: "kcal", quand: "quand tu appuies sur « Envoyer à Santé » dans Nutrition", test: null },
};
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function sendHealth(kind, value, force = false) {
  const h = state.settings.health || {};
  if (!force && (!h.on || h[kind] === false)) return false;
  if (!value) return false;
  saveNow();
  location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(HEALTH[kind].nom)}&input=text&text=${encodeURIComponent(String(r1(value)).replace(".", ","))}`;
  return true;
}

function viewHealth() {
  setTitle("Apple Santé");
  const h = state.settings.health || {};
  return `<div class="card"><h2>❤️ Relier GymTrack à Santé</h2>
      <p class="small" style="margin-top:0">Apple n'autorise pas les applis web à écrire directement dans Santé. L'astuce gratuite : l'app <b>Raccourcis</b> (déjà installée sur ton iPhone). Tu crées une fois de petits raccourcis, et GymTrack les lance pour enregistrer tes données dans Santé.</p>
      ${isIOS() ? "" : `<p class="small" style="color:var(--orange)">⚠️ Ça ne marche que sur iPhone.</p>`}
      <label class="switch-row"><span><b>Envoyer mes données à Santé</b><br><span class="muted small">Ouvre Raccourcis une seconde puis tu reviens</span></span>
        <input type="checkbox" class="switch" data-in="health" data-k="on" ${h.on ? "checked" : ""}></label></div>
    <div class="section-title">Ce qui est envoyé</div>
    <div class="card list-card">${Object.entries(HEALTH).map(([k, x]) => `<label class="switch-row"><span>${x.titre}<br><span class="muted small">${x.quand}</span></span>
      <input type="checkbox" class="switch" data-in="health" data-k="${k}" ${h[k] !== false ? "checked" : ""} ${h.on ? "" : "disabled"}></label>`).join("")}</div>
    <div class="section-title">Créer les raccourcis (une seule fois)</div>
    ${Object.entries(HEALTH).map(([k, x]) => `<details class="card guide">
      <summary><b>${x.titre}</b> → raccourci « ${x.nom} »</summary>
      <ol class="steps">
        <li>Ouvre l'app <b>Raccourcis</b> → onglet <b>Raccourcis</b> → bouton <b>＋</b> en haut à droite.</li>
        <li>Touche le nom en haut et renomme-le exactement : <b class="copy">${x.nom}</b></li>
        <li>Touche <b>Ajouter une action</b>, cherche <b>« ${x.action} »</b> et ajoute-la.</li>
        ${k === "seance" ? `<li>Type d'entraînement : <b>${x.type}</b>. Touche <b>Durée</b> → choisis la variable <b>« Entrée du raccourci »</b> (en minutes).</li>`
          : `<li>Type : <b>${x.type}</b>. Touche <b>Valeur</b> → choisis la variable <b>« Entrée du raccourci »</b>. Unité : <b>${x.unite}</b>.</li>`}
        <li>Touche <b>OK</b>. La première fois, iPhone te demandera d'autoriser Raccourcis à écrire dans Santé : accepte.</li>
      </ol>
      ${k === "seance" ? `<p class="muted small">Tu ne trouves pas « Enregistrer un entraînement » ? Dis-le-moi, il y a une autre méthode.</p>` : ""}
      ${x.test ? `<button class="btn sm block" data-act="health-test" data-k="${k}">Tester (enregistre ${x.test} ${x.unite} dans Santé)</button>` : ""}
    </details>`).join("")}
    <p class="muted small">Les raccourcis s'ouvrent une seconde puis tu reviens dans GymTrack (balaye vers le haut ou touche « ◀ GymTrack » en haut à gauche).</p>`;
}

// ============================================================
//  NUTRITION
// ============================================================
function viewNutrition() {
  setTitle("Nutrition");
  const d = ui.foodDay;
  const entries = state.food[d] || [];
  const t = foodTotals(entries);
  const g = dayGoals(d);
  const isToday = d === dayStr();
  const pct = g ? Math.min(1, t.k / g.kcal) : 0;
  const C = 2 * Math.PI * 52;
  let html = `<div class="row between" style="margin-bottom:12px">
      <button class="icon-btn" data-act="food-day" data-delta="-1">‹</button>
      <b>${isToday ? "Aujourd'hui" : fmtDay(d, { weekday: "long", day: "numeric", month: "long" })}</b>
      <button class="icon-btn" data-act="food-day" data-delta="1" ${isToday ? "disabled style='opacity:.3'" : ""}>›</button></div>
    <div class="card"><div class="ring-wrap">
      <svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="#232731" stroke-width="12"/>
        <circle cx="60" cy="60" r="52" fill="none" stroke="${g && t.k > g.kcal * 1.05 ? "#ff9f43" : "#c6ff3d"}" stroke-width="12" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 60 60)"/>
        <text x="60" y="58" text-anchor="middle" fill="#f1f3f7" font-size="24" font-weight="800">${Math.round(t.k)}</text>
        <text x="60" y="78" text-anchor="middle" fill="#9aa1b1" font-size="12">kcal</text></svg>
      <div class="grow">${g ? `<div class="muted small">Objectif ${g.kcal} kcal${g.delta ? ` <span class="adj ${g.delta < 0 ? "minus" : "plus"}">${g.delta > 0 ? "+" : ""}${g.delta}</span>` : ""}${g.steps ? ` <span class="adj plus">🚶+${g.steps}</span>` : ""}</div><div style="font-size:20px;font-weight:800">${g.kcal - Math.round(t.k) >= 0 ? `Reste ${g.kcal - Math.round(t.k)}` : `+${Math.round(t.k) - g.kcal} au-dessus`}</div>`
        : `<p class="muted small">Remplis ton profil dans l'onglet <a href="#/corps">Corps</a> pour avoir ton objectif calorique.</p>`}
        <div class="small" style="margin-top:6px">P ${Math.round(t.p)} g · G ${Math.round(t.c)} g · L ${Math.round(t.f)} g</div></div></div>
      ${g ? `<div style="margin-top:8px">${macroBars(t, g, false)}</div>` : ""}
      ${state.settings.health?.on && state.settings.health.kcal !== false && t.k ? `<button class="btn sm block" style="margin-top:12px" data-act="health-kcal" data-d="${d}">❤️ Envoyer ${Math.max(0, Math.round(t.k) - (state.healthSent[d] || 0))} kcal à Santé</button>` : ""}</div>
    ${stepsCard(d)}
    ${g ? weekBudgetCard(g, d) : ""}
    ${waterCard(d)}`;

  for (const [k, label] of Object.entries(MEALS)) {
    const items = entries.filter((e) => e.meal === k);
    const mt = foodTotals(items);
    html += `<div class="card"><div class="meal-head"><h3>${label} <span class="muted small">${items.length ? Math.round(mt.k) + " kcal" : ""}</span></h3>
      <button class="btn sm primary" data-act="add-food" data-meal="${k}">＋ Ajouter</button></div>
      ${items.map((e) => `<div class="food-line" data-act="edit-food" data-id="${e.id}"><span class="grow ellipsis">${esc(e.nom)} <span class="muted small">${Math.round(num(e.g))} g</span></span><b>${Math.round((num(e.k) * num(e.g)) / 100)} kcal</b></div>`).join("")}</div>`;
  }

  // Historique 7 derniers jours
  html += `<div class="section-title">7 derniers jours</div><div class="card"><div class="chart-box"><canvas id="kcalChart"></canvas></div></div>`;
  after(() => {
    const days = [...Array(7)].map((_, i) => { const x = parseDay(d); x.setDate(x.getDate() - 6 + i); return dayStr(x); });
    const vals = days.map((x) => Math.round(foodTotals(state.food[x] || []).k));
    const ds = [{ label: "Calories", data: vals, type: "bar", colors: vals.map((v, i) => (g && v > dayGoals(days[i]).kcal * 1.05 ? CH.orange : CH.accent) + (v ? "dd" : "33")) }];
    if (g) ds.push({ label: "Objectif", data: days.map((x) => dayGoals(x).kcal), color: "#8b92a3", dashed: true });
    lineChart("kcalChart", days.map((x) => parseDay(x).toLocaleDateString("fr-FR", { weekday: "short" })), ds, { zero: true, unit: "kcal", legend: false });
  });
  return html;
}

// Carte « budget de la semaine »
function weekBudgetCard(g, d) {
  const L = ["L", "M", "M", "J", "V", "S", "D"], today = dayStr();
  const pct = Math.min(100, (g.weekEaten / g.weekBudget) * 100);
  const msg = !g.adaptive ? "Objectif fixe chaque jour."
    : g.delta < 0 ? `Tu as mangé plus que prévu les jours d'avant : <b style="color:var(--text)">${-g.delta} kcal de moins</b> aujourd'hui pour rester dans ton budget de la semaine.`
    : g.delta > 0 ? `Tu as mangé moins que prévu les jours d'avant : tu peux manger <b style="color:var(--text)">${g.delta} kcal de plus</b> aujourd'hui.`
    : "Tu es pile dans ton budget : objectif normal aujourd'hui.";
  const stepsMsg = g.steps ? ` Tes pas t'ajoutent <b style="color:var(--green)">+${g.steps} kcal</b> aujourd'hui.` : "";
  return `<div class="card">
    <div class="row between"><h3>📅 Budget de la semaine</h3><span class="small"><b>${Math.round(g.weekEaten).toLocaleString("fr-FR")}</b> <span class="muted">/ ${g.weekBudget.toLocaleString("fr-FR")} kcal</span></span></div>
    <div class="progress ${g.weekEaten > g.weekBudget ? "over" : ""}" style="margin-top:10px"><div style="width:${pct}%"></div></div>
    <div class="week-days">${g.days.map((x, i) => {
      const k = dayKcal(x), tg = dayGoals(x).kcal, future = x > today;
      const cls = future ? "future" : k == null ? "empty" : k > tg * 1.05 ? "over" : k < tg * 0.9 ? "under" : "ok";
      return `<div class="wd ${cls} ${x === d ? "sel" : ""}"><span>${L[i]}</span><b>${k == null ? (future ? tg : "–") : Math.round(k)}</b><small>${future ? "prévu" : "/ " + tg}</small></div>`;
    }).join("")}</div>
    <p class="muted small" style="margin:10px 0 0">${msg}${stepsMsg}${g.clamped ? (g.idx < 6 ? " On ne descend jamais sous un minimum sain : le reste est étalé sur les jours suivants." : " On ne descend jamais sous un minimum sain : la semaine prochaine repart à zéro.") : ""}</p>
    <label class="switch-row" style="padding-bottom:0"><span class="small"><b>Objectif adaptatif</b><br><span class="muted">Ajuste chaque jour selon ce que tu as mangé avant dans la semaine</span></span>
      <input type="checkbox" class="switch" data-in="adaptive" ${g.adaptive ? "checked" : ""}></label>
  </div>`;
}

let scanner = null;
function stopScanner() {
  if (scanner) { const s = scanner; scanner = null; s.stop().then(() => s.clear()).catch(() => {}); }
}

function addFoodModal(meal, tab) {
  tab = tab || (state.settings.aiKey ? "photo" : "scan");
  const tabs = [["photo", "📸 Photo IA"], ["scan", "📷 Code-barres"], ["search", "🔍 Chercher"], ["recent", "🕘 Récents"], ["manual", "✏️ Manuel"]];
  let body = `<div class="chips" style="margin-bottom:12px">${tabs.map(([k, l]) => `<button class="chip ${k === tab ? "on" : ""}" data-act="food-tab" data-tab="${k}" data-meal="${meal}">${l}</button>`).join("")}</div>`;
  if (tab === "scan") {
    body += `<div id="reader"></div><p class="muted small center" id="scanMsg">Vise le code-barres du produit</p>
      <div class="row"><input id="codeIn" inputmode="numeric" placeholder="ou tape le code-barres"><button class="btn" data-act="code-go" data-meal="${meal}">OK</button></div>`;
  } else if (tab === "photo") {
    body += photoTabHtml(meal);
  } else if (tab === "search") {
    body += `<div class="row"><input id="foodQ" placeholder="Ex : riz, poulet, Nutella…" autocomplete="off"><button class="btn" data-act="food-search" data-meal="${meal}">🔍</button></div>
      <div id="foodRes" style="margin-top:8px">${basicFoodsHtml("", meal)}</div>`;
  } else if (tab === "recent") {
    body += state.recentFoods.length ? state.recentFoods.map((f, i) => foodRow(f, meal, `recent:${i}`)).join("") : `<div class="empty">Aucun aliment récent</div>`;
  } else {
    body += `<div class="stack"><label class="field">Nom<input id="mNom" placeholder="Ex : Sandwich maison"></label>
      <p class="muted small" style="margin:0">Valeurs pour 100 g (regarde l'étiquette) :</p>
      <div class="grid2"><label class="field">Calories (kcal)<input id="mK" inputmode="decimal"></label><label class="field">Protéines (g)<input id="mP" inputmode="decimal"></label>
      <label class="field">Glucides (g)<input id="mC" inputmode="decimal"></label><label class="field">Lipides (g)<input id="mF" inputmode="decimal"></label></div>
      <label class="field">Quantité mangée (g)<input id="mG" inputmode="decimal" value="100"></label>
      <button class="btn primary block" data-act="manual-food" data-meal="${meal}">Ajouter</button></div>`;
  }
  openModal(`Ajouter – ${MEALS[meal]}`, body, stopScanner);
  if (tab === "scan") startScanner(meal);
  if (tab === "photo") {
    foodAI.meal = meal;
    $("aiPhoto")?.addEventListener("change", (e) => { if (e.target.files[0]) onFoodPhoto(e.target.files[0]); e.target.value = ""; });
  }
  if (tab === "search") {
    const q = $("foodQ");
    q.addEventListener("input", () => { $("foodRes").innerHTML = basicFoodsHtml(q.value, meal); });
    q.addEventListener("keydown", (e) => { if (e.key === "Enter") searchFood(q.value, meal); });
  }
}

let foodCache = {};
function foodRow(f, meal, ref) {
  foodCache[ref] = f;
  return `<div class="list-item" data-act="pick-food" data-ref="${esc(ref)}" data-meal="${meal}">
    ${f.img ? `<img class="thumb" src="${esc(f.img)}" alt="" loading="lazy" style="object-fit:contain">` : ""}
    <div class="grow"><b>${esc(f.nom)}</b><div class="muted small">${f.marque ? esc(f.marque) + " · " : ""}${Math.round(f.k)} kcal / 100 g</div></div><span class="arrow">＋</span></div>`;
}
function basicFoodsHtml(q, meal) {
  const ql = q.toLowerCase().trim();
  const list = BASIC_FOODS.filter(([n]) => !ql || n.toLowerCase().includes(ql)).slice(0, ql ? 30 : 12);
  return `<p class="muted small">${ql ? "Aliments de base" : "Aliments de base — tape un nom puis 🔍 pour chercher aussi les produits du commerce"}</p>` +
    list.map(([nom, k, p, c, f, portion]) => foodRow({ nom, k, p, c, f, portion }, meal, `basic:${nom}`)).join("") +
    (ql ? `<button class="btn block" data-act="food-search" data-meal="${meal}">🔍 Chercher « ${esc(q)} » dans les produits du commerce</button>` : "");
}

// Open Food Facts : base de données gratuite et ouverte de produits alimentaires
const OFF_FIELDS = "code,product_name,product_name_fr,brands,nutriments,serving_quantity,image_front_small_url";
function mapOff(p, code) {
  const n = p.nutriments || {};
  const k = n["energy-kcal_100g"] ?? (n["energy_100g"] ? n["energy_100g"] / 4.184 : null);
  if (k == null) return null;
  return {
    nom: p.product_name_fr || p.product_name || "Produit " + code, marque: (p.brands || "").split(",")[0],
    k: r1(num(k)), p: r1(num(n.proteins_100g)), c: r1(num(n.carbohydrates_100g)), f: r1(num(n.fat_100g)),
    portion: num(p.serving_quantity) || null, img: p.image_front_small_url || null, code,
  };
}
async function fetchProduct(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`);
  const j = await r.json();
  return j.status === 1 ? mapOff(j.product, code) : null;
}
async function searchFood(q, meal) {
  if (!q.trim()) return;
  const res = $("foodRes");
  res.innerHTML = basicFoodsHtml(q, meal).replace(/<button[^]*$/, "") + `<p class="muted center">Recherche des produits…</p>`;
  try {
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=25&fields=${OFF_FIELDS}`);
    const j = await r.json();
    const items = (j.products || []).map((p) => mapOff(p, p.code)).filter(Boolean);
    if (!$("foodRes")) return;
    $("foodRes").innerHTML = basicFoodsHtml(q, meal).replace(/<button[^]*$/, "") + `<p class="muted small">Produits du commerce</p>` +
      (items.length ? items.map((f, i) => foodRow(f, meal, `off:${i}:${f.code}`)).join("") : `<div class="empty">Aucun produit trouvé</div>`);
  } catch (e) {
    if ($("foodRes")) $("foodRes").insertAdjacentHTML("beforeend", `<p class="center" style="color:var(--red)">Pas de connexion internet ?</p>`);
  }
}

function startScanner(meal) {
  if (typeof Html5Qrcode === "undefined") { $("scanMsg").textContent = "Scanner indisponible, tape le code."; return; }
  const F = Html5QrcodeSupportedFormats;
  scanner = new Html5Qrcode("reader", { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E], verbose: false });
  const s = scanner;
  s.start({ facingMode: "environment" }, { fps: 12, qrbox: (w) => ({ width: Math.min(280, w * 0.85), height: 120 }) },
    (code) => { if (scanner !== s) return; stopScanner(); if (navigator.vibrate) navigator.vibrate(80); lookupCode(code, meal); },
    () => {})
    .catch(() => { if ($("scanMsg")) $("scanMsg").textContent = "Impossible d'ouvrir la caméra (autorise l'accès, ou tape le code-barres)."; });
}

async function lookupCode(code, meal) {
  code = String(code).replace(/\D/g, "");
  if (!code) return;
  if ($("scanMsg")) $("scanMsg").textContent = `Code ${code} — recherche…`;
  try {
    const f = await fetchProduct(code);
    if (!f) { toast("Produit introuvable 😕 Ajoute-le en manuel"); addFoodModal(meal, "manual"); return; }
    foodForm(f, meal);
  } catch (e) { toast("Pas de connexion internet ?"); }
}

// Formulaire quantité → calcul automatique des calories
function foodForm(f, meal, entry) {
  const g0 = entry ? entry.g : f.portion || 100;
  openModal(entry ? "Modifier" : "Quantité", `<div class="stack">
    <div class="row">${f.img ? `<img src="${esc(f.img)}" alt="" style="width:64px;height:64px;object-fit:contain;background:#fff;border-radius:10px">` : ""}
      <div class="grow"><b>${esc(f.nom)}</b><div class="muted small">${f.marque ? esc(f.marque) + " · " : ""}pour 100 g : ${f.k} kcal · P ${f.p} · G ${f.c} · L ${f.f}</div></div></div>
    <label class="field">Quantité mangée (grammes)<input id="qtyIn" inputmode="decimal" value="${g0}"></label>
    <div class="chips">${[...new Set([f.portion, 30, 50, 100, 150, 200, 250].filter(Boolean))].map((q) => `<button class="chip" data-act="qty" data-v="${q}">${q} g${q === f.portion ? " (portion)" : ""}</button>`).join("")}</div>
    <label class="field">Repas<select id="mealIn">${Object.entries(MEALS).map(([k, l]) => `<option value="${k}" ${k === meal ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <div class="card center" style="margin:0"><div style="font-size:30px;font-weight:800" id="qtyK"></div><div class="muted small" id="qtyM"></div></div>
    <button class="btn primary block" data-act="confirm-food">${entry ? "Enregistrer" : "Ajouter"}</button>
    ${entry ? `<button class="btn danger block" data-act="del-food" data-id="${entry.id}">Supprimer</button>` : ""}</div>`);
  const upd = () => {
    const q = num($("qtyIn").value) / 100;
    $("qtyK").textContent = `${Math.round(f.k * q)} kcal`;
    $("qtyM").textContent = `Protéines ${r1(f.p * q)} g · Glucides ${r1(f.c * q)} g · Lipides ${r1(f.f * q)} g`;
  };
  $("qtyIn").addEventListener("input", upd); upd();
  foodForm.current = { f, entry };
}

function confirmFood() {
  const { f, entry } = foodForm.current;
  const g = num($("qtyIn").value);
  if (!g) return toast("Indique une quantité");
  const meal = $("mealIn").value;
  const list = (state.food[ui.foodDay] = state.food[ui.foodDay] || []);
  if (entry) Object.assign(entry, { g, meal });
  else list.push({ id: uid(), meal, g, nom: f.nom, marque: f.marque || "", k: f.k, p: f.p, c: f.c, f: f.f });
  // Garde en mémoire les aliments récents (sans doublons)
  const key = f.nom + "|" + (f.marque || "");
  state.recentFoods = [{ nom: f.nom, marque: f.marque || "", k: f.k, p: f.p, c: f.c, f: f.f, portion: f.portion || null, img: f.img || null },
    ...state.recentFoods.filter((r) => r.nom + "|" + (r.marque || "") !== key)].slice(0, 30);
  save();
  closeModal();
  if (location.hash !== "#/nutrition") go("#/nutrition"); else route();
  toast(`${Math.round((f.k * g) / 100)} kcal ajoutées`);
}

// ============================================================
//  CORPS (profil + mensurations)
// ============================================================
const BODY_FIELDS = [["poids", "Poids (kg)"], ["gras", "Masse grasse (%)"], ["muscle", "Masse musculaire (kg)"], ["taille_cm", "Tour de taille (cm)"], ["bras", "Tour de bras (cm)"], ["poitrine", "Tour de poitrine (cm)"], ["cuisse", "Tour de cuisse (cm)"]];

function viewBody() {
  setTitle("Suivi corporel");
  const p = state.profile;
  const g = nutritionGoals();
  const w = currentWeight(), h = num(p.taille);
  const list = [...state.body].sort((a, b) => a.date.localeCompare(b.date));
  const last = list[list.length - 1];
  let html = "";

  if (w && h) {
    const imc = w / (h / 100) ** 2;
    const cat = imc < 18.5 ? "Maigreur" : imc < 25 ? "Normal" : imc < 30 ? "Surpoids" : "Obésité";
    const firstW = list.find((b) => num(b.poids));
    const dW = firstW ? r1(w - num(firstW.poids)) : 0;
    html += `<div class="grid3">
      <div class="stat"><b>${r1(w)}</b><span>kg${list.length > 1 && dW ? ` (${dW > 0 ? "+" : ""}${dW})` : ""}</span></div>
      <div class="stat"><b>${r1(imc)}</b><span>IMC · ${cat}</span></div>
      <div class="stat"><b>${last && num(last.gras) ? r1(num(last.gras)) + "%" : "–"}</b><span>masse grasse</span></div></div>
      <p class="muted small">ℹ️ L'IMC ne fait pas la différence entre muscle et gras : suis aussi ton tour de taille et tes photos.</p>`;
  }

  html += `<button class="btn primary block" data-act="add-body" style="margin:12px 0">＋ Nouvelle mesure</button>`;

  if (list.length) {
    const metric = ui.bodyMetric;
    const avail = BODY_FIELDS.filter(([k]) => list.some((b) => num(b[k])));
    const all = list.filter((b) => num(b[metric]));
    const pts = all.filter((b) => inPeriod(b.date)).length ? all.filter((b) => inPeriod(b.date)) : all.slice(-1);
    const lab = BODY_FIELDS.find(([k]) => k === metric)[1];
    const unit = lab.match(/\((.*)\)/)[1];
    const v0 = pts.length ? num(pts[0][metric]) : 0, v1 = pts.length ? num(pts[pts.length - 1][metric]) : 0;
    // perdre du poids / du gras / du tour de taille = vert ; prendre du muscle / des tours de bras = vert
    const lowerIsBetter = ["gras", "taille_cm"].includes(metric) || (metric === "poids" && ["perte", "seche"].includes(state.profile.objectif));
    html += `<div class="chips" style="margin-bottom:10px">${avail.map(([k, l]) => `<button class="chip ${k === metric ? "on" : ""}" data-act="body-metric" data-k="${k}">${l.split(" (")[0]}</button>`).join("")}</div>
      <div class="card">${pts.length ? kpiHead(r1(v1), unit, pts.length > 1 ? v1 - v0 : null, pts.length > 1 ? `depuis le ${fmtShort(pts[0].date)}` : "", lowerIsBetter) : ""}
      <div class="chart-box"><canvas id="bodyChart"></canvas></div>${periodChips()}</div>`;
    after(() => lineChart("bodyChart", pts.map((b) => fmtShort(b.date)), [{ label: lab.split(" (")[0], data: pts.map((b) => num(b[metric])) }], { unit }));
    html += `<div class="section-title">Historique des mesures</div><div class="card">${[...list].reverse().map((b) => `<div class="list-item" data-act="edit-body" data-id="${b.id}">
      <div class="grow"><b>${fmtDay(b.date)}</b><div class="muted small">${BODY_FIELDS.filter(([k]) => num(b[k])).map(([k, l]) => `${l.split(" (")[0]} ${b[k]}${l.match(/\((.*)\)/)[1]}`).join(" · ")}</div></div><span class="arrow">›</span></div>`).join("")}</div>`;
  }

  html += `<div class="section-title">Mon profil & objectif</div><div class="card stack">
    <div class="grid2">
      <label class="field">Sexe<select data-in="profile" data-k="sexe"><option value="h" ${p.sexe === "h" ? "selected" : ""}>Homme</option><option value="f" ${p.sexe === "f" ? "selected" : ""}>Femme</option></select></label>
      <label class="field">Âge<input data-in="profile" data-k="age" inputmode="numeric" value="${esc(p.age)}"></label>
      <label class="field">Taille (cm)<input data-in="profile" data-k="taille" inputmode="decimal" value="${esc(p.taille)}"></label>
      <label class="field">Poids (kg)<input data-in="profile" data-k="poids" inputmode="decimal" value="${esc(p.poids)}" placeholder="${list.length ? "selon la dernière mesure" : ""}"></label>
    </div>
    <label class="field">Activité<select data-in="profile" data-k="activite">${Object.entries(ACTIVITES).map(([k, l]) => `<option value="${k}" ${String(p.activite) === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="field">Objectif<select data-in="profile" data-k="objectif">${Object.entries(OBJECTIFS).map(([k, o]) => `<option value="${k}" ${p.objectif === k ? "selected" : ""}>${o.nom}</option>`).join("")}</select></label>
    <label class="field">Objectif calorique perso (optionnel)<input data-in="profile" data-k="kcalPerso" inputmode="numeric" value="${esc(p.kcalPerso)}" placeholder="Laisse vide pour le calcul auto"></label>
    <button class="btn block" data-act="refresh">Calculer</button>
    ${g ? `<div class="grid2">
      <div class="stat"><b>${g.bmr}</b><span>kcal au repos (métabolisme)</span></div>
      <div class="stat"><b>${g.tdee}</b><span>kcal pour maintenir</span></div>
      <div class="stat" style="grid-column:span 2;border:1px solid var(--accent)"><b>${g.kcal} kcal / jour</b><span>pour ton objectif « ${OBJECTIFS[p.objectif].nom} »</span></div>
      <div class="stat"><b>${g.prot} g</b><span>protéines</span></div><div class="stat"><b>${g.gluc} g</b><span>glucides</span></div>
      <div class="stat"><b>${g.lip} g</b><span>lipides</span></div>
    </div>` : `<p class="muted small">Remplis âge, taille et poids pour calculer tes besoins.</p>`}</div>`;
  return html;
}

function bodyModal(entry) {
  const b = entry || { date: dayStr() };
  openModal(entry ? "Modifier la mesure" : "Nouvelle mesure", `<div class="stack">
    <label class="field">Date<input type="date" id="bDate" value="${b.date}" max="${dayStr()}"></label>
    <div class="grid2">${BODY_FIELDS.map(([k, l]) => `<label class="field">${l}<input id="b_${k}" inputmode="decimal" value="${esc(b[k] ?? "")}"></label>`).join("")}</div>
    <p class="muted small" style="margin:0">Remplis seulement ce que tu as (le poids suffit). La masse grasse/musculaire vient d'une balance impédancemètre.</p>
    <button class="btn primary block" data-act="save-body" data-id="${entry ? entry.id : ""}">Enregistrer</button>
    ${entry ? `<button class="btn danger block" data-act="del-body" data-id="${entry.id}">Supprimer</button>` : ""}</div>`);
}

// ============================================================
//  RÉGLAGES
// ============================================================
function viewSettings() {
  setTitle("Réglages");
  return `<a class="card row health-link" href="#/notifs"><span style="font-size:28px">🔔</span><div class="grow"><b>Notifications de motivation</b>
      <div class="muted small">${state.reminders.filter((r) => r.on).length ? `${state.reminders.filter((r) => r.on).length} rappel(s) programmé(s)` : "Programme des rappels : motivation, séance, eau, défi…"}</div></div><span class="arrow">›</span></a>
    <a class="card row health-link" href="#/sante"><span style="font-size:28px">❤️</span><div class="grow"><b>Apple Santé</b>
      <div class="muted small">${state.settings.health?.on ? "Activé : eau, poids, séances et calories envoyés à Santé" : "Envoie ton eau, ton poids et tes séances dans l'app Santé de l'iPhone"}</div></div><span class="arrow">›</span></a>
    <div class="card stack"><h2>⏱️ Repos par défaut</h2>
      <label class="field">Durée du chrono de repos (secondes)<input data-in="rest" inputmode="numeric" value="${state.settings.rest}"></label></div>
    <div class="card list-card"><label class="switch-row"><span><b>🔥 Échauffement au début</b><br><span class="muted small">5 min de mobilité ajoutées à chaque séance (sauf cardio et étirements)</span></span>
        <input type="checkbox" class="switch" data-in="setting-bool" data-k="warmup" ${state.settings.warmup !== false ? "checked" : ""}></label>
      <label class="switch-row"><span><b>🚶 Marche inclinée à la fin</b><br><span class="muted small">Ajoutée à chaque séance de muscu (sauf cardio)</span></span>
        <input type="checkbox" class="switch" data-in="setting-bool" data-k="walk" ${state.settings.walk !== false ? "checked" : ""}></label>
      <label class="field" style="padding:10px 0">Durée de la marche (minutes)<input data-in="setting" data-k="walkMin" inputmode="numeric" value="${esc(state.settings.walkMin || 12)}"></label></div>
    <div class="card stack"><h2>🌙 Sommeil</h2>
      <label class="field">Objectif de sommeil (heures)<input data-in="setting" data-k="sleepGoal" inputmode="decimal" value="${esc(state.settings.sleepGoal || "")}" placeholder="8"></label></div>
    <div class="card stack"><h2>🚶 Pas</h2>
      <div class="grid2"><label class="field">Objectif de pas / jour<input data-in="setting" data-k="stepGoal" inputmode="numeric" value="${esc(state.settings.stepGoal || "")}" placeholder="10000"></label>
      <label class="field">Pas déjà inclus dans ton activité<input data-in="setting" data-k="stepBase" inputmode="numeric" value="${esc(state.settings.stepBase ?? "")}" placeholder="5000"></label></div>
      <label class="switch-row" style="padding-bottom:0"><span class="small"><b>Ajouter les calories des pas à mon objectif</b><br><span class="muted">Plus tu marches, plus tu peux manger (seulement au-delà des pas déjà inclus)</span></span>
        <input type="checkbox" class="switch" data-in="setting-bool" data-k="stepsInGoal" ${state.settings.stepsInGoal !== false ? "checked" : ""}></label></div>
    <div class="card stack"><h2>💧 Eau</h2>
      <div class="grid2"><label class="field">Taille d'un verre (ml)<input data-in="setting" data-k="glass" inputmode="numeric" value="${esc(state.settings.glass)}"></label>
      <label class="field">Objectif par jour (ml)<input data-in="setting" data-k="waterGoal" inputmode="numeric" value="${esc(state.settings.waterGoal)}" placeholder="auto : ${waterGoal()}"></label></div>
      <p class="muted small" style="margin:0">Laisse l'objectif vide pour le calcul automatique (35 ml par kg de poids).</p></div>
    <div class="card stack"><h2>💾 Sauvegarde</h2>
      <p class="muted small" style="margin:0">Tes données sont stockées uniquement sur ce téléphone. Fais une sauvegarde de temps en temps (ou avant de changer de téléphone).</p>
      <button class="btn block" data-act="export">⬇️ Exporter mes données</button>
      <label class="btn block">⬆️ Importer une sauvegarde<input type="file" accept=".json,application/json" id="importIn" hidden></label>
      <button class="btn danger block" data-act="reset">🗑 Tout effacer</button></div>
    <div class="card"><h2>📲 Installer l'appli</h2>
      <p class="small"><b>Android (Chrome)</b> : menu ⋮ → « Ajouter à l'écran d'accueil » / « Installer l'application ».</p>
      <p class="small"><b>iPhone (Safari)</b> : bouton Partager ⬆️ → « Sur l'écran d'accueil ».</p>
      <p class="muted small">L'appli fonctionne ensuite hors-ligne (sauf la recherche/scan d'aliments qui a besoin d'internet).</p></div>
    <div class="card stack"><h2>🔄 Mise à jour</h2>
      <p class="muted small" style="margin:0">Version installée : <b style="color:var(--text)">${APP_VERSION}</b>. L'appli se met à jour toute seule à l'ouverture (avec internet). Si tu vois encore une ancienne version, force la mise à jour : tes données ne sont pas effacées.</p>
      <button class="btn block" data-act="force-update">🔄 Forcer la mise à jour</button></div>
    <p class="muted small center">GymTrack · 100% gratuit · Données aliments : Open Food Facts · Images d'exercices : free-exercise-db</p>`;
}

// ============================================================
//  Actions (clics)
// ============================================================
const ACTIONS = {
  go: (el) => { go(el.dataset.to); if (el.dataset.then === "add-food") setTimeout(() => addFoodModal(guessMeal()), 50); },
  back: () => { if (history.length > 1) history.back(); else go("#/accueil"); },
  "close-modal": closeModal,
  refresh: () => route(),

  // séances
  "start-free": () => startSession("Séance du " + new Date().toLocaleDateString("fr-FR", { weekday: "long" }), []),
  "start-program": (el) => startProgramDay(el.dataset.prog, +el.dataset.day),
  "redo-session": (el) => { const s = state.sessions.find((x) => x.id === el.dataset.id); startSession(s.name, s.exercises.filter((e) => !e.role).map((e) => ({ exId: e.exId, sets: e.sets.length }))); },
  "del-session": (el) => { if (!confirm("Supprimer cette séance ?")) return; state.sessions = state.sessions.filter((s) => s.id !== el.dataset.id); save(); go("#/agenda"); },
  "pick-ex": () => pickExerciseModal((id) => {
    const list = state.current.exercises, item = { exId: id, target: "", rest: state.settings.rest, sets: [newSet(), newSet(), newSet()] };
    const end = list.length && list[list.length - 1].role === "cooldown" ? list.length - 1 : list.length;
    list.splice(end, 0, item);
    save(); route();
    document.querySelectorAll(".ex-live")[end]?.scrollIntoView({ block: "center" });
  }),
  "pick-grp": (el) => pickExerciseModal.onGroup(el.dataset.g),
  pick: (el) => pickExerciseModal.onPick(el.dataset.id),
  "add-to-live": (el) => {
    if (!state.current) startSession("Séance du " + new Date().toLocaleDateString("fr-FR", { weekday: "long" }), [{ exId: el.dataset.id, sets: 3 }]);
    else { state.current.exercises.push({ exId: el.dataset.id, target: "", rest: state.settings.rest, sets: [newSet(), newSet(), newSet()] }); save(); go("#/live"); }
  },
  "add-set": (el) => { const e = state.current.exercises[+el.dataset.i]; e.sets.push(newSet(e.sets[e.sets.length - 1])); e.sets[e.sets.length - 1].done = false; save(); route(); },
  "del-set": (el) => { state.current.exercises[+el.dataset.i].sets.pop(); save(); route(); },
  "set-done": (el) => {
    const e = state.current.exercises[+el.dataset.i], s = e.sets[+el.dataset.j], ex = exById(e.exId);
    // Si la série est vide, on reprend les valeurs affichées en gris (dernière fois)
    if (!s.done) {
      el.closest("tr").querySelectorAll("input").forEach((inp) => { if (!inp.value && inp.placeholder !== "–") s[inp.dataset.k] = inp.placeholder; });
      if (!isFilled(ex.type, s)) return toast("Remplis la série d'abord");
      if (navigator.vibrate) navigator.vibrate(30);
    }
    s.done = !s.done; save(); route();
    if (s.done && e.rest) startRest(e.rest);
  },
  "ex-menu": (el) => {
    const i = +el.dataset.i, e = state.current.exercises[i];
    openModal(exById(e.exId).nom, `<div class="stack">
      <button class="btn block" data-act="ex-info" data-id="${e.exId}">📖 Voir la technique</button>
      <label class="field">Repos entre les séries (secondes)<input id="restIn" inputmode="numeric" value="${e.rest || state.settings.rest}"></label>
      <button class="btn block" data-act="ex-rest" data-i="${i}">Enregistrer le repos</button>
      <div class="grid2"><button class="btn" data-act="ex-move" data-i="${i}" data-d="-1">↑ Monter</button><button class="btn" data-act="ex-move" data-i="${i}" data-d="1">↓ Descendre</button></div>
      <button class="btn block" data-act="ex-swap" data-i="${i}">🔄 Remplacer par une alternative</button>
      <button class="btn danger block" data-act="ex-del" data-i="${i}">🗑 Retirer de la séance</button></div>`);
  },
  "ex-rest": (el) => { state.current.exercises[+el.dataset.i].rest = num($("restIn").value); save(); closeModal(); route(); },
  "ex-move": (el) => {
    const a = state.current.exercises, i = +el.dataset.i, j = i + +el.dataset.d;
    if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; save(); closeModal(); route();
  },
  "ex-swap": (el) => swapModal(+el.dataset.i),
  "swap-to": (el) => {
    const e = state.current.exercises[+el.dataset.i], old = exById(e.exId).nom;
    e.exId = el.dataset.id; e.sets = e.sets.map(() => newSet());
    save(); closeModal(); route(); toast(`⇄ ${old} → ${exById(e.exId).nom}`);
  },
  "ex-replace": (el) => { const i = +el.dataset.i; pickExerciseModal((id) => { const e = state.current.exercises[i]; e.exId = id; e.sets = e.sets.map(() => newSet()); save(); route(); }); },
  "ex-del": (el) => { state.current.exercises.splice(+el.dataset.i, 1); save(); closeModal(); route(); },
  "ex-info": (el) => { const ex = exById(el.dataset.id); openModal(ex.nom, exerciseDetailHtml(ex, false), () => clearInterval(animInt)); animateExercise(ex); },
  "cancel-session": () => { if (confirm("Annuler la séance ? Rien ne sera enregistré.")) { state.current = null; stopRest(); save(); go("#/agenda"); } },
  "finish-session": finishModal,
  feel: (el) => finishModal.setFeel(+el.dataset.v),
  "save-session": saveSession,
  "rest-add": () => { rest.end += 15000; tickRest(); },
  "rest-stop": stopRest,

  // exercices / programmes
  "ex-grp": (el) => { ui.exGroup = el.dataset.g; route(); },
  period: (el) => { ui.period = el.dataset.k; route(); },
  "prog-metric": (el) => { ui.progMetric = el.dataset.k; route(); },
  "prog-filter": (el) => { ui.progFilter = el.dataset.k; route(); },
  "set-program": (el) => { state.activeProgram = { id: el.dataset.id, next: 0 }; save(); route(); toast("Programme activé ⭐ Retrouve ta prochaine séance sur l'accueil"); },
  "unset-program": () => { state.activeProgram = null; save(); route(); },

  // notifications
  "notif-perm": async () => {
    if (!("Notification" in window)) return toast("Pas de notifications ici : installe l'appli sur l'écran d'accueil");
    const r = await Notification.requestPermission();
    toast(r === "granted" ? "🔔 Notifications autorisées" : "Notifications refusées (modifiable dans les réglages de l'iPhone)");
    route();
  },
  "notif-test": () => notify("💪 GymTrack", MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)]),
  "notif-edit": (el) => reminderModal(+el.dataset.i),
  "notif-preset": (el) => { state.reminders.push({ id: uid(), ...structuredClone(PRESETS[+el.dataset.i]), text: "", on: true }); save(); route(); toast("Rappel ajouté ✅"); },
  "rem-day": (el) => {
    const d = +el.dataset.d, a = reminderModal.days;
    reminderModal.days = a.includes(d) ? a.filter((x) => x !== d) : [...a, d].sort();
    el.classList.toggle("on", reminderModal.days.includes(d));
  },
  "rem-save": (el) => {
    const i = +el.dataset.i;
    if (!reminderModal.days.length) return toast("Choisis au moins un jour");
    const r = { id: i >= 0 ? state.reminders[i].id : uid(), type: $("remType").value, time: $("remTime").value || "18:00", days: reminderModal.days, text: $("remText").value.trim(), on: true };
    if (i >= 0) state.reminders[i] = r; else state.reminders.push(r);
    state.reminders.sort((a, b) => a.time.localeCompare(b.time));
    save(); closeModal(); route();
  },
  "rem-del": (el) => { state.reminders.splice(+el.dataset.i, 1); save(); closeModal(); route(); },

  // défi
  "defi-check": (el) => defiToggle(+el.dataset.i),
  "defi-timer": (el) => defiTimerModal(+el.dataset.i),
  "defi-test": (el) => defiTestModal(el.dataset.id),
  "defi-test-save": (el) => {
    const v = Math.round(num($("testIn").value));
    if (!v) return toast("Indique un nombre");
    const ex = exById(el.dataset.id), before = rankInfo(ex)?.i ?? -1;
    (state.defiRec[ex.id] = state.defiRec[ex.id] || []).push({ d: dayStr(), v });
    save(); closeModal(); route();
    const after = rankInfo(ex)?.i ?? -1;
    toast(after > before && after > 0 ? `🎖️ Nouveau rang ${RANKS[after].nom} sur ${ex.nom} !` : `Record noté : ${v} ${ex.type === "temps" ? "s" : "reps"}`, 3500);
  },
  "defi-lvl": (el) => {
    const auto = Math.min(10, 1 + Math.floor(defiDoneDays().length / 3));
    state.settings.defiOffset = Math.max(1 - auto, Math.min(10 - auto, (state.settings.defiOffset || 0) + +el.dataset.v));
    save(); route();
  },

  // schéma anatomique détaillé
  "body-zoom": (el) => { bodyZoom.ex = BODY_REG[+el.dataset.i]; bodyZoom.view = "front"; bodyZoom.all = false; bodyZoom(); },
  "body-view": (el) => { bodyZoom.view = el.dataset.v; bodyZoom(); },
  "body-all": () => { bodyZoom.all = !bodyZoom.all; bodyZoom(); },

  // partage
  "share-w": (el) => shareModal(allWorkouts().find((x) => x.id === el.dataset.id)),
  "share-s": (el) => {
    const s = state.sessions.find((x) => x.id === el.dataset.id);
    const ex = s.exercises.filter((e) => !e.role).map((e) => { const x = exById(e.exId), b = bestSet(x.type, e.sets) || {}; return [e.exId, e.sets.length, x.type === "force" || x.type === "pdc" ? String(num(b.reps) || 10) : x.type === "temps" ? `${num(b.sec)} s` : `${num(b.min)} min`, 90]; });
    shareModal({ nom: s.name, ex });
  },
  "share-link": () => shareLink(),
  "share-copy": () => copyText(shareModal.data.code, "📋 Code copié"),
  "import-open": () => importModal(),
  "import-go": () => openImport($("importIn").value),
  "import-save": () => {
    const w = viewImport.w;
    state.myWorkouts.unshift({ id: "my_" + uid(), mine: true, nom: w.nom, cat: "Mes séances", niveau: 2, desc: "Séance partagée par un ami.", ex: w.ex });
    save(); ui.wCat = "Mes séances"; go("#/entrainer/seances"); toast("💾 Ajoutée à « Mes séances »");
  },
  "import-start": () => { const w = viewImport.w; startSession(w.nom, w.ex.map(([exId, sets, reps, restS]) => ({ exId, sets, target: `${sets} × ${reps}`, rest: restS }))); },

  // douleurs
  "pain-tap": (el) => {
    const j = el.dataset.j, p = finishModal.pains, l = ((p[j] || 0) + 1) % 3;
    if (l) p[j] = l; else delete p[j];
    el.className = l === 2 ? "strong" : l === 1 ? "light" : "";
    el.dataset.l = l;
  },
  "pain-clear": (el) => { state.painsCleared = el.dataset.id; save(); route(); toast("Tant mieux 💪"); },

  // sommeil
  "sleep-edit": (el) => sleepModal(el.dataset.d),
  "sleep-q": (el) => { sleepModal.q = +el.dataset.v; document.querySelectorAll("[data-act=sleep-q]").forEach((b) => b.classList.toggle("on", +b.dataset.v === sleepModal.q)); },
  "sleep-save": (el) => {
    const d = el.dataset.d, n = { bed: $("slBed").value, wake: $("slWake").value, q: sleepModal.q || 0 };
    if (!sleepMinutes(n)) return toast("Indique l'heure de coucher et de réveil");
    state.sleep[d] = n; save(); closeModal(); route();
    toast(`🌙 ${fmtSleep(sleepMinutes(n))} de sommeil${sleepMinutes(n) >= sleepGoal() * 60 ? " · objectif atteint 😴" : ""}`);
  },
  "sleep-del": (el) => { delete state.sleep[el.dataset.d]; save(); closeModal(); route(); },

  // pas
  "steps-edit": (el) => stepsModal(el.dataset.d),
  "steps-chip": (el) => { $("stepsIn").value = el.dataset.v; $("stepsIn").dispatchEvent(new Event("input")); },
  "steps-save": (el) => {
    const d = el.dataset.d, n = Math.round(num($("stepsIn").value));
    if (n) state.steps[d] = n; else delete state.steps[d];
    save(); closeModal(); route();
    if (n) toast(`🚶 ${n.toLocaleString("fr-FR")} pas · 🔥 ${stepsKcal(n)} kcal${n >= stepGoal() ? " · objectif atteint 🎯" : ""}`);
  },
  "steps-health": () => { ui.awaitSteps = true; saveNow(); location.href = "shortcuts://run-shortcut?name=" + encodeURIComponent("GymTrack Pas"); },
  "steps-paste": (el) => pasteSteps(el.dataset.d),

  // photo IA
  "ai-key-save": (el) => {
    const k = $("aiKeyIn").value.trim();
    if (k.length < 20) return toast("Colle ta clé API complète");
    state.settings.aiKey = k; save(); addFoodModal(el.dataset.meal, "photo"); toast("🔑 Clé enregistrée, tu peux prendre une photo");
  },
  "ai-key-reset": () => { if (confirm("Supprimer la clé IA enregistrée ?")) { state.settings.aiKey = ""; save(); addFoodModal(foodAI.meal, "photo"); } },
  "ai-add": () => {
    const items = foodAI.items.filter((x) => x.on && x.g > 0);
    if (!items.length) return toast("Coche au moins un aliment");
    const list = (state.food[ui.foodDay] = state.food[ui.foodDay] || []);
    for (const x of items) list.push({ id: uid(), meal: foodAI.meal, g: x.g, nom: x.nom, marque: "📸 IA", k: x.k, p: x.p, c: x.c, f: x.f });
    const tot = Math.round(items.reduce((a, x) => a + (x.k * x.g) / 100, 0));
    save(); closeModal();
    if (location.hash !== "#/nutrition") go("#/nutrition"); else route();
    toast(`📸 ${items.length} aliment${items.length > 1 ? "s" : ""} ajouté${items.length > 1 ? "s" : ""} · ${tot} kcal`);
  },

  // créateur de séance
  "b-group": (el) => { const g = el.dataset.g; build.groups = build.groups.includes(g) ? build.groups.filter((x) => x !== g) : [...build.groups, g]; route(); },
  "b-add": (el) => {
    const ex = exById(el.dataset.id);
    build.picks.push({ exId: ex.id, ...defaultScheme(ex) });
    if (navigator.vibrate) navigator.vibrate(15);
    route(); toast(`＋ ${ex.nom}`, 1400);
  },
  "b-del": (el) => { build.picks.splice(+el.dataset.i, 1); route(); },
  "b-move": (el) => { const i = +el.dataset.i, a = build.picks; [a[i - 1], a[i]] = [a[i], a[i - 1]]; route(); },
  "b-edit": (el) => buildEditModal(+el.dataset.i),
  "b-edit-save": (el) => {
    const p = build.picks[+el.dataset.i];
    Object.assign(p, { sets: Math.max(1, Math.round(num($("bSets").value)) || 1), reps: $("bReps").value.trim() || p.reps, rest: Math.round(num($("bRest").value)) });
    closeModal(); route();
  },
  "b-reset": () => { if (confirm("Effacer la séance en cours de création ?")) { build = { groups: build.groups, picks: [], name: "" }; route(); } },
  "b-start": () => { const w = buildWorkout(); startSession(w.nom, w.ex.map(([exId, sets, reps, restS]) => ({ exId, sets, target: `${sets} × ${reps}`, rest: restS }))); },
  "b-save": () => {
    const w = buildWorkout(), id = build.editId || "my_" + uid();
    const item = { id, mine: true, nom: w.nom, cat: "Mes séances", niveau: 2, desc: `Séance perso : ${build.groups.join(", ") || "sur mesure"}.`, groups: [...build.groups], ex: w.ex };
    const i = state.myWorkouts.findIndex((x) => x.id === id);
    if (i >= 0) state.myWorkouts[i] = item; else state.myWorkouts.unshift(item);
    save(); build = { groups: [], picks: [], name: "" };
    ui.wCat = "Mes séances"; go("#/entrainer/seances"); toast("💾 Séance enregistrée dans « Mes séances »");
  },
  "my-edit": (el) => {
    const w = state.myWorkouts.find((x) => x.id === el.dataset.id);
    build = { editId: w.id, name: w.nom, groups: w.groups || [], picks: w.ex.map(([exId, sets, reps, rest]) => ({ exId, sets, reps, rest })) };
    go("#/creer");
  },
  "my-del": (el) => { if (!confirm("Supprimer cette séance ?")) return; state.myWorkouts = state.myWorkouts.filter((x) => x.id !== el.dataset.id); save(); go("#/entrainer/seances"); },

  // entraîner
  "w-cat": (el) => { ui.wCat = el.dataset.c; route(); },
  "start-workout": (el) => {
    const w = allWorkouts().find((x) => x.id === el.dataset.id);
    startSession(w.nom, w.ex.map(([exId, sets, reps, restS]) => ({ exId, sets, target: `${sets} × ${reps}`, rest: restS })), {}, w.cat);
  },

  // eau
  water: (el) => {
    const d = el.dataset.d, glass = num(state.settings.glass) || 250, before = state.water[d] || 0;
    state.water[d] = Math.max(0, before + +el.dataset.v * glass);
    save(); route();
    if (+el.dataset.v > 0) {
      if (navigator.vibrate) navigator.vibrate(20);
      if (before < waterGoal() && state.water[d] >= waterGoal()) toast("💧 Objectif d'eau atteint, bravo !");
      if (d === dayStr()) sendHealth("eau", glass);
    }
  },

  // santé
  "health-test": (el) => { const k = el.dataset.k; sendHealth(k, HEALTH[k].test, true); },
  "health-kcal": (el) => {
    const d = el.dataset.d, total = Math.round(foodTotals(state.food[d] || []).k), delta = total - (state.healthSent[d] || 0);
    if (delta <= 0) return toast("Déjà envoyé à Santé ✅");
    state.healthSent[d] = total;
    route();
    sendHealth("kcal", delta, true);
  },

  // agenda
  "cal-month": (el) => { const [y, m] = ui.calMonth.split("-").map(Number); const d = new Date(y, m - 1 + +el.dataset.delta, 1); ui.calMonth = dayStr(d).slice(0, 7); route(); },
  day: (el) => dayModal(el.dataset.d),
  checkin: () => {
    const v = visitOf(dayStr());
    if (v) { v.arrivee = nowHM(); v.depart = ""; v.status = "gym"; } else state.visits.push({ id: uid(), date: dayStr(), status: "gym", arrivee: nowHM(), depart: "", note: "" });
    save(); route(); toast("📍 Arrivée notée à " + nowHM() + ". Bonne séance !");
  },
  checkout: () => { const v = visitOf(dayStr()); v.depart = nowHM(); save(); route(); toast(`🚪 Tu es resté ${fmtDur(visitMinutes(v))}`); },
  "save-visit": (el) => {
    const d = el.dataset.d;
    let v = visitOf(d);
    if (!v) { v = { id: uid(), date: d }; state.visits.push(v); }
    const st = dayModal.status;
    Object.assign(v, { status: st, arrivee: st === "gym" ? $("vArr").value : "", depart: st === "gym" ? $("vDep").value : "", note: $("vNote").value.trim() });
    save(); closeModal(); route();
    if (st !== "gym") toast(st === "repos" ? "😴 Repos noté. Récupère bien !" : "🖕 Flemme notée… on se rattrape demain 💪");
  },
  "day-status": (el) => {
    dayModal.status = el.dataset.s;
    document.querySelectorAll("[data-act=day-status]").forEach((b) => b.classList.toggle("on", b.dataset.s === dayModal.status));
    $("gymFields").hidden = dayModal.status !== "gym";
  },
  "quick-status": (el) => {
    setDayStatus(el.dataset.d, el.dataset.s); route();
    toast(el.dataset.s === "repos" ? "😴 Repos noté. Récupère bien !" : "🖕 Flemme notée… on se rattrape demain 💪");
  },
  "del-visit": (el) => { state.visits = state.visits.filter((v) => v.date !== el.dataset.d); save(); closeModal(); route(); },

  // salle
  "toggle-hidden": (el) => {
    const id = el.dataset.id;
    state.hidden = isHidden({ id }) ? state.hidden.filter((x) => x !== id) : [...state.hidden, id];
    save(); route(); toast(isHidden({ id }) ? "Machine masquée de ta liste" : "Machine de retour dans ta liste");
  },
  "show-hidden": () => { ui.showHidden = !ui.showHidden; route(); },

  // nutrition
  "food-day": (el) => { const d = parseDay(ui.foodDay); d.setDate(d.getDate() + +el.dataset.delta); if (dayStr(d) <= dayStr()) { ui.foodDay = dayStr(d); route(); } },
  "add-food": (el) => addFoodModal(el.dataset.meal || guessMeal()),
  "food-tab": (el) => addFoodModal(el.dataset.meal, el.dataset.tab),
  "food-search": (el) => searchFood($("foodQ").value, el.dataset.meal),
  "code-go": (el) => { stopScanner(); lookupCode($("codeIn").value, el.dataset.meal); },
  "pick-food": (el) => {
    const ref = el.dataset.ref;
    const f = ref.startsWith("recent:") ? state.recentFoods[+ref.split(":")[1]] : foodCache[ref];
    if (f) foodForm(f, el.dataset.meal);
  },
  "manual-food": (el) => {
    const nom = $("mNom").value.trim() || "Aliment";
    const f = { nom, marque: "", k: num($("mK").value), p: num($("mP").value), c: num($("mC").value), f: num($("mF").value), portion: null };
    if (!f.k) return toast("Indique au moins les calories");
    const meal = el.dataset.meal;
    const g = num($("mG").value) || 100;
    foodForm(f, meal); $("qtyIn").value = g; $("qtyIn").dispatchEvent(new Event("input"));
  },
  qty: (el) => { $("qtyIn").value = el.dataset.v; $("qtyIn").dispatchEvent(new Event("input")); },
  "confirm-food": confirmFood,
  "edit-food": (el) => { const e = (state.food[ui.foodDay] || []).find((x) => x.id === el.dataset.id); if (e) foodForm({ nom: e.nom, marque: e.marque, k: e.k, p: e.p, c: e.c, f: e.f }, e.meal, e); },
  "del-food": (el) => { state.food[ui.foodDay] = state.food[ui.foodDay].filter((x) => x.id !== el.dataset.id); save(); closeModal(); route(); },

  // corps
  "add-body": () => bodyModal(),
  "edit-body": (el) => bodyModal(state.body.find((b) => b.id === el.dataset.id)),
  "body-metric": (el) => { ui.bodyMetric = el.dataset.k; route(); },
  "save-body": (el) => {
    const id = el.dataset.id;
    const b = id ? state.body.find((x) => x.id === id) : { id: uid() };
    b.date = $("bDate").value || dayStr();
    let any = false;
    for (const [k] of BODY_FIELDS) { const v = $("b_" + k).value.trim().replace(",", "."); b[k] = v; if (num(v)) any = true; }
    if (!any) return toast("Remplis au moins une valeur");
    if (!id) state.body.push(b);
    if (!BODY_FIELDS.some(([k]) => k === ui.bodyMetric && num(b[k]))) ui.bodyMetric = num(b.poids) || !state.body.length ? "poids" : ui.bodyMetric;
    save(); closeModal();
    if (location.hash !== "#/corps") go("#/corps"); else route();
    toast("Mesure enregistrée ✅");
    if (!id && b.date === dayStr() && num(b.poids)) setTimeout(() => sendHealth("poids", num(b.poids)), 500);
  },
  "del-body": (el) => { if (!confirm("Supprimer cette mesure ?")) return; state.body = state.body.filter((b) => b.id !== el.dataset.id); save(); closeModal(); route(); },

  // réglages
  "force-update": () => { toast("Mise à jour…"); forceUpdate(); },
  export: () => {
    saveNow();
    // la clé IA n'est jamais mise dans la sauvegarde
    const blob = new Blob([JSON.stringify({ ...state, settings: { ...state.settings, aiKey: undefined } }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `gymtrack-sauvegarde-${dayStr()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  reset: () => { if (confirm("Effacer TOUTES tes données ? (séances, repas, mesures)") && confirm("Vraiment sûr ? C'est définitif.")) { state = structuredClone(DEFAULT_STATE); saveNow(); go("#/accueil"); } },
};

function guessMeal() { const h = new Date().getHours(); return h < 11 ? "pdj" : h < 15 ? "dej" : h < 18 ? "snack" : "diner"; }

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});

// Saisies (sans re-dessiner la page pour ne pas perdre le focus)
document.addEventListener("input", (e) => {
  const el = e.target;
  switch (el.dataset.in) {
    case "set": {
      const e = state.current.exercises[+el.dataset.i], s = e.sets[+el.dataset.j];
      s[el.dataset.k] = el.value; save();
      const kc = $("kc" + el.dataset.i); if (kc) kc.innerHTML = cardioLine(exById(e.exId), e.sets);
      break;
    }
    case "cur-name": state.current.name = el.value; save(); break;
    case "profile": state.profile[el.dataset.k] = el.value; save(); break;
    case "rest": state.settings.rest = num(el.value) || 90; save(); break;
    case "setting": state.settings[el.dataset.k] = el.value; save(); break;
    case "b-name": build.name = el.value; break;
    case "ai-g": {
      const x = foodAI.items[+el.dataset.i]; x.g = Math.round(num(el.value));
      $("aiK" + el.dataset.i).textContent = Math.round((x.k * x.g) / 100);
      $("aiTot").textContent = Math.round(foodAI.items.filter((y) => y.on).reduce((a, y) => a + (y.k * y.g) / 100, 0)) + " kcal";
      break;
    }
  }
});
document.addEventListener("change", (e) => {
  if (e.target.dataset.in === "ai-on") { foodAI.items[+e.target.dataset.i].on = e.target.checked; $("aiOut").innerHTML = aiResultHtml(foodAI.res); return; }
  if (e.target.dataset.in === "home") { state.settings.home = { ...homeGear(), [e.target.dataset.k]: e.target.checked }; save(); route(); return; }
  if (e.target.dataset.in === "rem-on") { state.reminders[+e.target.dataset.i].on = e.target.checked; save(); return; }
  if (e.target.dataset.in === "adaptive") { state.settings.adaptive = e.target.checked; save(); route(); return; }
  if (e.target.dataset.in === "setting-bool") { state.settings[e.target.dataset.k] = e.target.checked; save(); return; }
  if (e.target.dataset.in === "health") {
    state.settings.health = { ...(state.settings.health || {}), [e.target.dataset.k]: e.target.checked };
    save(); route();
    return;
  }
  if (e.target.dataset.in === "profile" && e.target.tagName === "SELECT") route();
  if (e.target.id === "importIn" && e.target.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || !Array.isArray(data.sessions)) throw new Error();
        if (!confirm("Remplacer tes données actuelles par cette sauvegarde ?")) return;
        if (state.settings.aiKey) data.settings = { ...(data.settings || {}), aiKey: state.settings.aiKey };
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
        state = load(); toast("Sauvegarde importée ✅"); go("#/accueil");
      } catch (err) { toast("Fichier invalide"); }
    };
    r.readAsText(e.target.files[0]);
  }
});

// ============================================================
//  RANGS
// ============================================================
function viewRanks() {
  setTitle("Rangs");
  let html = progSeg("rangs");
  if (!currentWeight()) html += `<div class="card"><p class="muted small" style="margin:0">⚖️ Indique ton poids dans <a href="#/corps">Corps</a> : les rangs des exos avec charge sont calculés par rapport à ton poids.</p></div>`;
  const done = new Set([...state.sessions.flatMap((s) => s.exercises.map((e) => e.exId)), ...Object.keys(state.defiRec)]);
  const rows = [...done].map(exById).filter(hasRank).map((ex) => ({ ex, ri: rankInfo(ex) })).filter((r) => r.ri && !r.ri.noWeight && r.ri.i >= 0)
    .sort((a, b) => b.ri.i - a.ri.i || a.ex.nom.localeCompare(b.ex.nom));
  if (rows.length) {
    const avg = Math.floor(rows.reduce((a, r) => a + r.ri.i, 0) / rows.length);
    const counts = RANKS.map((_, k) => rows.filter((r) => r.ri.i === k).length);
    html += `<div class="card rank-card center" style="--rc:${RANKS[avg].c1}">${rankBadge(avg, 84)}
      <p class="eyebrow" style="color:var(--muted);margin-top:8px">Rang global</p><h2 style="color:${RANKS[avg].c1};font-size:26px">${RANKS[avg].nom}</h2>
      <div class="rank-counts">${RANKS.map((rk, k) => counts[k] ? `<span>${rankBadge(k, 18)} ${counts[k]}</span>` : "").join("")}</div></div>
      <div class="card list-card">${rows.map(({ ex, ri }) => `<div class="list-item" data-act="go" data-to="#/progres/${ex.id}">${rankBadge(ri.i, 38)}
        <div class="grow"><b>${esc(ex.nom)}</b><div class="small" style="color:${RANKS[ri.i].c1}">${RANKS[ri.i].nom} · ${fmtRankVal(ri.value, ri.t.unit)}</div>
        ${ri.next != null ? `<div class="progress thin"><div style="width:${ri.pct}%;background:${RANKS[ri.i + 1].c1}"></div></div><div class="muted small">${RANKS[ri.i + 1].nom} à ${fmtRankVal(ri.next, ri.t.unit)}</div>` : ""}</div></div>`).join("")}</div>`;
  } else {
    html += `<div class="empty"><span class="big">🎖️</span>Pas encore de rang.<br>Fais des séances ou un test dans l'onglet Défi pour être classé.</div>`;
  }
  html += `<div class="section-title">Les rangs</div><div class="card"><div class="rank-ladder">${RANKS.map((rk, k) => `<div>${rankBadge(k, 30)}<span>${rk.nom}</span></div>`).join("")}</div>
    <p class="muted small" style="margin-bottom:0">Exos avec charge : ton 1RM estimé comparé à ton poids de corps (ex : développé couché à 1× ton poids = Or). Poids du corps : tes reps max en une série. Gainage : ton meilleur temps.</p></div>`;
  return html;
}

function bodyZoom() {
  const ex = bodyZoom.ex;
  const html = bodyDetailHtml(ex, bodyZoom.view, bodyZoom.all);
  if ($("modal").hidden || !$("bodyZoomBox")) openModal(ex.nom ? `Muscles : ${ex.nom}` : "Muscles travaillés", `<div id="bodyZoomBox">${html}</div>`);
  else $("bodyZoomBox").innerHTML = html;
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && ui.awaitSteps) { ui.awaitSteps = false; setTimeout(() => { stepsModal(dayStr()); toast("Touche « 📋 Coller les pas copiés »"); }, 300); }
});

// Séance en cours : on sélectionne le contenu au toucher (on tape directement par-dessus)
// et la touche « suivant » du clavier passe à la case suivante
document.addEventListener("focusin", (e) => { if (e.target.dataset.in === "set") setTimeout(() => e.target.select(), 0); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.target.dataset.in !== "set") return;
  e.preventDefault();
  const all = [...document.querySelectorAll('input[data-in="set"]')];
  const next = all[all.indexOf(e.target) + 1];
  if (next) next.focus(); else e.target.blur();
});

// ============================================================
//  Démarrage
// ============================================================
// Mise à jour automatique : on vérifie s'il y a une nouvelle version à chaque ouverture,
// et dès qu'elle est installée on recharge la page pour l'afficher.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((reg) => {
    reg.update().catch(() => {});
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true; saveNow(); location.reload();
  });
}
async function forceUpdate() {
  saveNow();
  try {
    if ("serviceWorker" in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const k of await caches.keys()) if (k !== "gymtrack-img") await caches.delete(k);
  } catch (e) { /* tant pis, on recharge quand même */ }
  location.reload();
}
if (!state.settings.installDate) { state.settings.installDate = dayStr(); save(); }
// Rappel quotidien « remplis ton agenda » ajouté une fois
if (!state.settings.agendaReminder) {
  state.settings.agendaReminder = true;
  state.reminders.push({ id: uid(), type: "agenda", time: "21:30", days: [1, 2, 3, 4, 5, 6, 7], text: "", on: true });
  state.reminders.sort((a, b) => a.time.localeCompare(b.time));
  save();
}
if (!location.hash) location.replace("#/accueil");
route();
checkReminders();
