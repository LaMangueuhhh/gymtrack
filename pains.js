// Douleurs : à la fin de chaque séance on note les zones douloureuses.
// À la séance suivante : échauffement ciblé ajouté + exercices qui sollicitent la zone signalés (avec alternatives).

const JOINTS = {
  epaule: { nom: "Épaule", icon: "🦾", warm: ["e_epaules", "e_bras"],
    ex: ["dev_couche", "dev_incline_halteres", "dev_couche_halteres", "ecarte_halteres", "poulie_vis_a_vis", "m_chest_press", "m_incline_press", "m_smith_bench", "dips", "cr_dips", "c_dips_triceps", "m_dips", "dev_militaire", "dev_halteres_assis", "arnold", "m_shoulder_press", "elev_laterales", "m_lat_raise_cable", "c_hspu", "c_muscle_up", "tractions", "pompes", "c_pompes_declinees"],
    conseil: "Échauffe bien les épaules, évite les développés lourds au-dessus de la tête et les dips. Privilégie les machines guidées et les charges légères." },
  coude: { nom: "Coude", icon: "💪", warm: ["e_coudes", "e_poignets"],
    ex: ["barre_front", "dev_serre", "extension_poulie", "ext_nuque", "m_triceps", "m_dips", "dips", "cr_dips", "c_dips_triceps", "c_pompes_diamant", "curl_barre", "curl_halteres", "curl_marteau", "curl_pupitre", "m_curl", "tractions", "c_chin_up", "c_muscle_up"],
    conseil: "Évite les extensions triceps lourdes (barre au front), les dips et les curls barre droite. Préfère le curl marteau léger et la poulie avec corde." },
  poignet: { nom: "Poignet", icon: "✋", warm: ["e_poignets"],
    ex: ["pompes", "c_pompes_diamant", "c_pompes_declinees", "curl_barre", "barre_front", "dev_couche", "dev_militaire", "c_hspu", "mountain_climbers", "kb_swing", "goblet"],
    conseil: "Évite l'appui sur les mains (pompes, gainage bras tendus) et les barres droites. Fais les pompes sur poings ou poignées, le gainage sur les avant-bras." },
  dos: { nom: "Bas du dos", icon: "🔙", warm: ["s_chat", "e_hanches"],
    ex: ["souleve_terre", "sdt_roumain", "rowing_barre", "squat", "m_ground_base", "kb_swing", "extensions_lombaires", "m_tbar", "dev_militaire", "c_superman", "goblet"],
    conseil: "Pas de soulevé de terre ni de rowing penché. Préfère les machines avec appui dos/poitrine (presse, rowing machine) et le gainage doux." },
  genou: { nom: "Genou", icon: "🦵", warm: ["e_genoux", "e_hanches"],
    ex: ["squat", "m_hack_squat", "m_smith_squat", "presse", "leg_ext", "fentes", "c_fentes_marchees", "c_pistol", "goblet", "step_ups", "c_squat_pdc", "course_tapis", "corde"],
    conseil: "Limite la profondeur des squats, évite les fentes, le leg extension lourd et la course. Le vélo et le leg curl sont souvent mieux tolérés." },
  hanche: { nom: "Hanche", icon: "🦴", warm: ["e_hanches", "s_hanches"],
    ex: ["squat", "sdt_roumain", "souleve_terre", "hip_thrust", "fentes", "c_fentes_marchees", "m_adducteurs", "m_abducteurs", "c_pistol", "kb_swing", "releve_jambes", "cr_releve_genoux"],
    conseil: "Réduis l'amplitude, évite les grands écarts et les fentes. Échauffe longtemps les hanches avant." },
  cheville: { nom: "Cheville", icon: "🦶", warm: ["e_chevilles"],
    ex: ["course_tapis", "corde", "mollets", "m_mollets_assis", "c_pistol", "fentes", "c_fentes_marchees", "step_ups"],
    conseil: "Pas de course ni de sauts. Remplace le tapis par le vélo ou le rameur." },
  nuque: { nom: "Nuque", icon: "🧣", warm: ["s_nuque", "e_epaules"],
    ex: ["shrugs", "m_shrug", "dev_militaire", "crunch", "c_hspu", "face_pull"],
    conseil: "Évite les shrugs et les crunchs en tirant sur la tête. Garde le menton rentré et ne monte pas les épaules." },
};
const PAIN_LEVELS = ["", "légère", "forte"];

// Douleurs de la dernière séance (si elle date de moins de 10 jours et n'a pas été marquée « c'est passé »)
function recentPains() {
  const last = [...state.sessions].filter((s) => s.pains).sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start)[0];
  if (!last) return null;
  const d = new Date(); d.setDate(d.getDate() - 10);
  if (last.date < dayStr(d) || state.painsCleared === last.id) return null;
  const list = Object.entries(last.pains).filter(([j, l]) => JOINTS[j] && l);
  return list.length ? { date: last.date, id: last.id, list } : null;
}
// Zones douloureuses sollicitées par un exercice
function exPainRisk(exId) {
  const rp = recentPains();
  if (!rp) return [];
  return rp.list.filter(([j]) => JOINTS[j].ex.includes(exId)).map(([j, l]) => ({ j, l, nom: JOINTS[j].nom }));
}
const painBadge = (exId) => exPainRisk(exId).map((r) => `<span class="pain-badge ${r.l === 2 ? "strong" : ""}">⚠️ ${r.nom}</span>`).join("");

function painsCard() {
  const rp = recentPains();
  if (!rp) return "";
  return `<div class="card pain-card"><b>🩹 Douleur signalée le ${fmtShort(rp.date)}</b>
    ${rp.list.map(([j, l]) => `<div class="small" style="margin-top:6px"><b>${JOINTS[j].icon} ${JOINTS[j].nom} (${PAIN_LEVELS[l]})</b> — <span class="muted">${JOINTS[j].conseil}</span></div>`).join("")}
    <p class="muted small" style="margin:8px 0 10px">À ta prochaine séance : échauffement ciblé ajouté et exos à risque signalés ⚠️ (touche ⇄ pour les remplacer).${rp.list.some(([, l]) => l === 2) ? " <b style='color:var(--red)'>Douleur forte : si ça dure, consulte un médecin ou un kiné.</b>" : ""}</p>
    <button class="btn sm block" data-act="pain-clear" data-id="${rp.id}">✅ C'est passé</button></div>`;
}

// Bloc « douleurs ? » dans la fenêtre de fin de séance
function painPickerHtml() {
  return `<div class="field">Des douleurs pendant la séance ? <span class="muted">(touche 1× = légère, 2× = forte)</span></div>
    <div class="pain-pick">${Object.entries(JOINTS).map(([k, j]) => `<button data-act="pain-tap" data-j="${k}">${j.icon} ${j.nom}</button>`).join("")}</div>`;
}
