// Alternatives d'exercices : même mouvement / mêmes muscles, avec un autre matériel.
// Pratique quand une machine est prise ou qu'une façon de faire ne te convient pas.

// Familles de mouvements (un exercice peut être dans plusieurs familles)
const PATTERNS = {
  "Poussée horizontale": ["dev_couche", "dev_couche_halteres", "m_chest_press", "m_smith_bench", "pompes", "c_pompes_declinees", "dips", "cr_dips"],
  "Poussée inclinée": ["dev_incline_halteres", "m_incline_press", "c_pompes_declinees", "dev_couche_halteres"],
  "Écarté pectoraux": ["ecarte_halteres", "poulie_vis_a_vis", "pec_deck"],
  "Tirage vertical": ["tractions", "tirage_vertical", "m_high_row", "m_tractions_assist", "c_chin_up"],
  "Tirage horizontal": ["rowing_barre", "rowing_haltere", "tirage_horizontal", "m_iso_row", "m_tbar", "c_australian"],
  "Charnière de hanche": ["souleve_terre", "sdt_roumain", "m_ground_base", "kb_swing", "extensions_lombaires"],
  "Fessiers": ["hip_thrust", "m_kickback", "c_pont", "m_abducteurs", "extensions_lombaires"],
  "Squat": ["squat", "m_smith_squat", "m_hack_squat", "presse", "goblet", "c_squat_pdc", "c_pistol"],
  "Fente": ["fentes", "step_ups", "c_fentes_marchees", "c_pistol"],
  "Développé épaules": ["dev_militaire", "dev_halteres_assis", "m_shoulder_press", "arnold", "c_hspu"],
  "Élévations latérales": ["elev_laterales", "m_lat_raise_cable"],
  "Arrière d'épaule": ["oiseau", "face_pull", "m_reverse_fly"],
  "Trapèzes": ["shrugs", "m_shrug"],
  "Biceps": ["curl_barre", "curl_halteres", "curl_marteau", "curl_pupitre", "m_curl", "c_chin_up"],
  "Triceps": ["extension_poulie", "barre_front", "dev_serre", "ext_nuque", "m_triceps", "m_dips", "c_dips_triceps", "cr_dips", "c_pompes_diamant"],
  "Quadriceps (isolation)": ["leg_ext", "goblet", "c_squat_pdc"],
  "Ischio-jambiers": ["leg_curl", "m_leg_curl_assis", "sdt_roumain", "c_pont"],
  "Mollets": ["mollets", "m_mollets_assis"],
  "Adducteurs": ["m_adducteurs", "fentes"],
  "Abdos": ["crunch", "crunch_poulie", "m_abs", "releve_jambes", "cr_releve_genoux", "c_toes_to_bar", "c_flutter"],
  "Gainage": ["gainage", "c_gainage_lateral", "mountain_climbers", "c_flutter"],
  "Obliques": ["russian_twist", "c_gainage_lateral", "cr_releve_genoux"],
  "Lombaires": ["extensions_lombaires", "c_superman"],
  "Cardio": ["course_tapis", "velo", "rameur", "elliptique", "corde", "m_escalier", "marche_inclinee"],
};

// Type de matériel, pour afficher « Sans matériel », « Machine »…
function equipTag(ex) {
  const m = (ex.materiel || "").toLowerCase();
  if (ex.maison === "chaise") return { cls: "home", txt: "🏠 Chaise romaine" };
  if (m === "aucun" || m.startsWith("aucun")) return { cls: "home", txt: "🏠 Sans matériel" };
  if (ex.machine) return { cls: "machine", txt: "🏢 Machine" };
  if (m.includes("haltère")) return { cls: "free", txt: "Haltères" };
  if (m.includes("barre")) return { cls: "free", txt: m.includes("traction") ? "Barre de traction" : "Barre" };
  return { cls: "free", txt: ex.materiel };
}

// Alternatives triées : même famille de mouvement d'abord, puis mêmes muscles
function alternativesFor(id, limit = 8) {
  const ex = exById(id);
  if (!ex) return [];
  const fams = Object.entries(PATTERNS).filter(([, ids]) => ids.includes(id)).map(([f]) => f);
  const main = new Set(ex.muscles), sec = new Set(ex.secondaires);
  const scored = [];
  for (const o of EXERCISES) {
    if (o.id === id || o.role || o.groupe === "Étirements" || isHidden(o)) continue;
    const fam = fams.find((f) => PATTERNS[f].includes(o.id));
    let score = fam ? 100 : 0;
    score += o.muscles.filter((m) => main.has(m)).length * 10 + o.secondaires.filter((m) => main.has(m) || sec.has(m)).length * 2;
    if (!fam && !o.muscles.some((m) => main.has(m))) continue; // sans muscle principal commun : pas une vraie alternative
    if (o.type === ex.type) score += 3;
    scored.push({ ex: o, score, fam });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function altRow(a, act = "go", extra = "") {
  const t = equipTag(a.ex);
  return `<div class="list-item" ${act === "go" ? `data-act="go" data-to="#/exo/${a.ex.id}"` : `data-act="${act}" data-id="${a.ex.id}" ${extra}`}>
    <img class="thumb" src="${imgUrl(a.ex)}" alt="" loading="lazy">
    <div class="grow"><b>${esc(a.ex.nom)}</b>
      <div class="small"><span class="eq ${t.cls}">${esc(t.txt)}</span> <span class="muted">${a.fam ? esc(a.fam) : a.ex.muscles.map((m) => MUSCLES[m]).join(", ")}</span></div></div>
    <span class="arrow">${act === "go" ? "›" : "⇄"}</span></div>`;
}

// Fenêtre « remplacer » pendant une séance (machine prise, mouvement qui ne plaît pas…)
function swapModal(i) {
  const e = state.current.exercises[i], ex = exById(e.exId);
  const alts = alternativesFor(ex.id, 10);
  openModal(`Remplacer : ${ex.nom}`, `<p class="muted small" style="margin-top:0">Machine prise ou mouvement qui ne te va pas ? Choisis une alternative : les séries et l'objectif sont gardés.</p>
    <div class="card list-card">${alts.map((a) => altRow(a, "swap-to", `data-i="${i}"`)).join("") || `<div class="empty">Pas d'alternative trouvée</div>`}</div>
    <button class="btn block" data-act="ex-replace" data-i="${i}">📖 Choisir dans tous les exercices</button>`);
}
