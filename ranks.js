// Système de rangs : Fer → Bronze → Argent → Or → Platine → Diamant → Champion.
// Exos avec charge : on compare ton 1RM estimé à ton poids de corps (ex : développé couché à 1× ton poids = Or).
// Exos au poids du corps : nombre de reps max en une série. Gainage : secondes.
// Standards inspirés des tables de force usuelles (débutant → élite), pour un homme ;
// pour une femme ils sont réduits (×0,6 haut du corps, ×0,75 bas du corps).

const RANKS = [
  { nom: "Fer", c1: "#6b7280", c2: "#3f444e" },
  { nom: "Bronze", c1: "#e0a36a", c2: "#8a5226" },
  { nom: "Argent", c1: "#e6ebf2", c2: "#8792a3" },
  { nom: "Or", c1: "#ffe27a", c2: "#c98a12" },
  { nom: "Platine", c1: "#7ff0dc", c2: "#1f8f84" },
  { nom: "Diamant", c1: "#a8c8ff", c2: "#6a4bd8" },
  { nom: "Champion", c1: "#ff8fa3", c2: "#c4153c" },
];

// Seuils pour Bronze, Argent, Or, Platine, Diamant, Champion
// Charges : multiple du poids de corps (1RM estimé ; pour les haltères = poids d'UN haltère)
const RANK_STD = {
  dev_couche: [0.5, 0.75, 1, 1.25, 1.5, 1.85], dev_incline_halteres: [0.15, 0.25, 0.35, 0.45, 0.55, 0.65], dev_couche_halteres: [0.17, 0.27, 0.37, 0.47, 0.57, 0.7],
  ecarte_halteres: [0.08, 0.13, 0.18, 0.24, 0.3, 0.36], poulie_vis_a_vis: [0.08, 0.13, 0.2, 0.27, 0.35, 0.45], pec_deck: [0.3, 0.5, 0.75, 1, 1.25, 1.5],
  m_chest_press: [0.4, 0.65, 0.9, 1.2, 1.5, 1.8], m_incline_press: [0.3, 0.5, 0.75, 1, 1.3, 1.6], m_smith_bench: [0.45, 0.7, 0.95, 1.2, 1.45, 1.75],
  tirage_vertical: [0.4, 0.6, 0.8, 1, 1.2, 1.45], rowing_barre: [0.4, 0.6, 0.8, 1, 1.25, 1.5], rowing_haltere: [0.2, 0.3, 0.45, 0.6, 0.75, 0.9],
  tirage_horizontal: [0.4, 0.6, 0.8, 1.05, 1.3, 1.55], souleve_terre: [1, 1.25, 1.5, 2, 2.5, 3], shrugs: [0.2, 0.35, 0.5, 0.65, 0.8, 1],
  m_high_row: [0.35, 0.55, 0.8, 1.05, 1.3, 1.6], m_iso_row: [0.35, 0.55, 0.8, 1.05, 1.3, 1.6], m_tbar: [0.35, 0.55, 0.75, 1, 1.25, 1.5], m_shrug: [0.5, 0.8, 1.1, 1.4, 1.8, 2.2],
  dev_militaire: [0.35, 0.5, 0.65, 0.8, 1, 1.2], dev_halteres_assis: [0.12, 0.2, 0.28, 0.36, 0.45, 0.55], elev_laterales: [0.05, 0.08, 0.12, 0.16, 0.2, 0.25],
  m_lat_raise_cable: [0.04, 0.07, 0.1, 0.14, 0.18, 0.22], oiseau: [0.04, 0.07, 0.1, 0.14, 0.18, 0.22], face_pull: [0.15, 0.25, 0.35, 0.45, 0.6, 0.75],
  arnold: [0.1, 0.17, 0.25, 0.33, 0.42, 0.5], m_shoulder_press: [0.3, 0.45, 0.65, 0.85, 1.05, 1.3], m_reverse_fly: [0.15, 0.25, 0.4, 0.55, 0.7, 0.9],
  curl_barre: [0.2, 0.35, 0.5, 0.65, 0.8, 1], curl_halteres: [0.08, 0.13, 0.2, 0.27, 0.35, 0.42], curl_marteau: [0.09, 0.15, 0.22, 0.3, 0.38, 0.46],
  curl_pupitre: [0.15, 0.27, 0.4, 0.52, 0.65, 0.8], m_curl: [0.15, 0.27, 0.4, 0.55, 0.7, 0.85], extension_poulie: [0.2, 0.35, 0.5, 0.7, 0.9, 1.1],
  barre_front: [0.15, 0.27, 0.4, 0.55, 0.7, 0.85], dev_serre: [0.4, 0.6, 0.85, 1.1, 1.35, 1.6], ext_nuque: [0.1, 0.18, 0.27, 0.36, 0.45, 0.55],
  m_triceps: [0.2, 0.35, 0.5, 0.7, 0.9, 1.1], m_dips: [0.4, 0.7, 1, 1.3, 1.6, 2],
  squat: [0.75, 1, 1.25, 1.6, 2, 2.5], presse: [1, 1.6, 2.2, 3, 3.8, 4.6], fentes: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6], goblet: [0.2, 0.35, 0.5, 0.65, 0.8, 0.95],
  leg_ext: [0.4, 0.65, 0.9, 1.15, 1.4, 1.7], leg_curl: [0.3, 0.5, 0.7, 0.9, 1.1, 1.35], m_leg_curl_assis: [0.3, 0.5, 0.7, 0.9, 1.1, 1.35],
  sdt_roumain: [0.6, 0.9, 1.2, 1.5, 1.85, 2.2], hip_thrust: [0.75, 1.1, 1.5, 2, 2.5, 3], mollets: [0.5, 0.9, 1.3, 1.7, 2.1, 2.6],
  m_mollets_assis: [0.4, 0.7, 1, 1.3, 1.6, 2], step_ups: [0.08, 0.15, 0.22, 0.3, 0.38, 0.46], m_hack_squat: [0.6, 1, 1.4, 1.8, 2.3, 2.8],
  m_smith_squat: [0.6, 0.9, 1.2, 1.55, 1.9, 2.3], m_adducteurs: [0.4, 0.65, 0.9, 1.15, 1.4, 1.7], m_abducteurs: [0.4, 0.65, 0.9, 1.15, 1.4, 1.7],
  m_kickback: [0.15, 0.3, 0.45, 0.6, 0.75, 0.9], m_ground_base: [0.8, 1.2, 1.6, 2, 2.5, 3], crunch_poulie: [0.3, 0.5, 0.7, 0.9, 1.1, 1.35],
  m_abs: [0.3, 0.5, 0.7, 0.9, 1.1, 1.35], kb_swing: [0.15, 0.25, 0.35, 0.45, 0.55, 0.7],
  // tractions assistées : part de ton poids que tu soulèves vraiment (1 = sans assistance)
  m_tractions_assist: [0.3, 0.45, 0.6, 0.75, 0.9, 0.97],
};
// Poids du corps : reps max en une série / gainage : secondes
const RANK_REPS = {
  pompes: [5, 15, 25, 40, 55, 75], tractions: [1, 5, 10, 15, 20, 28], dips: [3, 8, 15, 22, 30, 40], c_chin_up: [1, 6, 11, 16, 22, 30],
  c_dips_triceps: [3, 8, 15, 22, 30, 40], c_pompes_diamant: [3, 10, 18, 28, 38, 50], c_pompes_declinees: [4, 12, 20, 32, 45, 60],
  c_hspu: [1, 3, 6, 10, 15, 20], c_muscle_up: [1, 2, 4, 7, 10, 15], c_australian: [5, 10, 15, 22, 30, 40], c_pistol: [1, 3, 6, 10, 15, 20],
  c_squat_pdc: [15, 30, 45, 65, 85, 110], c_fentes_marchees: [10, 20, 30, 40, 55, 70], c_toes_to_bar: [1, 5, 10, 15, 20, 28],
  releve_jambes: [3, 8, 13, 18, 25, 32], crunch: [15, 30, 45, 60, 80, 100], russian_twist: [15, 30, 45, 60, 80, 100],
  extensions_lombaires: [8, 15, 22, 30, 40, 50], c_superman: [10, 20, 30, 40, 55, 70],
  gainage: [30, 60, 90, 120, 180, 300], c_gainage_lateral: [20, 40, 60, 90, 120, 180], mountain_climbers: [20, 40, 60, 90, 120, 180],
};
const LOWER_BODY = new Set(["Jambes"]);

const hasRank = (ex) => !!(ex && (RANK_STD[ex.id] || RANK_REPS[ex.id]));

// Seuils réels (en kg, reps ou secondes) pour cet exercice et cette personne
function rankThresholds(ex) {
  if (RANK_REPS[ex.id]) return { list: RANK_REPS[ex.id], unit: ex.type === "temps" ? "s" : "reps" };
  const bw = currentWeight();
  if (!bw) return null;
  if (ex.inverse) return { list: RANK_STD[ex.id].map((r) => r1(bw * (1 - r))), unit: "kg d'assistance", inverse: true };
  const f = state.profile.sexe === "f" ? (LOWER_BODY.has(ex.groupe) ? 0.75 : 0.6) : 1;
  return { list: RANK_STD[ex.id].map((r) => Math.round((r * bw * f) / 2.5) * 2.5), unit: "kg" };
}

// Meilleure performance de tous les temps (séances + records des défis)
function rankValue(ex) {
  const h = exHistory(ex.id);
  if (ex.type === "pdc") return Math.max(0, ...h.map((x) => x.stats.maxReps), ...defiRecords(ex.id));
  if (ex.type === "temps") return Math.max(0, ...h.map((x) => x.stats.maxSec), ...defiRecords(ex.id));
  if (ex.inverse) { const kgs = h.flatMap((x) => x.sets.filter((s) => num(s.reps) >= 3).map((s) => num(s.kg))); return kgs.length ? Math.min(...kgs) : null; }
  return Math.max(0, ...h.map((x) => x.stats.e1rm || 0));
}

function rankInfo(ex) {
  if (!hasRank(ex)) return null;
  const t = rankThresholds(ex);
  if (!t) return { noWeight: true };
  const v = rankValue(ex);
  if (v == null || (!t.inverse && !v)) return { i: -1, value: 0, t };
  const reached = t.list.filter((x) => (t.inverse ? v <= x : v >= x)).length;
  const next = t.list[reached];
  return { i: reached, value: v, t, next, missing: next == null ? 0 : t.inverse ? r1(v - next) : r1(next - v),
    pct: next == null ? 100 : Math.max(4, Math.min(100, t.inverse
      ? ((reached ? t.list[reached - 1] : currentWeight()) - v) / ((reached ? t.list[reached - 1] : currentWeight()) - next) * 100
      : (v - (reached ? t.list[reached - 1] : 0)) / (next - (reached ? t.list[reached - 1] : 0)) * 100)) };
}

// Écusson SVG du rang
function rankBadge(i, size = 40) {
  const r = RANKS[Math.max(0, i)];
  const id = "rg" + Math.random().toString(36).slice(2, 7);
  const pips = Math.max(0, i);
  return `<svg class="rank-badge" width="${size}" height="${size}" viewBox="0 0 40 40" aria-label="Rang ${r.nom}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${r.c1}"/><stop offset="1" stop-color="${r.c2}"/></linearGradient></defs>
    <path d="M20 2 L35 10 L35 26 Q35 33 20 38 Q5 33 5 26 L5 10 Z" fill="url(#${id})" stroke="rgba(255,255,255,.35)" stroke-width="1"/>
    <path d="M20 7 L30 12.5 L30 25 Q30 30 20 33.5 Q10 30 10 25 L10 12.5 Z" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/>
    ${i >= 6 ? `<path d="M20 12 l2.6 5.4 5.9.8-4.3 4.1 1 5.8L20 25.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" fill="#fff" opacity=".95"/>`
      : `<g fill="#fff" opacity=".92">${[...Array(Math.min(pips, 5))].map((_, k) => `<path d="M13 ${26 - k * 3.4} L20 ${22 - k * 3.4} L27 ${26 - k * 3.4} L27 ${27.6 - k * 3.4} L20 ${23.6 - k * 3.4} L13 ${27.6 - k * 3.4} Z"/>`).join("")}</g>
         ${pips === 0 ? `<circle cx="20" cy="20" r="3.4" fill="#fff" opacity=".8"/>` : ""}`}
  </svg>`;
}

const fmtRankVal = (v, unit) => `${String(r1(v)).replace(".", ",")} ${unit}`;

// Carte « rang » affichée dans la progression d'un exercice
function rankCard(ex) {
  const info = rankInfo(ex);
  if (!info) return "";
  if (info.noWeight) return `<div class="card rank-card"><div class="row">${rankBadge(0, 46)}<div class="grow"><b>Rang</b>
    <div class="muted small">Indique ton poids dans l'onglet <a href="#/corps">Corps</a> pour connaître ton rang sur cet exercice.</div></div></div></div>`;
  const { i, t } = info, r = RANKS[Math.max(0, i)];
  const what = ex.inverse ? "Assistance la plus faible" : ex.type === "force" ? "1RM estimé" : ex.type === "temps" ? "Meilleur temps" : "Max en une série";
  return `<div class="card rank-card" style="--rc:${r.c1}">
    <div class="row">${rankBadge(i, 58)}<div class="grow"><p class="eyebrow" style="color:var(--muted)">Ton rang</p>
      <h2 style="margin:0;color:${r.c1}">${i < 0 ? "Pas encore classé" : r.nom}</h2>
      <div class="muted small">${i < 0 ? "Fais cet exercice pour être classé" : `${what} : <b style="color:var(--text)">${fmtRankVal(info.value, t.unit)}</b>`}</div></div></div>
    ${info.next != null ? `<div class="progress rank-bar" style="margin-top:12px"><div style="width:${i < 0 ? 0 : info.pct}%;background:${RANKS[info.i + 1].c1}"></div></div>
      <div class="small muted" style="margin-top:6px">Prochain rang <b style="color:${RANKS[info.i + 1].c1}">${RANKS[info.i + 1].nom}</b> : ${fmtRankVal(info.next, t.unit)}${i >= 0 ? ` (encore ${fmtRankVal(info.missing, t.unit)})` : ""}</div>`
      : `<div class="small" style="margin-top:10px;color:${r.c1}">🏆 Rang maximum atteint, respect.</div>`}
    <div class="rank-ladder">${RANKS.map((rk, k) => `<div class="${k === i ? "on" : ""} ${k < i ? "past" : ""}">${rankBadge(k, 26)}<span>${rk.nom}</span><small>${k === 0 ? "–" : fmtRankVal(t.list[k - 1], t.unit === "kg d'assistance" ? "kg" : t.unit)}</small></div>`).join("")}</div>
    <p class="muted small" style="margin:8px 0 0">${t.unit === "kg" ? `Calculé sur ton poids (${r1(currentWeight())} kg)${["dev_incline_halteres", "dev_couche_halteres", "ecarte_halteres", "rowing_haltere", "shrugs", "dev_halteres_assis", "elev_laterales", "oiseau", "arnold", "curl_halteres", "curl_marteau", "ext_nuque", "fentes", "step_ups"].includes(ex.id) ? " · poids d'un seul haltère" : ""}.` : t.inverse ? "Moins d'assistance = meilleur rang." : "Ton record en une seule série (séances + défis)."}</p>
  </div>`;
}
