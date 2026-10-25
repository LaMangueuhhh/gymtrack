// Schéma anatomique (face + dos) avec les muscles travaillés colorés.
// Vert = muscle principal, jaune = muscle secondaire.
// Chaque muscle est découpé en plusieurs chefs (ex : deltoïde antérieur + latéral, 3 chefs du quadriceps…).
// Les formes sont dessinées pour la moitié gauche du corps puis copiées en miroir.

const BODY_COLORS = { main: "#22c55e", sec: "#facc15", off: "#363c4a", skin: "#262b35", line: "#101217", fiber: "rgba(0,0,0,.22)" };

// Noms anatomiques affichés dans le schéma détaillé
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
  dos_milieu: "Rhomboïdes, grand rond, sous-épineux",
  lombaires: "Érecteurs du rachis (lombaires)",
  fessiers: "Grand fessier",
  abducteurs: "Moyen fessier",
  adducteurs: "Adducteurs",
  quadriceps: "Quadriceps (droit fémoral + vastes)",
  ischios: "Ischio-jambiers (biceps fémoral, semi-tendineux)",
  mollets: "Mollets (gastrocnémiens, soléaire)",
};

const BODY_FRONT = {
  cou: ["M92 52 L97 53 L95 68 L89 66 Z"],
  trapezes: ["M88 62 Q76 68 62 72 L66 79 Q80 75 90 69 Z"],
  epaules: [
    "M66 77 Q56 76 50 84 Q46 94 49 106 Q55 97 63 91 Q70 85 68 79 Z", // antérieur
    "M49 84 Q39 89 37 102 Q37 113 41 120 Q45 108 49 106 Q46 95 49 84 Z", // latéral
  ],
  pecs: [
    "M68 81 Q84 77 99 79 L99 95 Q84 95 67 95 Q61 91 64 85 Z", // faisceau claviculaire
    "M65 95 Q84 97 99 97 L99 117 Q88 125 74 123 Q60 119 55 109 Q57 100 65 95 Z", // faisceau sternal
  ],
  obliques: [
    "M59 117 Q65 120 70 126 L66 131 Q60 127 57 122 Z", "M61 131 L70 133 L68 139 L61 137 Z", "M63 141 L71 141 L70 147 L64 146 Z", // dentelé
    "M71 128 Q80 132 83 142 L83 199 Q74 191 67 179 Q63 154 71 128 Z",
  ],
  abdos: ["M86 124 h12 v14 h-12 Z", "M86 141 h12 v15 h-12 Z", "M86 159 h12 v15 h-12 Z", "M86 177 L98 177 L98 210 Q92 208 86 196 Z"],
  biceps: ["M42 121 Q35 136 36 156 Q41 166 49 161 Q55 144 52 126 Q48 119 42 121 Z"],
  avant_bras: [
    "M37 166 Q29 186 28 212 Q32 220 37 216 Q45 194 50 168 Q44 172 37 166 Z",
    "M50 162 Q55 167 53 174 Q47 186 40 198 Q42 181 46 168 Z",
  ],
  quadriceps: [
    "M64 213 Q55 240 55 270 Q57 296 69 312 Q74 300 74 290 Q67 260 71 222 Z", // vaste latéral
    "M73 220 Q80 214 86 221 Q88 259 82 295 Q78 300 74 296 Q70 259 73 220 Z", // droit fémoral
    "M84 268 Q92 282 88 303 Q82 313 76 308 Q82 296 84 268 Z", // vaste médial
  ],
  adducteurs: ["M87 221 Q96 225 98 231 L96 268 Q90 276 86 272 Q89 249 87 221 Z"],
  mollets: [
    "M63 335 Q57 356 61 384 L69 386 Q67 360 69 337 Z", // gastrocnémien
    "M71 335 Q79 350 77 388 L71 390 Q71 360 69 337 Z", // jambier antérieur
  ],
};
const BODY_BACK = {
  cou: [],
  trapezes: [
    "M90 52 Q84 64 62 72 Q74 79 84 81 L99 85 L99 52 Z", // supérieur
    "M99 126 L99 160 Q93 148 87 131 Q84 117 82 103 Q90 118 99 126 Z", // inférieur
  ],
  dos_milieu: [
    "M84 83 L99 87 L99 125 Q90 117 82 101 Z", // rhomboïdes
    "M63 87 Q76 87 81 101 Q82 111 76 117 Q66 111 62 99 Z", // sous-épineux / grand rond
  ],
  epaules_arr: ["M62 72 Q48 74 40 86 Q36 98 40 112 Q48 99 58 93 Q64 87 64 79 Z"],
  epaules: ["M40 86 Q35 92 35 103 L40 112 Z"],
  dos: ["M61 99 Q66 111 76 118 Q86 126 92 146 Q96 161 99 173 L99 179 Q90 195 78 197 Q66 175 62 140 Q58 117 61 99 Z"],
  lombaires: ["M85 170 Q92 166 98 170 L98 214 Q92 214 85 206 Q81 189 85 170 Z"],
  triceps: [
    "M38 119 Q32 135 34 155 Q40 163 45 157 Q45 139 43 123 Z", // chef latéral
    "M44 123 Q50 131 52 149 Q50 161 46 159 Q46 139 44 123 Z", // chef long
  ],
  avant_bras: [
    "M37 166 Q29 186 28 212 Q32 220 37 216 Q45 194 50 168 Q44 172 37 166 Z",
    "M50 162 Q55 167 53 174 Q47 186 40 198 Q42 181 46 168 Z",
  ],
  abducteurs: ["M62 199 Q74 193 86 197 Q80 209 66 217 Z"],
  fessiers: ["M66 213 Q84 203 99 211 L99 253 Q86 265 70 257 Q60 237 66 213 Z"],
  adducteurs: ["M90 258 L98 256 L96 274 Z"],
  ischios: [
    "M62 263 Q56 289 62 317 Q70 323 76 317 Q78 289 78 267 Z", // biceps fémoral
    "M78 267 Q92 269 96 265 Q96 295 86 319 Q80 323 76 317 Q80 291 78 267 Z", // semi-tendineux
  ],
  mollets: [
    "M60 331 Q54 351 60 373 Q66 379 72 371 Q72 349 70 331 Z", // gastrocnémien latéral
    "M70 331 Q82 335 82 353 Q80 371 72 371 Q72 349 70 331 Z", // gastrocnémien médial
    "M62 375 Q68 383 78 377 L76 393 L66 393 Z", // soléaire
  ],
};
// Stries des fibres musculaires (décoratif, donne du relief)
const BODY_FIBERS = {
  front: "M70 86 Q84 84 97 86 M68 90 Q84 89 97 91 M64 101 Q80 104 97 103 M62 108 Q78 112 97 109 M64 115 Q78 118 92 117 M53 92 Q49 100 50 106 M43 98 Q41 106 42 114 M78 230 Q78 260 79 290 M62 240 Q60 268 66 300 M40 132 Q39 146 42 158",
  back: "M90 60 Q80 70 68 74 M94 70 Q86 76 76 80 M70 120 Q80 140 92 160 M66 130 Q74 160 84 186 M90 176 L90 210 M94 176 L94 212 M70 222 Q84 220 96 226 M68 236 Q84 236 97 240 M68 280 Q68 300 70 314 M86 280 Q86 300 82 314",
};
// Parties sans muscle ciblé (tête, mains, genoux, pieds…)
const BODY_SKIN = {
  front: `<path d="M57 78 Q100 62 143 78 L147 126 L137 212 Q100 236 63 212 L53 126 Z"/><ellipse cx="100" cy="32" rx="17" ry="22"/><path d="M89 50 L111 50 L113 68 L87 68 Z"/>
    <ellipse cx="30" cy="232" rx="7" ry="13"/><ellipse cx="170" cy="232" rx="7" ry="13"/>
    <ellipse cx="74" cy="322" rx="9" ry="9"/><ellipse cx="126" cy="322" rx="9" ry="9"/>
    <ellipse cx="68" cy="400" rx="10" ry="6"/><ellipse cx="132" cy="400" rx="10" ry="6"/>
    <path d="M65 206 Q82 222 100 228 Q118 222 135 206 L133 220 Q116 234 100 236 Q84 234 67 220 Z"/>`,
  back: `<path d="M57 78 Q100 62 143 78 L147 126 L137 212 Q100 236 63 212 L53 126 Z"/><ellipse cx="100" cy="32" rx="17" ry="22"/><path d="M89 50 L111 50 L113 68 L87 68 Z"/>
    <ellipse cx="30" cy="232" rx="7" ry="13"/><ellipse cx="170" cy="232" rx="7" ry="13"/>
    <ellipse cx="74" cy="322" rx="9" ry="9"/><ellipse cx="126" cy="322" rx="9" ry="9"/>
    <path d="M66 380 Q71 390 76 380 L74 396 L66 396 Z"/><path d="M134 380 Q129 390 124 380 L126 396 L134 396 Z"/>
    <ellipse cx="70" cy="400" rx="10" ry="6"/><ellipse cx="130" cy="400" rx="10" ry="6"/>`,
};
// Point d'ancrage des étiquettes (moitié gauche du corps)
const BODY_ANCHORS = {
  front: { cou: [93, 60], trapezes: [76, 71], epaules: [47, 97], pecs: [80, 104], obliques: [72, 160], abdos: [92, 150], biceps: [45, 142], avant_bras: [38, 192], quadriceps: [72, 262], adducteurs: [92, 246], mollets: [66, 360] },
  back: { trapezes: [92, 66], epaules_arr: [50, 90], dos_milieu: [74, 104], dos: [76, 150], lombaires: [92, 190], triceps: [42, 140], avant_bras: [38, 192], abducteurs: [72, 205], fessiers: [84, 234], ischios: [76, 290], mollets: [70, 352], adducteurs: [94, 264] },
};

function bodySvg(view, main, sec, opts = {}) {
  const shapes = view === "front" ? BODY_FRONT : BODY_BACK;
  const color = (m) => (main.has(m) ? BODY_COLORS.main : sec.has(m) ? BODY_COLORS.sec : BODY_COLORS.off);
  const half = Object.entries(shapes).map(([m, paths]) => paths.map((d) => `<path d="${d}" fill="${color(m)}"><title>${MUSCLE_ANAT[m] || ""}</title></path>`).join("")).join("") +
    `<path d="${BODY_FIBERS[view]}" fill="none" stroke="${BODY_COLORS.fiber}" stroke-width=".8"/>`;
  let labels = "", vb = "0 0 200 410";
  if (opts.labels) {
    // Étiquettes à gauche et à droite du corps, reliées au muscle par un trait
    vb = "-118 -6 436 420";
    const items = Object.entries(BODY_ANCHORS[view]).filter(([m]) => main.has(m) || sec.has(m) || opts.all)
      .sort((a, b) => a[1][1] - b[1][1]);
    const sides = [[], []];
    items.forEach((it, i) => sides[i % 2].push(it));
    sides.forEach((list, side) => {
      let lastY = -99;
      for (const [m, [ax, ay]] of list) {
        const x = side ? 200 - ax : ax;
        const y = Math.max(ay, lastY + 30); lastY = y;
        const tx = side ? 214 : -14, col = main.has(m) ? BODY_COLORS.main : sec.has(m) ? BODY_COLORS.sec : "#8b92a3";
        const name = (MUSCLES[m] || m);
        labels += `<circle cx="${x}" cy="${ay}" r="3.2" fill="#fff" stroke="${BODY_COLORS.line}"/>
          <path d="M${x} ${ay} L${side ? 204 : -4} ${y} L${tx} ${y}" fill="none" stroke="${col}" stroke-width="1.2"/>
          <text x="${tx + (side ? 4 : -4)}" y="${y + 4}" text-anchor="${side ? "start" : "end"}" fill="${col}" font-size="12.5" font-weight="700">${name}</text>`;
      }
    });
  }
  return `<svg viewBox="${vb}" role="img" aria-label="Schéma des muscles, vue ${view === "front" ? "de face" : "de dos"}">
    <g fill="${BODY_COLORS.skin}">${BODY_SKIN[view]}</g>
    <g stroke="${BODY_COLORS.line}" stroke-width="1.4" stroke-linejoin="round">${half}<g transform="translate(200 0) scale(-1 1)">${half}</g></g>
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
