// Silhouette anatomique (face + dos) avec les muscles travaillés colorés.
// Vert = muscle principal, jaune = muscle secondaire.
// Les formes sont dessinées pour la moitié gauche puis copiées en miroir.

const BODY_COLORS = { main: "#22c55e", sec: "#facc15", off: "#3b4252", skin: "#2a2f3a", line: "#14161b" };

const BODY_FRONT = {
  trapezes: ["M88 66 Q74 74 60 80 L66 86 Q80 82 92 76 Z"],
  epaules: ["M58 82 Q42 84 36 100 Q34 116 40 128 Q48 112 60 104 Q68 96 68 88 Z"],
  pecs: ["M70 88 Q84 82 98 86 L98 124 Q86 132 70 128 Q56 122 54 110 Q60 96 70 88 Z"],
  biceps: ["M38 132 Q32 152 34 172 Q42 180 50 172 Q56 150 52 130 Q46 124 38 132 Z"],
  avant_bras: ["M34 180 Q26 206 26 236 Q32 242 38 238 Q50 210 52 180 Q42 186 34 180 Z"],
  abdos: ["M84 132 h13 v17 h-13 Z", "M84 152 h13 v17 h-13 Z", "M84 172 h13 v18 h-13 Z", "M84 194 L97 194 L97 228 Q90 226 84 214 Z"],
  obliques: ["M68 132 Q78 136 81 146 L81 214 Q72 204 66 190 Q62 160 68 132 Z"],
  quadriceps: ["M64 224 Q54 262 58 304 Q66 318 80 314 Q90 290 90 250 Q82 234 64 224 Z"],
  adducteurs: ["M86 238 Q94 236 98 240 L96 280 Q90 288 84 286 Q90 262 86 238 Z"],
  mollets: ["M60 338 Q54 360 60 392 L72 394 Q80 364 80 338 Q70 344 60 338 Z"],
};
const BODY_BACK = {
  trapezes: ["M90 58 Q80 74 58 82 Q70 92 82 100 L99 128 L99 58 Z"],
  epaules_arr: ["M58 82 Q42 84 36 100 Q34 116 40 128 Q48 112 60 104 Q68 96 68 88 Z"],
  dos_milieu: ["M80 106 L98 134 L98 162 Q86 152 76 124 Q76 112 80 106 Z"],
  dos: ["M60 108 Q72 104 74 124 Q84 154 98 168 L98 176 Q88 196 76 196 Q64 170 60 108 Z"],
  lombaires: ["M80 182 Q90 178 98 182 L98 214 Q90 214 80 208 Z"],
  triceps: ["M38 132 Q32 152 34 172 Q42 180 50 172 Q56 150 52 130 Q46 124 38 132 Z"],
  avant_bras: ["M34 180 Q26 206 26 236 Q32 242 38 238 Q50 210 52 180 Q42 186 34 180 Z"],
  abducteurs: ["M62 204 Q74 198 84 202 Q78 214 64 222 Z"],
  fessiers: ["M66 216 Q84 208 99 216 L99 252 Q84 264 68 254 Q60 234 66 216 Z"],
  ischios: ["M62 262 Q56 290 62 316 Q74 324 84 316 Q94 290 96 262 Q84 272 62 262 Z"],
  mollets: ["M60 334 Q52 352 60 376 Q68 384 78 374 Q84 352 78 334 Q70 340 60 334 Z"],
};
// Parties sans muscle ciblé (tête, mains, genoux, pieds…)
const BODY_SKIN = {
  front: `<path d="M58 82 Q100 66 142 82 L146 128 L136 214 Q100 238 64 214 L54 128 Z"/><ellipse cx="100" cy="34" rx="19" ry="24"/><path d="M89 54 L111 54 L114 72 L86 72 Z"/>
    <ellipse cx="30" cy="252" rx="7" ry="12"/><ellipse cx="170" cy="252" rx="7" ry="12"/>
    <ellipse cx="72" cy="326" rx="9" ry="8"/><ellipse cx="128" cy="326" rx="9" ry="8"/>
    <ellipse cx="66" cy="404" rx="10" ry="6"/><ellipse cx="134" cy="404" rx="10" ry="6"/>
    <path d="M66 214 Q82 226 100 232 Q118 226 134 214 L132 226 Q116 238 100 240 Q84 238 68 226 Z"/>`,
  back: `<path d="M58 82 Q100 66 142 82 L146 128 L136 214 Q100 238 64 214 L54 128 Z"/><ellipse cx="100" cy="34" rx="19" ry="24"/><path d="M89 54 L111 54 L114 72 L86 72 Z"/>
    <ellipse cx="30" cy="252" rx="7" ry="12"/><ellipse cx="170" cy="252" rx="7" ry="12"/>
    <ellipse cx="72" cy="326" rx="9" ry="8"/><ellipse cx="128" cy="326" rx="9" ry="8"/>
    <path d="M64 378 Q70 388 76 378 L74 398 L64 398 Z"/><path d="M136 378 Q130 388 124 378 L126 398 L136 398 Z"/>
    <ellipse cx="68" cy="404" rx="10" ry="6"/><ellipse cx="132" cy="404" rx="10" ry="6"/>`,
};

function bodySvg(shapes, skin, main, sec) {
  const color = (m) => (main.has(m) ? BODY_COLORS.main : sec.has(m) ? BODY_COLORS.sec : BODY_COLORS.off);
  const half = Object.entries(shapes).map(([m, paths]) => paths.map((d) => `<path d="${d}" fill="${color(m)}"/>`).join("")).join("");
  return `<svg viewBox="0 0 200 420" role="img">
    <g fill="${BODY_COLORS.skin}">${skin}</g>
    <g stroke="${BODY_COLORS.line}" stroke-width="1.6" stroke-linejoin="round">${half}<g transform="translate(200 0) scale(-1 1)">${half}</g></g>
  </svg>`;
}

function bodyMap(ex) {
  const main = new Set(ex.muscles), sec = new Set(ex.secondaires);
  const heart = ex.muscles.includes("cardio") || ex.secondaires.includes("cardio");
  return `<div class="bodymap">
    <figure>${bodySvg(BODY_FRONT, BODY_SKIN.front, main, sec)}<figcaption>Face</figcaption></figure>
    <figure>${bodySvg(BODY_BACK, BODY_SKIN.back, main, sec)}<figcaption>Dos</figcaption></figure>
  </div>
  <div class="body-legend"><span><i style="background:${BODY_COLORS.main}"></i>Principal</span><span><i style="background:${BODY_COLORS.sec}"></i>Secondaire</span>${heart ? "<span>❤️ Cardio</span>" : ""}</div>`;
}
