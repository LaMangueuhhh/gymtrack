// Sommeil : heure de coucher + heure de réveil → durée de la nuit, qualité ressentie.
// La nuit est enregistrée à la date du réveil.

const SLEEP_FEEL = ["😫", "😕", "😐", "🙂", "😴"];
const sleepGoal = () => num(state.settings.sleepGoal) || 8;
function sleepMinutes(n) {
  if (!n || !n.bed || !n.wake) return 0;
  return (toMin(n.wake) - toMin(n.bed) + 1440) % 1440;
}
const fmtSleep = (m) => `${Math.floor(m / 60)}h${pad(m % 60)}`;

function sleepCard(d) {
  const n = state.sleep[d], m = sleepMinutes(n), goal = sleepGoal() * 60;
  const days = [...Array(7)].map((_, i) => { const x = parseDay(d); x.setDate(x.getDate() - 6 + i); return dayStr(x); });
  const vals = days.map((x) => sleepMinutes(state.sleep[x]));
  const filled = vals.filter(Boolean), avg = filled.length ? Math.round(filled.reduce((a, b) => a + b, 0) / filled.length) : 0;
  const max = Math.max(goal + 60, ...vals);
  return `<div class="card sleep-card">
    <div class="row between"><h3>🌙 Sommeil</h3><button class="btn sm" data-act="sleep-edit" data-d="${d}">${m ? "Modifier" : "＋ Ma nuit"}</button></div>
    ${m ? `<div class="row" style="margin-top:8px;align-items:flex-end"><b class="sleep-n">${fmtSleep(m)}</b>
        <span class="muted small" style="margin-bottom:6px">${n.bed} → ${n.wake}${n.q ? " · " + SLEEP_FEEL[n.q - 1] : ""}</span></div>
      <div class="small" style="margin-top:4px;color:${m >= goal ? "var(--green)" : m >= goal - 60 ? "var(--yellow)" : "var(--orange)"}">${m >= goal ? "✅ Objectif atteint" : `Il te manque ${fmtSleep(goal - m)} pour ton objectif de ${sleepGoal()} h`}</div>`
      : `<p class="muted small" style="margin:8px 0 0">À quelle heure tu t'es couché et réveillé ? Le sommeil compte autant que l'entraînement pour progresser.</p>`}
    <div class="sleep-week">${days.map((x, i) => `<div class="${vals[i] >= goal ? "ok" : ""} ${x === d ? "sel" : ""}"><i style="height:${vals[i] ? Math.max(4, Math.round((vals[i] / max) * 52)) : 0}px"></i><span>${parseDay(x).toLocaleDateString("fr-FR", { weekday: "narrow" })}</span></div>`).join("")}
</div>
    ${avg ? `<div class="muted small" style="margin-top:6px">Moyenne sur 7 jours : <b style="color:var(--text)">${fmtSleep(avg)}</b></div>` : ""}
  </div>`;
}

function sleepModal(d) {
  const n = state.sleep[d] || {};
  sleepModal.q = n.q || 0;
  openModal(`🌙 Nuit du ${fmtDay(d, { weekday: "long", day: "numeric", month: "long" })}`, `<div class="stack">
    <div class="grid2"><label class="field">Couché à<input type="time" id="slBed" value="${n.bed || "23:30"}"></label>
      <label class="field">Réveillé à<input type="time" id="slWake" value="${n.wake || "07:30"}"></label></div>
    <div class="card center" style="margin:0"><div class="muted small">Durée de sommeil</div><div style="font-size:30px;font-weight:800" id="slDur">–</div></div>
    <div class="field">Qualité ressentie</div>
    <div class="feel-row">${SLEEP_FEEL.map((f, i) => `<button data-act="sleep-q" data-v="${i + 1}" class="${sleepModal.q === i + 1 ? "on" : ""}">${f}</button>`).join("")}</div>
    <button class="btn primary block" data-act="sleep-save" data-d="${d}">Enregistrer</button>
    ${state.sleep[d] ? `<button class="btn danger block" data-act="sleep-del" data-d="${d}">Effacer</button>` : ""}</div>`);
  const upd = () => { const m = sleepMinutes({ bed: $("slBed").value, wake: $("slWake").value }); $("slDur").textContent = m ? fmtSleep(m) : "–"; };
  $("slBed").addEventListener("input", upd); $("slWake").addEventListener("input", upd); upd();
}
