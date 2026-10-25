// Photo d'un repas → aliments + calories, grâce à l'IA Gemini de Google (clé gratuite).
// La photo est réduite sur le téléphone puis envoyée à Google ; la clé reste stockée sur le téléphone.

const AI_MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];
const AI_PROMPT = `Tu es un nutritionniste. Analyse cette photo de repas.
Identifie chaque aliment visible, estime la quantité réellement présente en grammes (portion réaliste vue sur la photo),
et donne ses valeurs nutritionnelles POUR 100 g (tables type Ciqual / étiquettes françaises).
Réponds UNIQUEMENT avec ce JSON :
{"plat": "nom court du repas", "aliments": [{"nom": "Riz blanc cuit", "grammes": 150, "kcal_100g": 130, "proteines_100g": 2.7, "glucides_100g": 28, "lipides_100g": 0.3}],
 "confiance": "faible" | "moyenne" | "élevée", "conseil": "une phrase courte en français"}
Noms des aliments en français. Si la photo ne montre pas de nourriture, renvoie "aliments": [].`;

// Réduit la photo (1024 px max, JPEG) pour aller vite et consommer peu
function shrinkImage(file, max = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
    img.src = url;
  });
}

async function analyzeFoodPhoto(dataUrl, hint) {
  const key = (state.settings.aiKey || "").trim();
  const models = [...new Set([state.settings.aiModel, ...AI_MODELS].filter(Boolean))];
  const body = JSON.stringify({
    contents: [{ parts: [
      { inline_data: { mime_type: "image/jpeg", data: dataUrl.split(",")[1] } },
      { text: AI_PROMPT + (hint ? `\nPrécision donnée par l'utilisateur : ${hint}` : "") },
    ] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });
  let lastErr = "";
  for (const m of models) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body,
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 404) { lastErr = j.error?.message || "modèle introuvable"; continue; } // modèle retiré : on essaie le suivant
    if (!r.ok) {
      const msg = j.error?.message || `erreur ${r.status}`;
      throw new Error(r.status === 400 && /key/i.test(msg) ? "Clé API invalide" : r.status === 429 ? "Trop de photos d'un coup, réessaie dans une minute" : msg);
    }
    if (state.settings.aiModel !== m) { state.settings.aiModel = m; save(); }
    const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    const out = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim());
    return {
      plat: out.plat || "Repas", confiance: out.confiance || "", conseil: out.conseil || "",
      items: (out.aliments || []).map((a) => ({
        on: true, nom: String(a.nom || "Aliment"), g: Math.round(num(a.grammes)) || 100,
        k: r1(num(a.kcal_100g)), p: r1(num(a.proteines_100g)), c: r1(num(a.glucides_100g)), f: r1(num(a.lipides_100g)),
      })).filter((a) => a.k > 0),
    };
  }
  throw new Error("Aucun modèle Gemini disponible (" + lastErr + ")");
}

const foodAI = { items: [], meal: "dej", photo: null };

function photoTabHtml(meal) {
  if (!state.settings.aiKey) {
    return `<div class="card" style="margin:0"><h3>📸 Analyse de photo par IA</h3>
      <p class="small">Prends ton assiette en photo : l'IA reconnaît les aliments, estime les quantités et calcule les calories. Ça utilise <b>Gemini</b> de Google, <b>gratuit</b> avec une clé personnelle (2 minutes, une seule fois) :</p>
      <ol class="steps small">
        <li>Va sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> et connecte-toi avec ton compte Google.</li>
        <li>Touche <b>« Create API key »</b> (Créer une clé), puis copie-la.</li>
        <li>Colle-la ici :</li>
      </ol>
      <input id="aiKeyIn" placeholder="AIza…" autocomplete="off" autocapitalize="off" spellcheck="false">
      <button class="btn primary block" style="margin-top:10px" data-act="ai-key-save" data-meal="${meal}">Enregistrer la clé</button>
      <p class="muted small" style="margin-bottom:0">La clé reste sur ton téléphone (elle n'est pas mise dans les sauvegardes). Les photos sont envoyées à Google pour l'analyse. Le quota gratuit suffit largement pour quelques repas par jour.</p></div>`;
  }
  return `<div class="stack">
    <label class="field">Précision (optionnel)<input id="aiHint" placeholder="Ex : menu Big Mac, sauce à part, plat maison…"></label>
    <label class="btn primary block big photo-btn">📸 Prendre / choisir une photo<input type="file" accept="image/*" capture="environment" id="aiPhoto" hidden></label>
    <div id="aiOut"></div>
    <p class="muted small center" style="margin:0">Estimation de l'IA : vérifie les quantités avant d'ajouter. · <a href="#" data-act="ai-key-reset">Changer de clé</a></p></div>`;
}

function aiResultHtml(res) {
  const tot = foodAI.items.filter((x) => x.on).reduce((a, x) => a + (x.k * x.g) / 100, 0);
  return `${foodAI.photo ? `<img src="${foodAI.photo}" alt="" class="ai-photo">` : ""}
    <div class="row between" style="margin:10px 0 4px"><b>${esc(res.plat)}</b>${res.confiance ? `<span class="eq ${res.confiance === "élevée" ? "machine" : res.confiance === "faible" ? "" : "home"}">confiance ${esc(res.confiance)}</span>` : ""}</div>
    ${foodAI.items.length ? `<div class="card list-card" style="margin:0">${foodAI.items.map((x, i) => `<div class="ai-item ${x.on ? "" : "off"}">
      <input type="checkbox" class="ai-check" data-in="ai-on" data-i="${i}" ${x.on ? "checked" : ""}>
      <div class="grow"><b>${esc(x.nom)}</b><div class="muted small">${x.k} kcal/100 g · P ${x.p} · G ${x.c} · L ${x.f}</div></div>
      <input class="ai-g" data-in="ai-g" data-i="${i}" inputmode="numeric" value="${x.g}"><span class="muted small">g</span>
      <b class="ai-k" id="aiK${i}">${Math.round((x.k * x.g) / 100)}</b></div>`).join("")}</div>
      <div class="row between" style="margin-top:10px"><span class="muted">Total</span><b style="font-size:22px" id="aiTot">${Math.round(tot)} kcal</b></div>
      ${res.conseil ? `<p class="small muted">💡 ${esc(res.conseil)}</p>` : ""}
      <button class="btn primary block" data-act="ai-add">Ajouter au repas</button>`
    : `<div class="empty">L'IA n'a pas reconnu d'aliment sur cette photo. Essaie une photo plus nette, de plus près, ou ajoute une précision.</div>`}`;
}

async function onFoodPhoto(file) {
  const out = $("aiOut");
  out.innerHTML = `<div class="empty"><span class="big spin">🔍</span>Analyse de la photo…</div>`;
  try {
    foodAI.photo = await shrinkImage(file);
    out.innerHTML = `<img src="${foodAI.photo}" alt="" class="ai-photo"><div class="empty"><span class="big spin">🔍</span>L'IA regarde ton assiette…</div>`;
    const res = await analyzeFoodPhoto(foodAI.photo, $("aiHint")?.value.trim());
    foodAI.items = res.items; foodAI.res = res;
    if ($("aiOut")) $("aiOut").innerHTML = aiResultHtml(res);
  } catch (e) {
    if ($("aiOut")) $("aiOut").innerHTML = `${foodAI.photo ? `<img src="${foodAI.photo}" alt="" class="ai-photo">` : ""}
      <p class="center" style="color:var(--red)">😕 ${esc(navigator.onLine ? e.message : "Pas de connexion internet")}</p>`;
  }
}
