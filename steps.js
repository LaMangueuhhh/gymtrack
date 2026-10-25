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
    <div class="row between"><h3>🚶 Pas</h3><button class="btn sm" data-act="steps-edit" data-d="${d}">${n ? "Modifier" : "＋ Ajouter"}</button></div>
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
    <button class="btn block" data-act="steps-health">❤️ Récupérer mes pas depuis Santé</button>
    <button class="btn block" data-act="steps-paste" data-d="${d}">📋 Coller les pas copiés</button>
    <details class="guide card" style="margin:0"><summary><b>Créer le raccourci « GymTrack Pas »</b> (une fois)</summary>
      <ol class="steps small">
        <li>App <b>Raccourcis</b> → <b>＋</b> → nomme-le <b class="copy">GymTrack Pas</b>.</li>
        <li>Ajoute <b>« Rechercher des échantillons de santé »</b> : Type <b>Nombre de pas</b>, Date de début <b>Aujourd'hui</b>, Regrouper par <b>Jour</b>.</li>
        <li>Ajoute <b>« Calculer les statistiques »</b> → <b>Somme</b>.</li>
        <li>Ajoute <b>« Copier dans le presse-papiers »</b>.</li>
        <li>C'est tout. Ensuite : touche « Récupérer mes pas depuis Santé », reviens dans GymTrack et touche « Coller les pas copiés ».</li>
      </ol>
      <p class="muted small" style="margin-bottom:0">Apple ne laisse pas une appli web lire Santé directement : le raccourci sert de pont. Si tu as une Apple Watch et que le total paraît doublé, corrige-le à la main.</p></details>` : ""}
  </div>`);
  const upd = () => {
    const v = Math.round(num($("stepsIn").value));
    $("stepsK").textContent = v ? `${stepsKcal(v)} kcal` : "–";
    const b = state.settings.stepsInGoal === false ? 0 : Math.round(Math.max(0, v - stepBase()) * kcalPerStep() / 10) * 10;
    $("stepsB").textContent = state.settings.stepsInGoal === false ? "" : b ? `+${b} kcal ajoutées à ton objectif (au-delà de ${stepBase().toLocaleString("fr-FR")} pas)` : `Les ${stepBase().toLocaleString("fr-FR")} premiers pas sont déjà comptés dans ton niveau d'activité`;
  };
  $("stepsIn").addEventListener("input", upd); upd();
}

// Lit le nombre de pas dans le presse-papiers (copié par le raccourci)
async function pasteSteps(d) {
  try {
    const txt = await navigator.clipboard.readText();
    const n = Math.round(num(String(txt).replace(/\s/g, "").replace(/[^\d.,]/g, "")));
    if (!n) return toast("Pas de nombre de pas dans le presse-papiers");
    state.steps[d] = n; save(); closeModal(); route();
    toast(`🚶 ${n.toLocaleString("fr-FR")} pas importés · 🔥 ${stepsKcal(n)} kcal`);
  } catch (e) {
    toast("Impossible de lire le presse-papiers : colle le nombre dans la case");
    $("stepsIn")?.focus();
  }
}
