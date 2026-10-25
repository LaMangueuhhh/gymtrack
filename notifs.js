// Notifications de motivation programmables.
// 1) Dans l'appli : quand GymTrack est ouverte (ou vient d'être ouverte), les rappels de l'heure s'affichent.
// 2) Sur iPhone, appli fermée : une appli web ne peut pas programmer de notification seule ;
//    on passe par les « Automatisations » de l'app Raccourcis (gratuit, fiable, même téléphone verrouillé).

const MOTIVATION = [
  "La douleur d'aujourd'hui, c'est la force de demain. 💪",
  "Tu ne regretteras jamais une séance. Tu regretteras celles que tu as sautées.",
  "Pas besoin d'être motivé, juste discipliné. On y va.",
  "Chaque rep compte. Même les mauvais jours.",
  "Ton futur toi te remercie déjà.",
  "Petit progrès + chaque jour = gros résultat.",
  "Le plus dur, c'est d'enfiler tes baskets. Le reste suit.",
  "Personne ne va soulever les poids à ta place.",
  "Fais-le pour toi, pas pour les autres.",
  "Les excuses ne brûlent pas de calories. 🔥",
  "Un corps, une vie. Prends-en soin.",
  "La régularité bat le talent quand le talent n'est pas régulier.",
  "30 minutes. C'est 2 % de ta journée.",
  "Ton seul adversaire, c'est toi d'hier.",
  "Sois plus fort que tes excuses.",
  "Sueur aujourd'hui, sourire demain.",
  "Tu as déjà fait le plus dur : commencer. Continue.",
  "Les résultats arrivent à ceux qui ne lâchent pas.",
  "Ne compte pas les jours, fais que les jours comptent.",
  "Une séance moyenne vaut mieux que zéro séance.",
  "Ta série 🔥 t'attend. Ne la casse pas aujourd'hui.",
  "Le miroir ne ment pas, mais il est patient.",
  "Discipline = faire ce qu'il faut même quand t'as pas envie.",
  "Un verre d'eau, une séance, une bonne nuit. La base. 💧",
  "Tu deviens ce que tu répètes.",
  "Les champions s'entraînent quand personne ne regarde.",
  "Aujourd'hui, mieux qu'hier. Demain, mieux qu'aujourd'hui.",
  "C'est pas fini quand t'es fatigué, c'est fini quand t'as fini.",
  "Ton corps peut tout supporter. C'est ta tête qu'il faut convaincre.",
  "Rien ne change si tu ne changes rien.",
  "Va chercher ce rang Platine. 🎖️",
  "Un pas à la fois. Une rep à la fois.",
  "La motivation te fait démarrer, l'habitude te fait continuer.",
  "Hydrate-toi, champion. 💧",
  "Pas de raccourci vers un endroit qui vaut le coup.",
  "Le confort ne t'a jamais fait progresser.",
  "Respire. Concentre-toi. Pousse.",
  "Si c'était facile, tout le monde le ferait.",
  "Le meilleur moment pour commencer, c'était hier. Le deuxième, c'est maintenant.",
  "Fier de toi pour chaque séance faite. Allez, une de plus.",
];

const REMINDER_TYPES = {
  motivation: { nom: "Motivation", icon: "💪", text: () => MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)] },
  seance: { nom: "Séance", icon: "🏋️", text: () => "C'est l'heure de la séance ! Ton programme t'attend 💪", skip: () => state.sessions.some((s) => s.date === dayStr()) || !!visitOf(dayStr()) },
  defi: { nom: "Défi du jour", icon: "🔥", text: () => `Ton défi du jour n'est pas fini. Série actuelle : ${defiStreak()} jour(s) 🔥`, skip: () => !!state.defis[dayStr()]?.complete },
  eau: { nom: "Eau", icon: "💧", text: () => `Bois un verre d'eau ! (${((state.water[dayStr()] || 0) / 1000).toLocaleString("fr-FR")} L / ${(waterGoal() / 1000).toLocaleString("fr-FR")} L)`, skip: () => (state.water[dayStr()] || 0) >= waterGoal() },
  repas: { nom: "Repas", icon: "🍽️", text: () => "Pense à noter ton repas dans GymTrack 🍽️" },
  pesee: { nom: "Pesée", icon: "⚖️", text: () => "Pesée du matin : à jeun, après les toilettes ⚖️" },
  perso: { nom: "Message perso", icon: "✏️", text: (r) => r.text || "Allez, au boulot !" },
};
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const DAYS_LONG = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const PRESETS = [
  { type: "motivation", time: "08:00", days: [1, 2, 3, 4, 5, 6, 7] },
  { type: "seance", time: "17:30", days: [1, 3, 5] },
  { type: "eau", time: "11:00", days: [1, 2, 3, 4, 5, 6, 7] },
  { type: "eau", time: "15:00", days: [1, 2, 3, 4, 5, 6, 7] },
  { type: "defi", time: "20:00", days: [1, 2, 3, 4, 5, 6, 7] },
  { type: "pesee", time: "07:30", days: [1] },
];
const isoDay = (d = new Date()) => ((d.getDay() + 6) % 7) + 1; // 1 = lundi

function daysLabel(days) {
  if (days.length === 7) return "tous les jours";
  if (days.join() === "1,2,3,4,5") return "en semaine";
  if (days.join() === "6,7") return "le week-end";
  return days.map((d) => DAYS_LONG[d - 1].slice(0, 3)).join(", ");
}

// Affiche une notification (via le service worker si possible, sinon dans l'appli)
async function notify(title, body) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) { await reg.showNotification(title, { body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "gymtrack-" + Date.now() }); return; }
      new Notification(title, { body, icon: "icons/icon-192.png" }); return;
    }
  } catch (e) { /* on retombe sur le message dans l'appli */ }
  toast(`${title} — ${body}`, 5000);
}

// Vérifie les rappels arrivés à échéance (appelé régulièrement quand l'appli est ouverte)
function checkReminders() {
  const now = new Date(), today = dayStr(now), mins = now.getHours() * 60 + now.getMinutes();
  let changed = false;
  for (const r of state.reminders) {
    if (!r.on || !r.days.includes(isoDay(now)) || r.last === today) continue;
    const t = toMin(r.time);
    if (mins < t || mins - t > 120) continue; // trop tôt, ou raté depuis plus de 2 h
    r.last = today; changed = true;
    const T = REMINDER_TYPES[r.type];
    if (T.skip && T.skip()) continue;
    notify(`${T.icon} GymTrack`, T.text(r));
  }
  if (changed) save();
}
setInterval(checkReminders, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkReminders(); });

function viewNotifs() {
  setTitle("Notifications");
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  let html = `<div class="card"><h2>🔔 Rappels de motivation</h2>
    <p class="small" style="margin-top:0">Programme tes rappels : heure, jours, type. Les rappels intelligents ne sonnent pas si c'est déjà fait (ex : pas de rappel défi si tu l'as réussi).</p>
    ${perm === "granted" ? `<p class="small" style="color:var(--green);margin:0">✅ Notifications autorisées</p>`
      : perm === "unsupported" ? `<p class="small muted" style="margin:0">Ton navigateur ne gère pas les notifications. Sur iPhone : installe l'appli sur l'écran d'accueil (iOS 16.4+).</p>`
      : `<button class="btn primary block" data-act="notif-perm">Autoriser les notifications</button>`}
    <button class="btn sm block" style="margin-top:10px" data-act="notif-test">Envoyer une notification de test</button></div>`;

  html += `<div class="section-title">Mes rappels</div>`;
  html += state.reminders.length ? `<div class="card list-card">${state.reminders.map((r, i) => {
    const T = REMINDER_TYPES[r.type];
    return `<div class="switch-row"><span class="grow" data-act="notif-edit" data-i="${i}" style="cursor:pointer"><b class="rem-time">${r.time}</b> ${T.icon} ${T.nom}<br>
      <span class="muted small">${daysLabel(r.days)}${r.type === "perso" ? ` · « ${esc(r.text)} »` : ""}</span></span>
      <input type="checkbox" class="switch" data-in="rem-on" data-i="${i}" ${r.on ? "checked" : ""}></div>`;
  }).join("")}</div>` : `<div class="empty" style="padding:14px">Aucun rappel pour l'instant</div>`;
  html += `<button class="btn primary block" data-act="notif-edit" data-i="-1">＋ Nouveau rappel</button>
    <div class="section-title">Idées rapides</div><div class="chips">${PRESETS.map((p, i) => `<button class="chip" data-act="notif-preset" data-i="${i}">${REMINDER_TYPES[p.type].icon} ${p.time} ${REMINDER_TYPES[p.type].nom}</button>`).join("")}</div>`;

  // Guide iPhone (Raccourcis)
  html += `<div class="section-title">Recevoir les rappels appli fermée (iPhone)</div>
    <div class="card"><p class="small" style="margin-top:0">Apple ne laisse pas une appli web programmer des notifications quand elle est fermée. L'astuce gratuite et fiable : les <b>Automatisations</b> de l'app <b>Raccourcis</b>. À faire une fois par rappel :</p>
    <details class="guide"><summary><b>1. Créer le raccourci « GymTrack Motivation »</b> (une seule fois)</summary>
      <ol class="steps">
        <li>App <b>Raccourcis</b> → onglet <b>Raccourcis</b> → <b>＋</b>. Nomme-le <b class="copy">GymTrack Motivation</b>.</li>
        <li>Ajoute l'action <b>« Obtenir le contenu de l'URL »</b> avec l'adresse :<br><b class="copy small">${location.origin + location.pathname.replace(/[^/]*$/, "")}motivation.txt</b></li>
        <li>Ajoute <b>« Diviser le texte »</b> → par <b>Nouvelles lignes</b>.</li>
        <li>Ajoute <b>« Obtenir un élément de la liste »</b> → <b>Élément aléatoire</b>.</li>
        <li>Ajoute <b>« Afficher la notification »</b> → texte : <b>Élément de la liste</b>, titre : GymTrack.</li>
      </ol>
      <p class="muted small">Chaque fois qu'il se lance, tu reçois une phrase de motivation différente (il y en a ${MOTIVATION.length}).</p></details>
    <details class="guide"><summary><b>2. Programmer l'heure</b> (pour chaque rappel)</summary>
      <ol class="steps">
        <li>Raccourcis → onglet <b>Automatisation</b> → <b>＋</b> → <b>Heure de la journée</b>.</li>
        <li>Choisis l'heure et les jours (ex : ${state.reminders[0] ? `${state.reminders[0].time}, ${daysLabel(state.reminders[0].days)}` : "08:00, tous les jours"}).</li>
        <li>Coche <b>« Exécuter immédiatement »</b> (et désactive « Me notifier lors de l'exécution »).</li>
        <li>Action : <b>Motivation</b> → « Exécuter le raccourci » <b>GymTrack Motivation</b>. Pour un autre type (eau, séance…) : action <b>« Afficher la notification »</b> avec ton texte.</li>
      </ol></details>
    ${state.reminders.filter((r) => r.on).length ? `<p class="muted small" style="margin-bottom:0">À créer : ${state.reminders.filter((r) => r.on).map((r) => `<b style="color:var(--text)">${r.time}</b> ${REMINDER_TYPES[r.type].icon} (${daysLabel(r.days)})`).join(" · ")}</p>` : ""}
  </div>`;
  return html;
}

function reminderModal(i) {
  const r = i >= 0 ? state.reminders[i] : { type: "motivation", time: "18:00", days: [1, 2, 3, 4, 5], text: "", on: true };
  openModal(i >= 0 ? "Modifier le rappel" : "Nouveau rappel", `<div class="stack">
    <label class="field">Type<select id="remType">${Object.entries(REMINDER_TYPES).map(([k, t]) => `<option value="${k}" ${k === r.type ? "selected" : ""}>${t.icon} ${t.nom}</option>`).join("")}</select></label>
    <label class="field">Heure<input type="time" id="remTime" value="${r.time}"></label>
    <div class="field">Jours</div>
    <div class="day-pick">${DAYS.map((d, k) => `<button class="${r.days.includes(k + 1) ? "on" : ""}" data-act="rem-day" data-d="${k + 1}">${d}</button>`).join("")}</div>
    <label class="field" id="remTextWrap" ${r.type === "perso" ? "" : "hidden"}>Ton message<input id="remText" value="${esc(r.text || "")}" placeholder="Ex : Va à la salle, pas d'excuse !"></label>
    <button class="btn primary block" data-act="rem-save" data-i="${i}">Enregistrer</button>
    ${i >= 0 ? `<button class="btn danger block" data-act="rem-del" data-i="${i}">Supprimer</button>` : ""}</div>`);
  reminderModal.days = [...r.days];
  $("remType").addEventListener("change", (e) => { $("remTextWrap").hidden = e.target.value !== "perso"; });
}
