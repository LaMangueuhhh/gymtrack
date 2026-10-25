// Partage de séances entre amis : QR code, lien ou code à coller. Aucun compte ni serveur :
// toute la séance est contenue dans le code.

const b64urlEncode = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlDecode = (code) => {
  const b = atob(code.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((code.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
};

function encodeWorkout(w) {
  return b64urlEncode(JSON.stringify({ v: 1, n: w.nom, e: w.ex.map(([id, sets, reps, rest]) => [id, sets, String(reps), rest]) }));
}
// Accepte un code brut ou un lien complet ; renvoie null si invalide
function decodeWorkout(input) {
  try {
    const code = String(input).trim().split("#/import/").pop().split(/[?\s]/)[0];
    const o = JSON.parse(b64urlDecode(code));
    const ex = (o.e || []).filter(([id]) => exById(id)).map(([id, sets, reps, rest]) => [id, Math.max(1, Math.min(10, Math.round(num(sets)) || 3)), String(reps || "10").slice(0, 30), Math.max(0, Math.min(600, Math.round(num(rest))))]);
    if (!ex.length) return null;
    return { nom: String(o.n || "Séance partagée").slice(0, 60), ex };
  } catch (e) { return null; }
}
const shareUrl = (w) => `${location.origin}${location.pathname}#/import/${encodeWorkout(w)}`;

function shareModal(w) {
  const url = shareUrl(w), code = encodeWorkout(w);
  let qr = "";
  try { const q = qrcode(0, "L"); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 3, scalable: true }); } catch (e) { qr = ""; }
  openModal(`📤 Partager « ${w.nom} »`, `<div class="stack center">
    ${qr ? `<div class="qr-box">${qr}</div><p class="muted small" style="margin:0">Ton ami scanne ce QR code avec l'appareil photo de son iPhone (ou dans GymTrack → Entraîner → Importer).</p>` : ""}
    <button class="btn primary block" data-act="share-link">📤 Envoyer le lien (SMS, WhatsApp, Snap…)</button>
    <button class="btn block" data-act="share-copy">📋 Copier le code</button>
    <p class="muted small" style="margin:0">${w.ex.length} exercices · ${workoutMinutes(w)} min · ton ami n'a pas besoin de compte.</p></div>`);
  shareModal.data = { url, code, nom: w.nom };
}

async function shareLink() {
  const { url, nom } = shareModal.data;
  try {
    if (navigator.share) { await navigator.share({ title: `GymTrack – ${nom}`, text: `💪 Essaie ma séance « ${nom} » sur GymTrack :`, url }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  copyText(url, "🔗 Lien copié : colle-le dans un message");
}
async function copyText(txt, msg) {
  try { await navigator.clipboard.writeText(txt); toast(msg); }
  catch (e) { prompt("Copie ce texte :", txt); }
}

// Fenêtre « Importer une séance » : scanner un QR ou coller un code / lien
let importScanner = null;
function stopImportScanner() { if (importScanner) { const s = importScanner; importScanner = null; s.stop().then(() => s.clear()).catch(() => {}); } }
function importModal() {
  openModal("📥 Importer une séance", `<div class="stack">
    <div id="qrReader"></div><p class="muted small center" id="qrMsg" style="margin:0">Vise le QR code de ton ami</p>
    <label class="field">… ou colle un code / lien<input id="importIn" placeholder="https://…#/import/… ou le code" autocomplete="off" autocapitalize="off"></label>
    <button class="btn primary block" data-act="import-go">Importer</button></div>`, stopImportScanner);
  if (typeof Html5Qrcode === "undefined") return;
  importScanner = new Html5Qrcode("qrReader", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
  const sc = importScanner;
  sc.start({ facingMode: "environment" }, { fps: 10, qrbox: (w) => ({ width: Math.min(240, w * 0.8), height: Math.min(240, w * 0.8) }) },
    (txt) => { if (importScanner !== sc) return; stopImportScanner(); openImport(txt); }, () => {})
    .catch(() => { if ($("qrMsg")) $("qrMsg").textContent = "Caméra indisponible : colle le code ou le lien."; });
}
function openImport(txt) {
  const w = decodeWorkout(txt);
  if (!w) return toast("Code de séance invalide");
  closeModal();
  go("#/import/" + encodeWorkout(w));
}

function viewImport(code) {
  const w = decodeWorkout(code || "");
  setTitle("Séance partagée");
  if (!w) return `<div class="empty"><span class="big">🤔</span>Ce lien de séance n'est pas valide.</div><a class="btn block" href="#/entrainer">Retour</a>`;
  viewImport.w = w;
  return `<div class="card highlight"><p class="eyebrow">Un ami t'a partagé une séance</p><h2>${esc(w.nom)}</h2>
      <p class="muted small">⏱ ${workoutMinutes(w)} min · ${w.ex.length} exos · ${workoutMuscles(w).join(", ")}</p>
      <div class="grid2"><button class="btn" data-act="import-save">💾 Garder</button><button class="btn primary" data-act="import-start">▶ Commencer</button></div></div>
    <div class="card list-card">${w.ex.map(([id, sets, reps, rest]) => { const ex = exById(id); return `<div class="list-item" data-act="ex-info" data-id="${id}">
      <img class="thumb" src="${imgUrl(ex)}" alt="" loading="lazy"><div class="grow"><b>${esc(ex.nom)}</b>
      <div class="muted small">${sets} × ${esc(reps)}${rest ? ` · repos ${fmtTime(rest)}` : ""}</div></div><span class="arrow">ⓘ</span></div>`; }).join("")}</div>`;
}
