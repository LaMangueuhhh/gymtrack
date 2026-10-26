// Compteur de pas : saisie manuelle ou import depuis Apple Santé (via un raccourci qui copie le nombre de pas).
// Les calories brûlées par la marche s'ajoutent à l'objectif calorique du jour.

const stepsOf = (d) => num(state.steps[d]);
const stepGoal = () => num(state.settings.stepGoal) || 10000;
// Pas déjà comptés dans ton « niveau d'activité » (profil) : seuls les pas au-dessus rapportent des calories en plus
const stepBase = () => (state.settings.stepBase === "" || state.settings.stepBase == null ? 5000 : num(state.settings.stepBase));

// Calories nettes d'un pas : ~0,5 kcal par kg et par km de marche, longueur de pas ≈ 41,5 % de la taille
function kcalPerStep() {
  const w = currentWeight() || 75, h = num(state.profile.taille) || 175;
  return (0.5 * w * ((h * 0.415) / 100)) / 1000;
}
const stepsKcal = (n) => Math.round(n * kcalPerStep());
// Bonus ajouté à l'objectif calorique
const stepBonus = (d) => (state.settings.stepsInGoal === false ? 0 : Math.round(Math.max(0, stepsOf(d) - stepBase()) * kcalPerStep() / 10) * 10);

function stepsCard(d) {
  const n = stepsOf(d), goal = stepGoal(), pct = Math.min(100, (n / goal) * 100);
  const km = (n * (num(state.profile.taille) || 175) * 0.415) / 100000;
  const days = [...Array(7)].map((_, i) => { const x = parseDay(d); x.setDate(x.getDate() - 6 + i); return dayStr(x); });
  const max = Math.max(goal, ...days.map(stepsOf));
  return `<div class="card steps-card">
    <div class="row between"><h3>🚶 Pas ${state.stepsAt?.[d] ? `<span class="muted small" style="font-weight:500">· maj ${state.stepsAt[d]}</span>` : ""}</h3>
      <div class="row" style="gap:6px">${d === dayStr() ? `<a class="btn sm" href="${STEPS_SHORTCUT_URL}" data-mark="steps" aria-label="Actualiser depuis Santé">🔄 Santé</a>` : ""}<button class="btn sm" data-act="steps-edit" data-d="${d}">${n ? "Modifier" : "＋ Ajouter"}</button></div></div>
    <div class="row" style="margin-top:8px;align-items:flex-end"><b class="steps-n">${n.toLocaleString("fr-FR")}</b><span class="muted small" style="margin-bottom:6px">/ ${goal.toLocaleString("fr-FR")} pas</span></div>
    <div class="progress steps-bar"><div style="width:${pct}%"></div></div>
    <div class="row between small muted" style="margin-top:6px"><span>${n ? `≈ ${r1(km).toString().replace(".", ",")} km · 🔥 ${stepsKcal(n)} kcal brûlées` : "Pas encore de pas aujourd'hui"}</span>
      ${stepBonus(d) ? `<span style="color:var(--green);font-weight:700">+${stepBonus(d)} kcal à manger</span>` : ""}</div>
    <div class="steps-week">${days.map((x) => { const v = stepsOf(x); return `<div class="${v >= goal ? "ok" : ""} ${x === d ? "sel" : ""}" title="${v} pas"><i style="height:${Math.max(4, (v / max) * 100)}%"></i><span>${parseDay(x).toLocaleDateString("fr-FR", { weekday: "narrow" })}</span></div>`; }).join("")}</div>
  </div>`;
}

function stepsModal(d) {
  const n = stepsOf(d);
  openModal(`🚶 Pas · ${d === dayStr() ? "aujourd'hui" : fmtDay(d)}`, `<div class="stack">
    <label class="field">Nombre de pas<input id="stepsIn" inputmode="numeric" value="${n || ""}" placeholder="Ex : 8 500"></label>
    <div class="chips">${[5000, 8000, 10000, 12000, 15000].map((v) => `<button class="chip" data-act="steps-chip" data-v="${v}">${v.toLocaleString("fr-FR")}</button>`).join("")}</div>
    <div class="card center" style="margin:0"><div class="muted small">Calories brûlées en marchant</div><div style="font-size:26px;font-weight:800" id="stepsK">–</div>
      <div class="muted small" id="stepsB"></div></div>
    <button class="btn primary block" data-act="steps-save" data-d="${d}">Enregistrer</button>
    ${d === dayStr() ? `<div class="section-title" style="margin-top:4px">Depuis Apple Santé (iPhone)</div>
    <a class="btn block" href="${STEPS_SHORTCUT_URL}" data-mark="steps">❤️ Lancer le raccourci « GymTrack Pas »</a>
    <button class="btn block" data-act="steps-paste" data-d="${d}">📋 Coller les pas copiés</button>
    <a class="btn block" href="x-apple-health://" data-mark="steps">📱 Ouvrir Santé pour lire mes pas</a>
    <a class="small center" href="#/pas-sante" style="display:block">Ça ne marche pas ? Voir le guide pas à pas</a>` : ""}
  </div>`);
  const upd = () => {
    const v = Math.round(num($("stepsIn").value));
    $("stepsK").textContent = v ? `${stepsKcal(v)} kcal` : "–";
    const b = state.settings.stepsInGoal === false ? 0 : Math.round(Math.max(0, v - stepBase()) * kcalPerStep() / 10) * 10;
    $("stepsB").textContent = state.settings.stepsInGoal === false ? "" : b ? `+${b} kcal ajoutées à ton objectif (au-delà de ${stepBase().toLocaleString("fr-FR")} pas)` : `Les ${stepBase().toLocaleString("fr-FR")} premiers pas sont déjà comptés dans ton niveau d'activité`;
  };
  $("stepsIn").addEventListener("input", upd); upd();
}

const STEPS_SHORTCUT = "GymTrack Pas";
const STEPS_SHORTCUT_URL = "shortcuts://run-shortcut?name=" + encodeURIComponent(STEPS_SHORTCUT);

// Nombre de pas lu dans un texte : « 12 345 », « 12345,0 », « 12.345 », « 12345 pas »…
function parseOneNumber(line) {
  const clean = String(line).replace(/\d{1,2}:\d{2}(:\d{2})?/g, " "); // ignore les heures « 08:00 »
  const m = clean.match(/(\d[\d\s\u202f\u00a0.,]*)\s*pas\b/i) || clean.match(/\d[\d\s\u202f\u00a0.,]*/); // de préférence le nombre devant « pas »
  if (!m) return 0;
  const t = (m[1] || m[0]).trim().replace(/[.,]\d{1,2}$/, ""); // enlève une partie décimale éventuelle (« ,0 »)
  return parseInt(t.replace(/\D/g, ""), 10) || 0;
}
function parseStepsText(txt) {
  const lines = String(txt).split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  // plusieurs lignes = liste d'échantillons (raccourci sans « Calculer les statistiques ») : on additionne
  const n = lines.length > 1 ? lines.reduce((a, l) => a + parseOneNumber(l), 0) : parseOneNumber(lines[0] || "");
  return n > 0 && n < 200000 ? n : 0;
}

// Lit le nombre de pas dans le presse-papiers (copié par le raccourci)
async function pasteSteps(d) {
  try {
    const txt = await navigator.clipboard.readText();
    const n = parseStepsText(txt);
    if (!n) return toast(`Le presse-papiers ne contient pas de nombre de pas${txt ? ` (« ${String(txt).slice(0, 30)} »)` : ""}. Relance le raccourci.`, 5000);
    state.steps[d] = n; state.stepsAt = { ...(state.stepsAt || {}), [d]: nowHM() };
    saveNow(); closeModal();
    if (location.hash !== "#/accueil") go("#/accueil"); else route();
    setTimeout(() => document.querySelector(".steps-card")?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    toast(`🚶 ${n.toLocaleString("fr-FR")} pas importés · 🔥 ${stepsKcal(n)} kcal`, 3500);
  } catch (e) {
    toast("Impossible de lire le presse-papiers : colle le nombre dans la case");
    $("stepsIn")?.focus();
  }
}

// Guide détaillé pour relier les pas d'Apple Santé
function viewStepsHealth() {
  setTitle("Pas depuis Santé");
  return `<div class="card"><h2>Pourquoi GymTrack n'apparaît pas dans Santé ?</h2>
      <p class="small" style="margin:0">C'est <b>normal</b> : GymTrack est une appli web (installée depuis Safari), pas une appli de l'App Store. Apple ne la laissera <b>jamais</b> apparaître dans Santé → Partage → Apps, ni dans « Fichiers ». Inutile de chercher là 🙂<br><br>
      Le pont, c'est l'app <b>Raccourcis</b> : un petit raccourci lit tes pas dans Santé et les copie, puis tu les colles dans GymTrack.</p></div>
    <div class="section-title">1. Créer le raccourci (une seule fois)</div>
    <div class="card"><ol class="steps">
      <li>Ouvre l'app <b>Raccourcis</b> (icône bleue et rose, déjà sur ton iPhone).</li>
      <li>Onglet <b>Raccourcis</b> en bas → bouton <b>＋</b> en haut à droite.</li>
      <li>Touche le nom en haut (« Nouveau raccourci ») → <b>Renommer</b> → écris exactement :
        <div class="row" style="margin:6px 0"><b class="copy big-copy">${STEPS_SHORTCUT}</b><button class="btn sm" data-act="copy-name">Copier</button></div>
        <span class="muted small">Majuscules et espace compris. Si le nom est différent, iPhone dira « raccourci introuvable ».</span></li>
      <li>Touche <b>Ajouter une action</b>, cherche <b>« échantillons »</b> et choisis <b>« Rechercher des échantillons de santé »</b>.</li>
      <li>Dans cette action : touche <b>Type</b> → <b>Nombre de pas</b>. Puis <b>Ajouter un filtre</b> → <b>Date de début</b> → <b>est aujourd'hui</b>.</li>
      <li>Ajoute l'action <b>« Calculer les statistiques »</b> → choisis <b>Somme</b>.</li>
      <li>Ajoute l'action <b>« Copier dans le presse-papiers »</b>.</li>
      <li>Touche <b>OK</b>. La première fois, iPhone demande l'accès à Santé : <b>autorise « Nombre de pas »</b>.</li>
    </ol></div>
    <div class="section-title">2. Récupérer tes pas</div>
    <div class="card stack">
      <a class="btn primary block" href="${STEPS_SHORTCUT_URL}" data-mark="steps">❤️ Lancer « ${STEPS_SHORTCUT} »</a>
      <p class="muted small" style="margin:0">Le raccourci s'ouvre une seconde. Reviens dans GymTrack (touche « ◀ » en haut à gauche ou balaye), puis :</p>
      <button class="btn block" data-act="steps-paste" data-d="${dayStr()}">📋 Coller les pas copiés</button>
      <p class="muted small" style="margin:0">Si iPhone demande « Autoriser à coller ? », touche <b>Autoriser</b>.</p></div>
    <div class="section-title">Ça bloque encore ?</div>
    <div class="card"><ul class="steps small">
      <li><b>« Raccourci introuvable »</b> : le nom n'est pas exactement <b>${STEPS_SHORTCUT}</b>. Renomme-le (bouton « Copier » plus haut).</li>
      <li><b>Le nombre collé est faux</b> (doublé avec une Apple Watch) : corrige-le à la main dans la fenêtre des pas.</li>
      <li><b>Rien ne marche</b> : plan B en 10 secondes, lis tes pas dans Santé et tape-les :</li>
    </ul>
    <a class="btn block" href="x-apple-health://" data-mark="steps">📱 Ouvrir l'app Santé</a>
    <button class="btn block" style="margin-top:8px" data-act="steps-edit" data-d="${dayStr()}">✏️ Taper mes pas à la main</button></div>`;
}

// Retour depuis le raccourci : grosse fenêtre « Coller » (le collage doit venir d'un toucher, règle d'iPhone)
function stepsReturnModal() {
  openModal("🚶 Tes pas sont copiés ?", `<div class="stack center">
    <p class="muted small" style="margin:0">Touche le bouton ci-dessous. Si iPhone affiche « Coller », touche-le.</p>
    <button class="btn primary block big" data-act="steps-paste" data-d="${dayStr()}">📋 Coller mes pas</button>
    <button class="btn block" data-act="steps-edit" data-d="${dayStr()}">✏️ Taper à la main</button></div>`);
}
