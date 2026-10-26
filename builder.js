// Créateur de séance : tu choisis les groupes musculaires, l'appli propose les exercices
// rangés par famille de mouvement. Dès qu'un mouvement est pris (ex : tirage vertical),
// les exos du même mouvement (ex : tractions) passent en « déconseillé », et au-delà de 2 ils sont masqués.

const BUILD_GROUPS = ["Pectoraux", "Dos", "Épaules", "Bras", "Jambes", "Abdos", "Calisthénie", "Cardio"];
const FAMILY_MAX = 2;
let build = { groups: [], picks: [], name: "" };

const familiesOf = (id) => {
  const f = Object.entries(PATTERNS).filter(([, ids]) => ids.includes(id)).map(([k]) => k);
  return f.length ? f : ["solo:" + id];
};
function familyCount() {
  const c = {};
  for (const p of build.picks) for (const f of familiesOf(p.exId)) c[f] = (c[f] || 0) + 1;
  return c;
}
// Séries / reps proposées par défaut selon le type d'exercice
function defaultScheme(ex) {
  if (ex.type === "cardio" || ex.type === "tapis") return { sets: 1, reps: "10 min", rest: 0 };
  if (ex.type === "temps") return { sets: 3, reps: "30 s", rest: 45 };
  if (ex.type === "pdc") return { sets: 3, reps: "max", rest: 90 };
  const big = familiesOf(ex.id).some((f) => ["Poussée horizontale", "Poussée inclinée", "Tirage vertical", "Tirage horizontal", "Squat", "Charnière de hanche", "Fente", "Développé épaules"].includes(f));
  return big ? { sets: 4, reps: "8-10", rest: 120 } : { sets: 3, reps: "10-12", rest: 75 };
}
// Ordre idéal d'une séance : technique d'abord, puis les gros mouvements polyarticulaires
// (quand tu es frais), l'isolation, les petits muscles, les abdos et enfin le cardio.
const ORDER_TIERS = [
  { label: "Technique : à faire en premier, bien frais", fams: [], ids: ["c_muscle_up", "c_hspu", "c_pistol"] },
  { label: "Gros mouvement de base : le plus lourd", fams: ["Squat", "Charnière de hanche", "Poussée horizontale", "Poussée inclinée", "Tirage vertical", "Tirage horizontal", "Développé épaules", "Fente"] },
  { label: "Isolation d'un gros muscle", fams: ["Écarté pectoraux", "Fessiers", "Quadriceps (isolation)", "Ischio-jambiers", "Élévations latérales", "Arrière d'épaule", "Adducteurs", "Trapèzes"] },
  { label: "Petit muscle : ils fatiguent vite", fams: ["Biceps", "Triceps", "Mollets"] },
  { label: "Abdos / gainage : en fin de séance", fams: ["Abdos", "Gainage", "Obliques", "Lombaires"] },
  { label: "Cardio : à la fin pour garder ta force", fams: ["Cardio"] },
];
// ordre de priorité à l'intérieur des gros mouvements : jambes/dos lourds avant le reste
const BIG_RANK = ["Squat", "Charnière de hanche", "Poussée horizontale", "Tirage vertical", "Poussée inclinée", "Tirage horizontal", "Développé épaules", "Fente"];
const NOT_BIG = ["extensions_lombaires", "kb_swing", "c_pompes_declinees"]; // pas des « mouvements lourds » malgré leur famille
function orderInfo(id) {
  const ex = exById(id), fams = familiesOf(id);
  let tier = ORDER_TIERS.findIndex((t) => (t.ids || []).includes(id));
  if (tier < 0) {
    const tiers = fams.map((f) => ORDER_TIERS.findIndex((t) => t.fams.includes(f))).filter((t) => t >= 0);
    tier = tiers.length ? Math.min(...tiers) : ex.type === "cardio" || ex.type === "tapis" ? 5 : ex.type === "temps" ? 4 : 2;
    if (tier === 1 && NOT_BIG.includes(id)) tier = Math.min(...tiers.filter((t) => t > 1).concat(2));
  }
  const big = Math.min(...fams.map((f) => BIG_RANK.indexOf(f)).filter((r) => r >= 0).concat(9));
  // à effort égal : barre > haltères > poids du corps > machine (le plus exigeant en stabilité d'abord)
  const t = equipTag(ex).txt, gear = t.startsWith("Barre") && !t.includes("traction") ? 0 : t === "Haltères" ? 1 : ex.machine ? 3 : 2;
  return { tier, rank: tier * 100 + (tier === 1 ? (ex.machine ? 50 : 0) + big * 5 : 0) + gear };
}
const smartSort = (list, idOf) => list.map((x, i) => [x, orderInfo(idOf(x)).rank, i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map((x) => x[0]);
const isSmartOrder = (list, idOf) => smartSort(list, idOf).every((x, i) => x === list[i]);
// insère un exo au bon endroit plutôt qu'à la fin
function smartInsert(list, item, idOf) {
  const r = orderInfo(idOf(item)).rank, i = list.findIndex((x) => orderInfo(idOf(x)).rank > r);
  if (i < 0) list.push(item); else list.splice(i, 0, item);
}
const ORDER_WHY = "On commence par ce qui demande le plus de force et de technique, quand tu es frais : c'est là que tu soulèves le plus lourd, en sécurité. Ensuite l'isolation, puis les petits muscles (bras, mollets) qui fatiguent vite, les abdos, et le cardio à la fin pour ne pas vider tes forces avant.";

const buildWorkout = () => ({ nom: build.name || `Ma séance ${build.groups.join(" + ")}`, ex: build.picks.map((p) => [p.exId, p.sets, p.reps, p.rest]) });

function viewBuilder() {
  setTitle("Créer ma séance");
  const fc = familyCount(), picked = new Set(build.picks.map((p) => p.exId));
  let html = `<div class="card"><h3>1. Qu'est-ce que tu veux travailler ?</h3>
    <div class="chips wrap" style="margin-top:10px">${BUILD_GROUPS.map((g) => `<button class="chip ${build.groups.includes(g) ? "on" : ""}" data-act="b-group" data-g="${g}">${g}</button>`).join("")}</div></div>`;

  // Récap de la séance en cours de création
  if (build.picks.length) {
    const exs = build.picks.map((p) => exById(p.exId));
    const cnt = {};
    exs.forEach((ex) => { ex.muscles.forEach((m) => (cnt[m] = (cnt[m] || 0) + 1)); });
    const fake = { nom: "", muscles: [...new Set(exs.flatMap((e) => e.muscles))].filter((m) => m !== "cardio"), secondaires: [...new Set(exs.flatMap((e) => e.secondaires))] };
    // Muscles du/des groupe(s) choisi(s) pas encore travaillés en principal
    // (muscle principal d'au moins 2 exos du groupe, pour ne pas lister les muscles « accessoires »)
    const gm = {};
    EXERCISES.filter((e) => !e.role && build.groups.includes(e.groupe)).forEach((e) => e.muscles.forEach((m) => (gm[m] = (gm[m] || 0) + 1)));
    const missing = Object.keys(gm).filter((m) => m !== "cardio" && gm[m] >= 2 && !cnt[m]);
    const w = buildWorkout();
    html += `<div class="card"><div class="row between"><h3>2. Ta séance</h3><span class="muted small">${build.picks.length} exos · ~${workoutMinutes(w)} min</span></div>
      ${build.picks.length > 1 ? (isSmartOrder(build.picks, (p) => p.exId)
        ? `<p class="small" style="color:var(--green);margin:8px 0 4px">🧠 Tes exos sont dans l'ordre idéal : commence par <b>${esc(exById(build.picks[0].exId).nom)}</b>.</p>`
        : `<div class="smart-order"><b>🧠 Ordre pas idéal</b><span class="small muted">Idéalement, commence par <b style="color:var(--text)">${esc(exById(smartSort(build.picks, (p) => p.exId)[0].exId).nom)}</b>.</span>
          <button class="btn sm primary block" data-act="b-sort">Ranger dans l'ordre idéal</button></div>`) : ""}
      <div class="list-card">${build.picks.map((p, i) => { const ex = exById(p.exId); return `<div class="list-item b-pick">
        <span class="b-num">${i + 1}</span><img class="thumb" src="${imgUrl(ex)}" alt="" loading="lazy"><div class="grow" data-act="b-edit" data-i="${i}"><b>${esc(ex.nom)}</b>
        <div class="small"><span style="color:var(--accent)">${p.sets} × ${esc(p.reps)}</span> <span class="muted">· repos ${fmtTime(p.rest)} · modifier</span></div>
        <div class="small muted">${i ? "" : "🥇 "}${ORDER_TIERS[orderInfo(p.exId).tier].label}</div></div>
        <div class="b-ctrl"><button class="icon-btn" data-act="b-move" data-i="${i}" data-d="-1" ${i ? "" : "disabled"}>↑</button><button class="icon-btn" data-act="b-del" data-i="${i}">✕</button></div></div>`; }).join("")}</div>
      ${build.picks.length > 1 ? `<details class="small muted" style="margin-top:8px"><summary>Pourquoi cet ordre ?</summary><p style="margin:6px 0 0">${ORDER_WHY} Les nouveaux exos sont rangés automatiquement ; tu peux toujours les déplacer avec ↑.</p></details>` : ""}
      <div class="section-title" style="margin-top:12px">Muscles travaillés</div>
      ${bodyMap(fake)}
      <div style="margin-top:8px">${Object.entries(cnt).filter(([m]) => m !== "cardio").sort((a, b) => b[1] - a[1]).map(([m, n]) => `<span class="tag ${n >= 4 ? "warn" : "main"}">${MUSCLES[m]}${n > 1 ? " ×" + n : ""}</span>`).join("")}</div>
      ${missing.length ? `<p class="small muted" style="margin-bottom:0">Pas encore travaillé : ${missing.map((m) => `<b style="color:var(--text)">${MUSCLES[m]}</b>`).join(", ")}</p>` : `<p class="small" style="color:var(--green);margin-bottom:0">✅ Tous les muscles du groupe sont travaillés</p>`}
      ${Object.values(cnt).some((n) => n >= 4) ? `<p class="small" style="color:var(--orange);margin-bottom:0">⚠️ Un muscle est travaillé 4 fois ou plus en principal : c'est beaucoup pour une seule séance.</p>` : ""}
      <label class="field" style="margin-top:12px">Nom de la séance<input id="bName" data-in="b-name" value="${esc(build.name)}" placeholder="${esc(w.nom)}"></label>
      <div class="grid2" style="margin-top:10px"><button class="btn" data-act="b-save">💾 Enregistrer</button><button class="btn primary" data-act="b-start">▶ Commencer</button></div>
      <button class="btn sm block danger" style="margin-top:8px" data-act="b-reset">Tout effacer</button></div>`;
  }

  if (!build.groups.length) return html + `<div class="empty"><span class="big">💪</span>Choisis un ou plusieurs groupes (ex : Dos + Bras) pour voir les exercices proposés.</div>`;

  // Exercices proposés, rangés par famille de mouvement
  const cands = EXERCISES.filter((e) => !e.role && e.groupe !== "Étirements" && !isHidden(e) && build.groups.some((g) => inGroup(e, g)));
  const fams = {};
  for (const e of cands) { const f = familiesOf(e.id)[0]; (fams[f] = fams[f] || []).push(e); }
  const famName = (f) => (f.startsWith("solo:") ? "Autres exercices" : f);
  const order = Object.keys(fams).sort((a, b) => (a.startsWith("solo:") - b.startsWith("solo:")) || famName(a).localeCompare(famName(b)));
  // les « solo » sont regroupés à la fin
  const groupsHtml = {};
  for (const f of order) {
    const key = famName(f);
    (groupsHtml[key] = groupsHtml[key] || []).push(...fams[f]);
  }
  html += `<div class="section-title">${build.picks.length ? "3" : "2"}. Ajoute des exercices</div>
    <p class="muted small" style="margin:-4px 4px 10px">Rangés par mouvement. Quand tu prends un mouvement, les exos qui font la même chose passent en « déjà travaillé » (max ${FAMILY_MAX} par mouvement).</p>`;
  for (const [fam, list] of Object.entries(groupsHtml)) {
    const n = fam === "Autres exercices" ? 0 : fc[fam] || 0;
    html += `<div class="card list-card b-fam ${n >= FAMILY_MAX ? "full" : ""}"><div class="b-fam-head"><b>${esc(fam)}</b>
      ${n ? `<span class="fam-badge ${n >= FAMILY_MAX ? "full" : ""}">${n >= FAMILY_MAX ? `🔒 ${n}/${FAMILY_MAX} — complet` : `✓ ${n} exo pris`}</span>` : ""}</div>
      ${n >= FAMILY_MAX ? `<p class="muted small" style="margin:6px 0 10px">Tu as déjà ${FAMILY_MAX} exos pour ce mouvement : on passe à autre chose 😉</p>` :
      list.filter((e) => !picked.has(e.id)).map((e) => {
        const blocked = familiesOf(e.id).some((f) => (fc[f] || 0) >= FAMILY_MAX);
        const same = !blocked && familiesOf(e.id).some((f) => fc[f]);
        if (blocked) return "";
        const t = equipTag(e);
        return `<div class="list-item ${same ? "dim" : ""}" data-act="b-add" data-id="${e.id}">
          <img class="thumb" src="${imgUrl(e)}" alt="" loading="lazy">
          <div class="grow"><b>${esc(e.nom)}</b>
            <div class="small">${e.muscles.filter((m) => m !== "cardio").map((m) => `<span class="mini-tag main">${MUSCLES[m]}</span>`).join("")}${e.secondaires.slice(0, 2).map((m) => `<span class="mini-tag sec">${MUSCLES[m]}</span>`).join("")}</div>
            <div class="small"><span class="eq ${t.cls}">${esc(t.txt)}</span> ${painBadge(e.id)}${same ? ` <span style="color:var(--orange)">· même mouvement qu'un exo déjà pris</span>` : ""}</div></div>
          <span class="b-add">＋</span></div>`;
      }).join("")}</div>`;
  }
  return html;
}

function buildEditModal(i) {
  const p = build.picks[i], ex = exById(p.exId);
  openModal(ex.nom, `<div class="stack">
    <div class="grid2"><label class="field">Séries<input id="bSets" inputmode="numeric" value="${p.sets}"></label>
      <label class="field">Reps / durée<input id="bReps" value="${esc(p.reps)}" placeholder="8-10, max, 30 s…"></label></div>
    <label class="field">Repos entre séries (secondes)<input id="bRest" inputmode="numeric" value="${p.rest}"></label>
    <button class="btn primary block" data-act="b-edit-save" data-i="${i}">Enregistrer</button>
    <button class="btn block" data-act="ex-info" data-id="${ex.id}">📖 Voir la technique</button></div>`);
}
