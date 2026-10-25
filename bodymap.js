// Schéma anatomique (face + dos), proportions réelles (~8 têtes de haut).
// Rouge = muscle principal, rose = muscle secondaire.
// Les formes sont dessinées pour la moitié gauche du corps puis copiées en miroir.

const BODY_COLORS = { main: "#ef2b45", sec: "#ff8fa0", off: "#353b48", line: "#0e1015", skin1: "#2c313c", skin2: "#20242c" };

const MUSCLE_ANAT = {
  cou: "Sterno-cléido-mastoïdien",
  trapezes: "Trapèzes",
  epaules: "Deltoïdes (antérieur + latéral)",
  epaules_arr: "Deltoïdes postérieurs",
  pecs: "Grand pectoral",
  biceps: "Biceps brachial",
  triceps: "Triceps brachial",
  avant_bras: "Avant-bras (fléchisseurs / extenseurs)",
  abdos: "Grand droit (abdos)",
  obliques: "Obliques + dentelé",
  dos: "Grand dorsal",
  dos_milieu: "Sous-épineux, grand rond, rhomboïdes",
  lombaires: "Érecteurs du rachis (lombaires)",
  fessiers: "Grand fessier",
  abducteurs: "Moyen fessier",
  adducteurs: "Adducteurs",
  quadriceps: "Quadriceps (droit fémoral + vastes)",
  ischios: "Ischio-jambiers (biceps fémoral, semi-tendineux)",
  mollets: "Mollets (gastrocnémiens, soléaire)",
};

// Silhouette (peau) : remplit les espaces entre les muscles
const BODY_SILHOUETTE = {
  front: `<ellipse cx="100" cy="34" rx="18" ry="24"/>
    <path d="M90 52 C90 62 87 70 82 76 L118 76 C113 70 110 62 110 52 Z"/>
    <path d="M56 80 C78 72 122 72 144 80 L149 126 C147 160 141 190 141 214 C131 230 113 238 100 240 C87 238 69 230 59 214 C59 190 53 160 51 126 Z"/>
    <path d="M45 118 C35 140 35 160 39 170 C33 186 28 204 27 216 C25 228 25 240 29 247 C33 251 37 249 38 243 C39 234 39 224 39 218 C45 202 51 188 55 172 C58 152 57 132 53 118 Z"/>
    <path d="M61 210 C55 250 57 300 66 322 C58 350 58 380 63 408 C61 414 59 420 60 424 C66 428 76 428 81 426 C82 420 80 414 78 408 C84 380 86 350 84 330 C94 300 99 260 99 226 Z"/>`,
  back: `<ellipse cx="100" cy="33" rx="18" ry="24"/>
    <path d="M90 52 C90 62 87 70 82 76 L118 76 C113 70 110 62 110 52 Z"/>
    <path d="M56 80 C78 72 122 72 144 80 L149 126 C147 160 141 190 141 214 C131 230 113 238 100 240 C87 238 69 230 59 214 C59 190 53 160 51 126 Z"/>
    <path d="M45 118 C35 140 35 160 39 170 C33 186 28 204 27 216 C25 228 25 240 29 247 C33 251 37 249 38 243 C39 234 39 224 39 218 C45 202 51 188 55 172 C58 152 57 132 53 118 Z"/>
    <path d="M61 206 C55 250 57 300 66 322 C58 350 58 380 63 404 C62 412 60 420 61 424 C66 428 76 428 80 425 C80 418 79 410 78 404 C84 380 86 350 84 330 C94 300 99 260 99 222 Z"/>`,
};

const BODY_FRONT = {
  cou: ["M93 56 C94 64 97 71 99 78 L96 79 C92 72 90 64 90 57 Z"],
  trapezes: ["M90 66 C84 72 72 76 58 80 C66 83 78 83 88 80 C90 76 91 71 90 66 Z"],
  epaules: [
    "M60 80 C67 81 71 87 69 94 C66 101 60 107 54 113 C51 104 51 94 54 87 C56 83 58 81 60 80 Z", // antérieur
    "M58 80 C47 82 40 92 40 105 C40 114 42 122 46 128 C48 120 51 115 54 113 C51 104 51 94 54 87 C55 84 56 82 58 80 Z", // latéral
  ],
  pecs: [
    "M71 84 C80 82 91 82 99 84 L99 98 C88 98 76 99 64 102 C65 95 67 89 71 84 Z", // faisceau claviculaire
    "M64 102 C76 99 88 98 99 98 L99 127 C92 132 82 134 72 130 C64 126 58 119 56 112 C58 108 61 105 64 102 Z", // faisceau sternal
  ],
  obliques: [
    "M60 120 C64 123 68 127 70 131 L66 134 C62 131 59 127 58 123 Z", "M61 134 C65 136 69 138 71 141 L67 144 C64 142 62 139 61 136 Z", "M63 146 C66 147 69 149 71 152 L68 155 C66 153 64 150 63 148 Z", // dentelé
    "M73 133 C80 137 84 144 84 152 L84 200 C80 204 74 202 70 196 C66 186 64 172 64 158 C64 148 68 139 73 133 Z",
  ],
  abdos: [
    "M86.5 132 C90 131 94 131 98 132 L98 146 L86.5 146 Z", "M86.5 149 L98 149 L98 163 L86.5 163 Z", "M86.5 166 L98 166 L98 180 L86.5 180 Z",
    "M86.5 183 L98 183 L98 216 C93 214 89 208 86.5 198 Z",
  ],
  biceps: ["M46 128 C40 138 38 152 40 164 C44 170 50 168 54 160 C57 148 56 136 52 126 C50 124 48 125 46 128 Z"],
  avant_bras: [
    "M40 169 C34 183 30 199 28 214 C30 220 34 222 38 218 C44 204 49 189 53 173 C49 173 44 172 40 169 Z",
    "M54 162 C58 168 56 178 52 188 C48 198 44 206 40 212 C42 196 46 180 51 166 Z",
  ],
  quadriceps: [
    "M65 214 C57 236 55 262 57 286 C59 300 63 310 69 316 C71 304 71 292 69 280 C67 260 69 236 73 220 Z", // vaste latéral
    "M74 219 C80 213 88 215 90 223 C92 250 88 280 82 306 C80 312 76 314 74 310 C72 290 70 262 72 238 C72 230 73 224 74 219 Z", // droit fémoral
    "M88 272 C94 282 94 299 88 311 C84 317 78 317 76 312 C82 303 86 289 88 272 Z", // vaste médial
  ],
  adducteurs: ["M91 222 C96 226 98 232 98 240 L96 268 C94 278 90 280 88 274 C90 258 92 240 91 222 Z"],
  mollets: [
    "M60 336 C55 352 55 372 60 390 C63 397 68 396 70 390 C70 372 70 354 69 338 Z", // gastrocnémien externe
    "M70 338 C77 346 79 364 78 386 C78 396 76 403 74 407 L70 407 C72 392 72 370 70 342 Z", // jambier antérieur
    "M79 338 C86 350 87 372 82 392 L78 392 C80 372 80 354 79 338 Z", // gastrocnémien interne
  ],
};
const BODY_BACK = {
  trapezes: [
    "M92 54 C88 64 78 72 60 80 C70 83 80 86 88 90 L99 92 L99 54 Z", // supérieur
    "M88 90 L99 92 L99 158 C95 146 91 130 88 116 C86 106 86 97 88 90 Z", // moyen / inférieur
  ],
  epaules_arr: ["M60 80 C49 82 41 92 41 105 C41 113 43 121 46 127 C50 116 56 106 63 100 C68 94 69 87 66 82 C64 81 62 80 60 80 Z"],
  dos_milieu: [
    "M66 95 C75 93 83 99 86 108 C87 116 82 122 74 123 C67 120 63 112 63 104 C63 100 64 97 66 95 Z", // sous-épineux
    "M63 117 C70 123 78 126 85 124 C83 132 76 136 68 134 C64 130 62 124 63 117 Z", // grand rond
  ],
  dos: ["M62 128 C70 136 80 138 88 136 C94 150 97 166 99 180 L99 188 C92 200 82 206 74 202 C68 188 64 168 62 150 C61 140 61 134 62 128 Z"],
  lombaires: ["M89 166 C92 164 96 164 98 166 L98 216 C94 218 90 216 88 212 C86 198 86 182 89 166 Z"],
  triceps: [
    "M42 124 C36 136 36 150 40 162 C44 166 48 164 50 158 C48 146 46 134 44 126 Z", // chef latéral
    "M46 126 C52 132 56 144 54 156 C52 164 48 166 46 162 C48 150 48 138 46 126 Z", // chef long
  ],
  avant_bras: [
    "M40 169 C34 183 30 199 28 214 C30 220 34 222 38 218 C44 204 49 189 53 173 C49 173 44 172 40 169 Z",
    "M54 162 C58 168 56 178 52 188 C48 198 44 206 40 212 C42 196 46 180 51 166 Z",
  ],
  abducteurs: ["M63 199 C72 193 84 193 92 197 C86 205 76 211 66 215 Z"],
  fessiers: ["M66 213 C78 203 92 203 99 209 L99 253 C90 263 76 265 68 257 C62 247 62 227 66 213 Z"],
  adducteurs: ["M92 254 L98 252 L96 276 C94 270 92 262 92 254 Z"],
  ischios: [
    "M64 262 C60 284 62 306 68 320 C72 324 76 320 76 314 C76 296 76 278 78 264 Z", // biceps fémoral
    "M78 264 C88 268 94 266 96 262 C96 284 94 306 86 322 C82 326 78 322 76 316 C78 298 80 280 78 264 Z", // semi-tendineux
  ],
  mollets: [
    "M62 332 C56 348 56 366 62 380 C66 386 72 382 72 374 C72 358 72 342 70 332 Z", // gastrocnémien externe
    "M70 332 C80 334 86 346 86 362 C86 376 80 384 74 382 C72 366 72 348 70 332 Z", // gastrocnémien interne
    "M63 383 C69 391 79 391 84 383 L80 399 L67 399 Z", // soléaire
  ],
};
// Stries des fibres musculaires (relief)
const BODY_FIBERS = {
  front: "M73 88 C82 87 91 87 98 88 M68 94 C80 92 90 92 98 93 M62 108 C76 106 88 106 98 107 M60 114 C74 114 86 114 98 115 M64 121 C76 123 88 124 97 122 M56 90 C52 98 52 106 54 112 M46 96 C44 106 44 116 46 124 M44 140 C43 150 44 158 46 164 M78 228 C78 256 79 282 79 300 M62 240 C60 262 62 286 66 304 M66 350 C64 366 64 378 66 388",
  back: "M90 62 C84 70 76 76 66 80 M94 72 C88 78 82 84 76 88 M70 104 C74 108 80 112 84 114 M68 142 C74 160 82 178 90 192 M72 136 C80 150 88 166 94 180 M92 172 L92 212 M95 172 L95 214 M70 222 C82 218 92 220 98 224 M68 236 C80 234 92 236 98 240 M68 248 C78 252 90 252 98 250 M68 280 C68 298 70 310 72 316 M86 280 C86 298 84 310 82 316 M66 344 C64 356 64 368 66 376 M78 344 C80 356 80 368 78 376",
};
// Lignes de détail sur la peau (clavicules, rotules, nombril…)
const BODY_DETAIL = {
  front: "M84 80 C76 79 68 80 61 82 M116 80 C124 79 132 80 139 82 M100 186 C99 188 99 190 100 191 M72 322 C74 326 80 326 82 322 M118 322 C120 326 126 326 128 322",
  back: "M100 60 L100 238 M70 326 C74 330 80 330 84 326 M116 326 C120 330 126 330 130 326",
};
// Point d'ancrage des étiquettes (moitié gauche du corps)
const BODY_ANCHORS = {
  front: { cou: [94, 66], trapezes: [78, 78], epaules: [48, 100], pecs: [80, 110], obliques: [74, 168], abdos: [92, 156], biceps: [46, 146], avant_bras: [40, 192], quadriceps: [74, 262], adducteurs: [93, 246], mollets: [66, 364] },
  back: { trapezes: [94, 74], epaules_arr: [50, 96], dos_milieu: [74, 108], dos: [76, 160], lombaires: [93, 192], triceps: [44, 144], avant_bras: [40, 192], abducteurs: [76, 202], fessiers: [84, 234], ischios: [76, 292], mollets: [72, 356], adducteurs: [95, 266] },
};

const BODY_DEFS = `<defs>
  <linearGradient id="bmMain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4b5f"/><stop offset="1" stop-color="#c8102e"/></linearGradient>
  <linearGradient id="bmSec" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3bf"/><stop offset="1" stop-color="#f27a8d"/></linearGradient>
  <linearGradient id="bmOff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d4452"/><stop offset="1" stop-color="#2d323d"/></linearGradient>
  <linearGradient id="bmSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BODY_COLORS.skin1}"/><stop offset="1" stop-color="${BODY_COLORS.skin2}"/></linearGradient>
</defs>`;

function bodySvg(view, main, sec, opts = {}) {
  const shapes = view === "front" ? BODY_FRONT : BODY_BACK;
  const fill = (m) => (main.has(m) ? "url(#bmMain)" : sec.has(m) ? "url(#bmSec)" : "url(#bmOff)");
  const half = Object.entries(shapes).map(([m, paths]) => paths.map((d) => `<path d="${d}" fill="${fill(m)}"><title>${MUSCLE_ANAT[m] || ""}</title></path>`).join("")).join("") +
    `<path d="${BODY_FIBERS[view]}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width=".7" stroke-linecap="round"/>`;
  let labels = "", vb = "10 2 180 432";
  if (opts.labels) {
    // Étiquettes à gauche et à droite du corps, reliées au muscle par un trait
    vb = "-118 -2 436 436";
    const items = Object.entries(BODY_ANCHORS[view]).filter(([m]) => main.has(m) || sec.has(m) || opts.all).sort((a, b) => a[1][1] - b[1][1]);
    const sides = [[], []];
    items.forEach((it, i) => sides[i % 2].push(it));
    sides.forEach((list, side) => {
      let lastY = -99;
      for (const [m, [ax, ay]] of list) {
        const x = side ? 200 - ax : ax;
        const y = Math.max(ay, lastY + 30); lastY = y;
        const tx = side ? 212 : -12;
        const col = main.has(m) ? BODY_COLORS.main : sec.has(m) ? BODY_COLORS.sec : "#8b92a3";
        labels += `<circle cx="${x}" cy="${ay}" r="3.2" fill="#fff" stroke="${BODY_COLORS.line}"/>
          <path d="M${x} ${ay} L${side ? 202 : -2} ${y} L${tx} ${y}" fill="none" stroke="${col}" stroke-width="1.2"/>
          <text x="${tx + (side ? 4 : -4)}" y="${y + 4}" text-anchor="${side ? "start" : "end"}" fill="${col}" font-size="12.5" font-weight="700">${MUSCLES[m] || m}</text>`;
      }
    });
  }
  return `<svg viewBox="${vb}" role="img" aria-label="Schéma des muscles, vue ${view === "front" ? "de face" : "de dos"}">${BODY_DEFS}
    <g fill="url(#bmSkin)">${BODY_SILHOUETTE[view]}<g transform="translate(200 0) scale(-1 1)">${BODY_SILHOUETTE[view].replace(/<ellipse[^>]*\/>/, "")}</g></g>
    <g stroke="${BODY_COLORS.line}" stroke-width="1.1" stroke-linejoin="round">${half}<g transform="translate(200 0) scale(-1 1)">${half}</g></g>
    <path d="${BODY_DETAIL[view]}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="1" stroke-linecap="round"/>
    ${labels}
  </svg>`;
}

// Petits schémas face + dos ; on touche pour ouvrir la vue détaillée
const BODY_REG = [];
function bodyMap(ex) {
  const main = new Set(ex.muscles), sec = new Set(ex.secondaires);
  const heart = ex.muscles.includes("cardio") || ex.secondaires.includes("cardio");
  BODY_REG.push(ex);
  return `<div class="bodymap" data-act="body-zoom" data-i="${BODY_REG.length - 1}">
    <figure>${bodySvg("front", main, sec)}<figcaption>Face</figcaption></figure>
    <figure>${bodySvg("back", main, sec)}<figcaption>Dos</figcaption></figure>
    <span class="zoom-hint">🔍 Schéma détaillé</span>
  </div>
  <div class="body-legend"><span><i style="background:${BODY_COLORS.main}"></i>Principal</span><span><i style="background:${BODY_COLORS.sec}"></i>Secondaire</span>${heart ? "<span>❤️ Cardio</span>" : ""}</div>`;
}

// Vue détaillée : grand schéma avec le nom de chaque muscle
function bodyDetailHtml(ex, view, all) {
  const main = new Set(ex.muscles), sec = new Set(ex.secondaires);
  const list = (set, cls) => [...set].filter((m) => MUSCLE_ANAT[m]).map((m) => `<li><span class="tag ${cls}">${MUSCLES[m]}</span> <span class="muted small">${MUSCLE_ANAT[m]}</span></li>`).join("");
  return `<div class="seg" style="margin-bottom:10px">
      <button class="${view === "front" ? "on" : ""}" data-act="body-view" data-v="front">Face</button>
      <button class="${view === "back" ? "on" : ""}" data-act="body-view" data-v="back">Dos</button>
      <button class="${all ? "on" : ""}" data-act="body-all">Tous les noms</button></div>
    <div class="body-detail">${bodySvg(view, main, sec, { labels: true, all })}</div>
    <ul class="anat-list">${list(main, "main")}${list(new Set([...sec].filter((m) => !main.has(m))), "sec")}</ul>`;
}
