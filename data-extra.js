// Machines de la salle (Fitness Park Flins-sur-Seine : Technogym + Hammer Strength),
// calisthénie et étirements. Chargé après data.js.

Object.assign(MUSCLES, { adducteurs: "Adducteurs", abducteurs: "Moyen fessier", cou: "Cou" });
GROUPES.push("Calisthénie", "Étirements");

// Exercices déjà existants qui se font sur machine / poulie à la salle
const MACHINES_EXISTANTES = {
  pec_deck: "Technogym", tirage_vertical: "Technogym", tirage_horizontal: "Technogym", presse: "Hammer Strength",
  leg_ext: "Technogym", leg_curl: "Technogym", poulie_vis_a_vis: "Poulies", extension_poulie: "Poulies",
  face_pull: "Poulies", crunch_poulie: "Poulies", mollets: "Machine", course_tapis: "Technogym",
  velo: "Technogym", rameur: "Concept2 / Technogym", elliptique: "Technogym",
};
for (const [id, marque] of Object.entries(MACHINES_EXISTANTES)) {
  const ex = EXERCISES.find((e) => e.id === id);
  if (ex) { ex.machine = true; ex.marque = marque; }
}
// Exercices existants qui comptent aussi comme calisthénie
for (const id of ["tractions", "dips", "pompes", "releve_jambes", "gainage", "mountain_climbers"]) {
  const ex = EXERCISES.find((e) => e.id === id);
  if (ex) ex.aussi = ["Calisthénie"];
}

const M = (o) => ({ machine: true, ...o });

EXERCISES.push(
  // ================= MACHINES =================
  M({
    id: "m_chest_press", nom: "Chest press (machine)", groupe: "Pectoraux", type: "force", marque: "Technogym / Hammer Strength",
    img: "Leverage_Chest_Press", materiel: "Machine convergente",
    muscles: ["pecs"], secondaires: ["triceps", "epaules"],
    etapes: ["Règle le siège : poignées à hauteur du milieu des pecs.", "Dos collé au dossier, omoplates serrées.", "Pousse jusqu'aux bras presque tendus.", "Reviens lentement jusqu'à sentir l'étirement des pecs."],
    conseils: ["Parfait pour pousser lourd sans pareur.", "Sur Hammer Strength, tu peux travailler un bras à la fois."],
    erreurs: ["Siège trop haut ou trop bas (ça tire sur les épaules).", "Décoller le dos du dossier."],
  }),
  M({
    id: "m_incline_press", nom: "Presse inclinée Hammer Strength", groupe: "Pectoraux", type: "force", marque: "Hammer Strength",
    img: "Leverage_Incline_Chest_Press", materiel: "Machine à disques",
    muscles: ["pecs"], secondaires: ["epaules", "triceps"],
    etapes: ["Charge les disques des deux côtés.", "Assieds-toi, poignées au niveau du haut des pecs.", "Pousse vers le haut et l'avant.", "Redescends en contrôlant."],
    conseils: ["Cible le haut des pecs.", "Les bras sont indépendants : pousse pareil des deux côtés."],
    erreurs: ["Cambrer fort pour finir les reps."],
  }),
  M({
    id: "m_smith_bench", nom: "Développé couché Smith machine", groupe: "Pectoraux", type: "force", marque: "Smith machine",
    img: "Smith_Machine_Bench_Press", materiel: "Smith machine + banc",
    muscles: ["pecs"], secondaires: ["triceps", "epaules"],
    etapes: ["Place le banc pour que la barre arrive au bas des pecs.", "Déverrouille la barre en tournant les poignets.", "Descends jusqu'à la poitrine, coudes à 45°.", "Pousse puis reverrouille à la fin de la série."],
    conseils: ["Règle les butées de sécurité juste au-dessus de ta poitrine."],
    erreurs: ["Banc mal placé : la barre tombe sur le cou ou le ventre."],
  }),
  M({
    id: "m_high_row", nom: "High row Hammer Strength", groupe: "Dos", type: "force", marque: "Hammer Strength",
    img: "Leverage_High_Row", materiel: "Machine à disques",
    muscles: ["dos"], secondaires: ["dos_milieu", "biceps"],
    etapes: ["Cuisses calées sous le boudin.", "Attrape les poignées en haut, bras tendus.", "Tire vers le bas et l'arrière, coudes le long du corps.", "Remonte lentement."],
    conseils: ["Pense « coudes dans les poches arrière »."],
    erreurs: ["Se pencher en arrière pour tricher."],
  }),
  M({
    id: "m_iso_row", nom: "Rowing machine Hammer Strength", groupe: "Dos", type: "force", marque: "Hammer Strength",
    img: "Leverage_Iso_Row", materiel: "Machine à disques",
    muscles: ["dos_milieu", "dos"], secondaires: ["biceps", "epaules_arr"],
    etapes: ["Poitrine collée au coussin.", "Bras tendus, attrape les poignées.", "Tire en serrant les omoplates.", "Reviens bras tendus en contrôlant."],
    conseils: ["Le coussin protège le bas du dos : tu peux charger."],
    erreurs: ["Décoller la poitrine du coussin."],
  }),
  M({
    id: "m_tbar", nom: "Rowing T-bar", groupe: "Dos", type: "force", marque: "Hammer Strength / landmine",
    img: "T-Bar_Row_with_Handle", materiel: "T-bar ou landmine",
    muscles: ["dos_milieu", "dos"], secondaires: ["biceps", "lombaires", "epaules_arr"],
    etapes: ["Jambes de part et d'autre de la barre, genoux fléchis.", "Dos plat, buste penché à ~45°.", "Tire la poignée vers le ventre.", "Redescends bras tendus."],
    conseils: ["Gaine bien les abdos."],
    erreurs: ["Dos rond.", "Se redresser à chaque rep."],
  }),
  M({
    id: "m_tractions_assist", nom: "Tractions assistées", groupe: "Dos", type: "force", marque: "Technogym", inverse: true,
    img: "Band_Assisted_Pull-Up", materiel: "Machine d'assistance ou élastique",
    muscles: ["dos"], secondaires: ["biceps", "dos_milieu"],
    etapes: ["Choisis le contrepoids (plus c'est lourd, plus c'est facile).", "Genoux sur la plateforme, mains sur les poignées.", "Tire jusqu'au menton au-dessus des poignées.", "Redescends lentement."],
    conseils: ["Note le contrepoids en kg : ta progression, c'est quand il BAISSE."],
    erreurs: ["Descendre en chute libre."],
  }),
  M({
    id: "m_shoulder_press", nom: "Shoulder press (machine)", groupe: "Épaules", type: "force", marque: "Technogym / Hammer Strength",
    img: "Leverage_Shoulder_Press", materiel: "Machine",
    muscles: ["epaules"], secondaires: ["triceps"],
    etapes: ["Règle le siège : poignées au niveau des oreilles.", "Dos collé au dossier.", "Pousse vers le haut sans verrouiller les coudes.", "Redescends jusqu'au menton."],
    conseils: ["Bonne alternative au développé militaire pour les épaules fragiles."],
    erreurs: ["Cambrer en décollant le dos."],
  }),
  M({
    id: "m_reverse_fly", nom: "Oiseau à la machine (reverse pec deck)", groupe: "Épaules", type: "force", marque: "Technogym",
    img: "Reverse_Machine_Flyes", materiel: "Pec deck en position inversée",
    muscles: ["epaules_arr"], secondaires: ["dos_milieu", "trapezes"],
    etapes: ["Assieds-toi face au dossier, poignées devant toi.", "Bras tendus, ouvre vers l'arrière.", "Serre les omoplates 1 seconde.", "Reviens lentement."],
    conseils: ["Léger et contrôlé : ce petit muscle se fatigue vite."],
    erreurs: ["Hausser les épaules."],
  }),
  M({
    id: "m_lat_raise_cable", nom: "Élévations latérales poulie", groupe: "Épaules", type: "force", marque: "Poulies",
    img: "Cable_Seated_Lateral_Raise", materiel: "Poulie basse",
    muscles: ["epaules"], secondaires: ["trapezes"],
    etapes: ["Poulie basse, poignée dans la main opposée.", "Monte le bras sur le côté jusqu'à l'horizontale.", "Redescends lentement."],
    conseils: ["La poulie garde la tension tout le long : top pour les épaules."],
    erreurs: ["Monter trop haut."],
  }),
  M({
    id: "m_shrug", nom: "Shrugs Hammer Strength", groupe: "Dos", type: "force", marque: "Hammer Strength",
    img: "Leverage_Shrug", materiel: "Machine à disques",
    muscles: ["trapezes"], secondaires: ["avant_bras"],
    etapes: ["Place-toi entre les poignées, bras tendus.", "Monte les épaules vers les oreilles.", "Tiens 1 seconde, redescends."],
    conseils: ["Pas de rotation des épaules."],
    erreurs: ["Plier les coudes."],
  }),
  M({
    id: "m_curl", nom: "Curl biceps machine", groupe: "Bras", type: "force", marque: "Technogym",
    img: "Machine_Bicep_Curl", materiel: "Machine",
    muscles: ["biceps"], secondaires: ["avant_bras"],
    etapes: ["Règle le siège : coudes alignés avec l'axe de la machine.", "Arrière des bras sur le pupitre.", "Monte en contractant.", "Redescends lentement."],
    conseils: ["Idéal en fin de séance pour finir les biceps."],
    erreurs: ["Décoller les coudes du pupitre."],
  }),
  M({
    id: "m_triceps", nom: "Extension triceps machine", groupe: "Bras", type: "force", marque: "Technogym",
    img: "Machine_Triceps_Extension", materiel: "Machine",
    muscles: ["triceps"], secondaires: [],
    etapes: ["Coudes alignés avec l'axe de la machine.", "Pousse jusqu'aux bras tendus.", "Reviens lentement."],
    conseils: ["Contracte fort en bas."],
    erreurs: ["Bouger les épaules."],
  }),
  M({
    id: "m_dips", nom: "Dips machine", groupe: "Bras", type: "force", marque: "Technogym / Hammer Strength",
    img: "Dip_Machine", materiel: "Machine",
    muscles: ["triceps"], secondaires: ["pecs", "epaules"],
    etapes: ["Assis, poignées le long du corps.", "Pousse vers le bas jusqu'aux bras tendus.", "Remonte jusqu'à ~90° aux coudes."],
    conseils: ["Buste droit = plus de triceps."],
    erreurs: ["Remonter trop haut (stress sur les épaules)."],
  }),
  M({
    id: "m_hack_squat", nom: "Hack squat", groupe: "Jambes", type: "force", marque: "Hammer Strength",
    img: "Hack_Squat", materiel: "Machine",
    muscles: ["quadriceps"], secondaires: ["fessiers", "ischios"],
    etapes: ["Dos et épaules contre les coussins, pieds largeur d'épaules.", "Déverrouille les sécurités.", "Descends jusqu'à 90° ou plus bas.", "Pousse dans tout le pied pour remonter."],
    conseils: ["Pieds bas = plus de quadriceps."],
    erreurs: ["Talons qui décollent.", "Genoux qui rentrent."],
  }),
  M({
    id: "m_smith_squat", nom: "Squat Smith machine", groupe: "Jambes", type: "force", marque: "Smith machine",
    img: "Smith_Machine_Squat", materiel: "Smith machine",
    muscles: ["quadriceps", "fessiers"], secondaires: ["ischios"],
    etapes: ["Barre sur les trapèzes, pieds légèrement devant toi.", "Déverrouille la barre.", "Descends jusqu'aux cuisses parallèles.", "Remonte et reverrouille."],
    conseils: ["Bon pour apprendre le squat en sécurité."],
    erreurs: ["Pieds trop sous la barre (genoux qui avancent trop)."],
  }),
  M({
    id: "m_leg_curl_assis", nom: "Leg curl assis", groupe: "Jambes", type: "force", marque: "Technogym",
    img: "Seated_Leg_Curl", materiel: "Machine",
    muscles: ["ischios"], secondaires: ["mollets"],
    etapes: ["Genoux alignés avec l'axe de la machine, boudin au-dessus des cuisses.", "Ramène les talons sous le siège.", "Remonte lentement."],
    conseils: ["Version assise = meilleur étirement des ischios."],
    erreurs: ["Aller trop vite en remontant."],
  }),
  M({
    id: "m_adducteurs", nom: "Adducteurs machine", groupe: "Jambes", type: "force", marque: "Technogym",
    img: "Thigh_Adductor", materiel: "Machine",
    muscles: ["adducteurs"], secondaires: [],
    etapes: ["Assis, jambes écartées contre les coussins.", "Serre les jambes l'une contre l'autre.", "Reviens lentement."],
    conseils: ["Ne cherche pas l'écart maximum au début."],
    erreurs: ["Laisser les charges claquer."],
  }),
  M({
    id: "m_abducteurs", nom: "Abducteurs machine", groupe: "Jambes", type: "force", marque: "Technogym",
    img: "Thigh_Abductor", materiel: "Machine",
    muscles: ["abducteurs"], secondaires: ["fessiers"],
    etapes: ["Assis, jambes serrées, coussins à l'extérieur des genoux.", "Écarte les jambes.", "Reviens lentement."],
    conseils: ["Penche-toi un peu en avant pour plus de fessiers."],
    erreurs: ["Utiliser l'élan."],
  }),
  M({
    id: "m_kickback", nom: "Kickback fessiers (machine)", groupe: "Jambes", type: "force", marque: "Technogym / poulie",
    img: "Glute_Kickback", materiel: "Machine fessiers ou poulie basse",
    muscles: ["fessiers"], secondaires: ["ischios"],
    etapes: ["En appui sur la machine, un pied sur la plateforme.", "Pousse la jambe vers l'arrière et le haut.", "Serre le fessier en haut, redescends."],
    conseils: ["Le bassin ne tourne pas."],
    erreurs: ["Cambrer le bas du dos."],
  }),
  M({
    id: "m_mollets_assis", nom: "Mollets assis", groupe: "Jambes", type: "force", marque: "Hammer Strength",
    img: "Seated_Calf_Raise", materiel: "Machine",
    muscles: ["mollets"], secondaires: [],
    etapes: ["Avant des pieds sur la cale, genoux sous le boudin.", "Descends les talons au max.", "Monte le plus haut possible, tiens 1 s."],
    conseils: ["Assis = on cible le soléaire (bas du mollet)."],
    erreurs: ["Amplitude réduite."],
  }),
  M({
    id: "m_ground_base", nom: "Deadlift Hammer Strength (ground base)", groupe: "Jambes", type: "force", marque: "Hammer Strength",
    img: "Leverage_Deadlift", materiel: "Machine à disques",
    muscles: ["quadriceps", "fessiers"], secondaires: ["ischios", "lombaires", "trapezes"],
    etapes: ["Place-toi au centre, dos plat.", "Attrape les poignées, hanches basses.", "Pousse dans le sol pour te relever.", "Redescends en contrôlant."],
    conseils: ["Plus sûr que le soulevé de terre à la barre pour débuter."],
    erreurs: ["Dos rond."],
  }),
  M({
    id: "m_abs", nom: "Crunch machine", groupe: "Abdos", type: "force", marque: "Technogym",
    img: "Ab_Crunch_Machine", materiel: "Machine",
    muscles: ["abdos"], secondaires: ["obliques"],
    etapes: ["Assis, attrape les poignées.", "Enroule le buste vers les genoux.", "Remonte lentement."],
    conseils: ["Souffle en enroulant."],
    erreurs: ["Tirer avec les bras."],
  }),
  M({
    id: "m_escalier", nom: "Escalier (Stairmaster)", groupe: "Cardio", type: "cardio", marque: "Technogym",
    img: "Stairmaster", materiel: "Machine escalier",
    muscles: ["cardio", "fessiers"], secondaires: ["quadriceps", "mollets"],
    etapes: ["Monte les marches à rythme régulier.", "Buste droit, ne t'appuie pas sur les barres."],
    conseils: ["Redoutable en sèche : 15-20 min suffisent."],
    erreurs: ["S'avachir sur les rampes."],
  }),

  // ================= CALISTHÉNIE =================
  {
    id: "c_chin_up", nom: "Chin-ups (tractions supination)", groupe: "Calisthénie", type: "pdc",
    img: "Chin-Up", materiel: "Barre de traction",
    muscles: ["dos", "biceps"], secondaires: ["dos_milieu", "avant_bras"],
    etapes: ["Prise paumes vers toi, largeur d'épaules.", "Tire jusqu'au menton au-dessus de la barre.", "Redescends bras tendus."],
    conseils: ["Plus facile que les tractions pronation : bon pour débuter."],
    erreurs: ["Se balancer."],
  },
  {
    id: "c_dips_triceps", nom: "Dips triceps (buste droit)", groupe: "Calisthénie", type: "pdc",
    img: "Dips_-_Triceps_Version", materiel: "Barres parallèles",
    muscles: ["triceps"], secondaires: ["pecs", "epaules"],
    etapes: ["En appui, buste bien droit.", "Descends jusqu'à 90° aux coudes.", "Pousse pour remonter."],
    conseils: ["Coudes serrés vers l'arrière."],
    erreurs: ["Épaules qui montent vers les oreilles."],
  },
  {
    id: "c_pompes_diamant", nom: "Pompes diamant", groupe: "Calisthénie", type: "pdc",
    img: "Push-Ups_-_Close_Triceps_Position", materiel: "Aucun",
    muscles: ["triceps"], secondaires: ["pecs", "epaules"],
    etapes: ["Mains rapprochées sous la poitrine (pouces et index forment un diamant).", "Corps gainé.", "Descends la poitrine vers les mains, remonte."],
    conseils: ["Trop dur ? Sur les genoux."],
    erreurs: ["Coudes qui s'écartent."],
  },
  {
    id: "c_pompes_declinees", nom: "Pompes pieds surélevés", groupe: "Calisthénie", type: "pdc",
    img: "Decline_Push-Up", materiel: "Banc / box",
    muscles: ["pecs"], secondaires: ["epaules", "triceps"],
    etapes: ["Pieds sur un banc, mains au sol.", "Corps aligné.", "Descends puis pousse."],
    conseils: ["Plus les pieds sont hauts, plus les épaules travaillent."],
    erreurs: ["Bassin qui tombe."],
  },
  {
    id: "c_hspu", nom: "Pompes en équilibre (HSPU)", groupe: "Calisthénie", type: "pdc",
    img: "Handstand_Push-Ups", materiel: "Mur",
    muscles: ["epaules"], secondaires: ["triceps", "trapezes"],
    etapes: ["En équilibre sur les mains, pieds contre le mur.", "Descends la tête vers le sol en contrôlant.", "Pousse pour remonter."],
    conseils: ["Étape avant : pompes en pike (fesses en l'air)."],
    erreurs: ["Descendre sans contrôle sur la tête."],
  },
  {
    id: "c_muscle_up", nom: "Muscle-up", groupe: "Calisthénie", type: "pdc",
    img: "Muscle_Up", materiel: "Barre de traction",
    muscles: ["dos", "triceps"], secondaires: ["pecs", "biceps", "abdos"],
    etapes: ["Traction explosive jusqu'à la poitrine.", "Bascule les poignets et le buste au-dessus de la barre.", "Termine par une extension (comme un dips)."],
    conseils: ["Prérequis : ~10 tractions et ~15 dips propres.", "Travaille les tractions explosives poitrine à la barre."],
    erreurs: ["Trop se balancer (kipping) avant d'avoir la force."],
  },
  {
    id: "c_australian", nom: "Rowing inversé (australian pull-up)", groupe: "Calisthénie", type: "pdc",
    img: "Inverted_Row", materiel: "Barre basse / Smith machine",
    muscles: ["dos_milieu", "dos"], secondaires: ["biceps", "epaules_arr"],
    etapes: ["Sous une barre à hauteur de taille, corps tendu.", "Tire la poitrine vers la barre.", "Redescends bras tendus."],
    conseils: ["Pieds plus loin = plus dur."],
    erreurs: ["Fesses qui tombent."],
  },
  {
    id: "c_pistol", nom: "Pistol squat", groupe: "Calisthénie", type: "pdc",
    img: "Kettlebell_Pistol_Squat", materiel: "Aucun (ou poids pour l'équilibre)",
    muscles: ["quadriceps", "fessiers"], secondaires: ["ischios", "abdos"],
    etapes: ["Debout sur une jambe, l'autre tendue devant.", "Descends le plus bas possible sur une jambe.", "Remonte sans poser l'autre pied."],
    conseils: ["Pour apprendre : descends sur un banc puis relève-toi."],
    erreurs: ["Talon qui décolle."],
  },
  {
    id: "c_squat_pdc", nom: "Squat poids du corps", groupe: "Calisthénie", type: "pdc",
    img: "Bodyweight_Squat", materiel: "Aucun",
    muscles: ["quadriceps", "fessiers"], secondaires: ["ischios"],
    etapes: ["Pieds largeur d'épaules.", "Descends les fesses en arrière, buste droit.", "Remonte en poussant dans les talons."],
    conseils: ["Bon échauffement avant les jambes."],
    erreurs: ["Talons qui décollent."],
  },
  {
    id: "c_fentes_marchees", nom: "Fentes marchées", groupe: "Calisthénie", type: "pdc",
    img: "Bodyweight_Walking_Lunge", materiel: "Aucun",
    muscles: ["quadriceps", "fessiers"], secondaires: ["ischios"],
    etapes: ["Fais un grand pas, descends le genou arrière près du sol.", "Enchaîne avec l'autre jambe en avançant."],
    conseils: ["Compte les reps par jambe."],
    erreurs: ["Pas trop petits."],
  },
  {
    id: "c_toes_to_bar", nom: "Toes to bar", groupe: "Calisthénie", type: "pdc",
    img: "Hanging_Pike", materiel: "Barre de traction",
    muscles: ["abdos"], secondaires: ["obliques", "dos", "avant_bras"],
    etapes: ["Suspendu à la barre.", "Monte les pieds jusqu'à toucher la barre, jambes tendues.", "Redescends lentement."],
    conseils: ["Version plus dure du relevé de jambes."],
    erreurs: ["Gros balancement."],
  },
  {
    id: "c_gainage_lateral", nom: "Gainage latéral", groupe: "Calisthénie", type: "temps",
    img: "Side_Bridge", materiel: "Aucun",
    muscles: ["obliques"], secondaires: ["abdos", "epaules"],
    etapes: ["Sur le côté, en appui sur un avant-bras.", "Monte les hanches pour aligner le corps.", "Tiens, puis change de côté."],
    conseils: ["Note le temps par côté."],
    erreurs: ["Hanches qui tombent."],
  },
  {
    id: "c_superman", nom: "Superman", groupe: "Calisthénie", type: "pdc",
    img: "Superman", materiel: "Aucun",
    muscles: ["lombaires"], secondaires: ["fessiers", "epaules_arr"],
    etapes: ["Allongé sur le ventre, bras devant.", "Décolle bras et jambes en même temps.", "Tiens 2 s, redescends."],
    conseils: ["Renforce le bas du dos sans matériel."],
    erreurs: ["Lever la tête trop haut."],
  },

  // ================= ÉTIREMENTS =================
  ...[
    ["s_pecs", "Étirement pectoraux", "Chest_And_Front_Of_Shoulder_Stretch", ["pecs"], ["epaules"], ["Avant-bras contre un montant, coude à hauteur d'épaule.", "Tourne doucement le buste à l'opposé.", "Tiens 30 s de chaque côté."]],
    ["s_epaules", "Étirement épaules", "Shoulder_Stretch", ["epaules_arr"], ["dos_milieu"], ["Ramène un bras tendu devant la poitrine.", "Tiens-le avec l'autre bras au niveau du coude.", "30 s par côté."]],
    ["s_triceps", "Étirement triceps", "Triceps_Stretch", ["triceps"], ["dos"], ["Main derrière la tête, coude vers le plafond.", "L'autre main pousse doucement le coude.", "30 s par côté."]],
    ["s_biceps", "Étirement biceps", "Standing_Biceps_Stretch", ["biceps"], ["pecs", "epaules"], ["Mains jointes derrière le dos, bras tendus.", "Monte doucement les bras en arrière.", "Tiens 30 s."]],
    ["s_dorsaux", "Étirement grand dorsal", "Overhead_Lat", ["dos"], ["triceps"], ["Bras au-dessus de la tête, attrape le poignet.", "Penche-toi sur le côté.", "30 s par côté."]],
    ["s_haut_dos", "Étirement haut du dos", "Upper_Back_Stretch", ["dos_milieu"], ["trapezes"], ["Mains croisées devant, bras tendus.", "Arrondis le haut du dos en poussant les mains loin.", "Tiens 30 s."]],
    ["s_enfant", "Posture de l'enfant", "Childs_Pose", ["lombaires"], ["dos", "fessiers"], ["À genoux, fesses sur les talons.", "Allonge les bras loin devant, front au sol.", "Respire lentement 30-60 s."]],
    ["s_chat", "Dos rond / dos creux (chat)", "Cat_Stretch", ["lombaires"], ["abdos", "dos_milieu"], ["À quatre pattes.", "Arrondis le dos en rentrant le ventre, puis creuse doucement.", "10 répétitions lentes."]],
    ["s_hanches", "Étirement fléchisseurs de hanche", "Kneeling_Hip_Flexor", ["quadriceps"], ["abdos"], ["Un genou au sol, l'autre pied devant.", "Avance le bassin en serrant le fessier arrière.", "30 s par côté."]],
    ["s_quadriceps", "Étirement quadriceps", "Quad_Stretch", ["quadriceps"], [], ["Debout, attrape ton pied derrière toi.", "Genoux serrés, bassin vers l'avant.", "30 s par côté."]],
    ["s_ischios", "Étirement ischio-jambiers", "Hamstring_Stretch", ["ischios"], ["mollets", "lombaires"], ["Jambe tendue devant toi.", "Penche le buste en avant en gardant le dos droit.", "30 s par côté."]],
    ["s_fessiers", "Étirement fessiers", "Seated_Glute", ["fessiers"], ["lombaires"], ["Assis, croise une jambe sur l'autre.", "Ramène le genou vers la poitrine opposée.", "30 s par côté."]],
    ["s_adducteurs", "Étirement adducteurs (grand écart facial)", "The_Straddle", ["adducteurs"], ["ischios"], ["Assis jambes écartées.", "Penche-toi en avant, dos droit.", "Tiens 30-45 s."]],
    ["s_mollets", "Étirement mollets", "Calf_Stretch_Hands_Against_Wall", ["mollets"], [], ["Mains contre le mur, une jambe tendue derrière.", "Talon arrière au sol, avance le bassin.", "30 s par côté."]],
    ["s_nuque", "Étirement nuque", "Side_Neck_Stretch", ["cou"], ["trapezes"], ["Penche la tête sur le côté.", "Aide-toi doucement avec la main.", "20 s par côté."]],
    ["s_worlds", "Mobilité complète (world's greatest stretch)", "Worlds_Greatest_Stretch", ["quadriceps", "ischios"], ["fessiers", "dos", "obliques"], ["Grande fente avant.", "Coude vers le sol à l'intérieur du pied avant, puis ouvre le bras vers le ciel.", "5 répétitions par côté."]],
  ].map(([id, nom, img, muscles, secondaires, etapes]) => ({
    id, nom, img, muscles, secondaires, etapes, groupe: "Étirements", type: "temps", materiel: "Aucun",
    conseils: ["Respire lentement, relâche à chaque expiration.", "Après la séance, muscles chauds : c'est le meilleur moment."],
    erreurs: ["Donner des à-coups.", "Forcer jusqu'à la douleur."],
  })),
);

PROGRAMS.push(
  {
    id: "fp_machines", nom: "Fitness Park – 100% machines", objectif: "debutant", jours: 3,
    desc: "Programme sur les machines Technogym / Hammer Strength de ta salle. Parfait pour reprendre en sécurité : les machines guident le mouvement.",
    seances: [
      { nom: "Machines – Haut du corps", ex: [["m_chest_press", 3, "10-12", 90], ["m_high_row", 3, "10-12", 90], ["m_shoulder_press", 3, "10-12", 90], ["m_iso_row", 3, "10-12", 90], ["m_curl", 2, "12", 60], ["m_triceps", 2, "12", 60]] },
      { nom: "Machines – Bas du corps", ex: [["presse", 3, "10-12", 120], ["m_hack_squat", 3, "10", 120], ["leg_ext", 3, "12-15", 60], ["m_leg_curl_assis", 3, "12", 60], ["m_adducteurs", 2, "15", 45], ["m_mollets_assis", 3, "15", 45], ["m_abs", 3, "15", 45]] },
    ],
  },
  {
    id: "calisthenie", nom: "Calisthénie – Poids du corps", objectif: "calisthenie", jours: 3,
    desc: "Devenir fort avec ton propre poids : tractions, dips, pompes, gainage. Quand tu passes 12 reps propres, passe à la variante plus dure ou ajoute du lest.",
    seances: [
      { nom: "Tirage + abdos", ex: [["tractions", 4, "max", 120], ["c_australian", 3, "10-12", 90], ["c_chin_up", 3, "max", 90], ["c_toes_to_bar", 3, "8-10", 60], ["c_gainage_lateral", 3, "30 s", 30]] },
      { nom: "Poussée", ex: [["dips", 4, "8-12", 120], ["pompes", 3, "max", 90], ["c_pompes_diamant", 3, "10", 60], ["c_hspu", 3, "5-8", 90], ["gainage", 3, "45 s", 30]] },
      { nom: "Jambes", ex: [["c_squat_pdc", 3, "20", 60], ["c_pistol", 3, "5/jambe", 90], ["c_fentes_marchees", 3, "12/jambe", 60], ["c_superman", 3, "12", 45], ["releve_jambes", 3, "12", 60]] },
    ],
  },
  {
    id: "etirements", nom: "Étirements – Après séance", objectif: "mobilite", jours: 7,
    desc: "10 minutes d'étirements après l'entraînement ou les jours de repos. Tiens chaque position 30 s par côté en respirant calmement.",
    seances: [
      { nom: "Haut du corps", ex: [["s_pecs", 2, "30 s", 0], ["s_epaules", 2, "30 s", 0], ["s_triceps", 2, "30 s", 0], ["s_dorsaux", 2, "30 s", 0], ["s_nuque", 2, "20 s", 0], ["s_enfant", 1, "60 s", 0]] },
      { nom: "Bas du corps", ex: [["s_quadriceps", 2, "30 s", 0], ["s_ischios", 2, "30 s", 0], ["s_hanches", 2, "30 s", 0], ["s_fessiers", 2, "30 s", 0], ["s_mollets", 2, "30 s", 0], ["s_adducteurs", 1, "45 s", 0]] },
      { nom: "Mobilité complète", ex: [["s_worlds", 2, "5/côté", 0], ["s_chat", 1, "10", 0], ["s_hanches", 2, "30 s", 0], ["s_haut_dos", 1, "30 s", 0], ["s_enfant", 1, "60 s", 0]] },
    ],
  },
);

// ================= ÉCHAUFFEMENT & RETOUR AU CALME =================
// Ajoutés automatiquement au début / à la fin des séances (réglable dans Réglages)
EXERCISES.push(
  {
    id: "e_bras", nom: "Rotations des bras", groupe: "Étirements", type: "temps", role: "warmup",
    img: "Arm_Circles", materiel: "Aucun", muscles: ["epaules"], secondaires: ["pecs", "dos_milieu"],
    etapes: ["Bras tendus sur les côtés.", "Fais des petits cercles puis des grands cercles.", "Change de sens à mi-temps."],
    conseils: ["Réveille les épaules avant de pousser ou tirer."], erreurs: ["Aller trop vite d'entrée."],
  },
  {
    id: "e_hanches", nom: "Rotations de hanches", groupe: "Étirements", type: "temps", role: "warmup",
    img: "Standing_Hip_Circles", materiel: "Aucun", muscles: ["fessiers"], secondaires: ["lombaires", "adducteurs"],
    etapes: ["Mains sur les hanches, pieds largeur d'épaules.", "Fais de grands cercles avec le bassin.", "Change de sens à mi-temps."],
    conseils: ["Prépare les hanches et le bas du dos."], erreurs: ["Bloquer la respiration."],
  },
  {
    id: "e_rotation", nom: "Rotations du buste", groupe: "Étirements", type: "temps", role: "warmup",
    img: "Torso_Rotation", materiel: "Aucun", muscles: ["obliques"], secondaires: ["lombaires", "dos_milieu"],
    etapes: ["Debout, bras croisés ou tendus devant.", "Tourne le buste à gauche puis à droite, bassin fixe.", "Mouvement fluide et contrôlé."],
    conseils: ["Augmente l'amplitude petit à petit."], erreurs: ["Tourner le bassin avec le buste."],
  },
  {
    id: "e_inchworm", nom: "Inchworm (chenille)", groupe: "Étirements", type: "pdc", role: "warmup",
    img: "Inchworm", materiel: "Aucun", muscles: ["ischios", "epaules"], secondaires: ["abdos", "pecs"],
    etapes: ["Debout, penche-toi et pose les mains au sol.", "Avance les mains jusqu'à la position de pompe.", "Ramène les pieds vers les mains en petits pas, puis relève-toi."],
    conseils: ["Échauffement complet : ischios, épaules, gainage."], erreurs: ["Plier fort les genoux."],
  },
  {
    id: "marche_inclinee", nom: "Marche inclinée", groupe: "Cardio", type: "cardio", role: "cooldown", machine: true, marque: "Tapis Technogym",
    img: "Walking_Treadmill", materiel: "Tapis de course", muscles: ["cardio", "fessiers"], secondaires: ["mollets", "ischios"],
    etapes: ["Règle l'inclinaison entre 8 et 12 %.", "Marche à 4,5 – 5,5 km/h sans te tenir aux barres.", "Garde le buste droit et fais de grands pas."],
    conseils: ["Brûle beaucoup de calories sans fatiguer les jambes pour la prochaine séance.", "Parfait en fin de séance : on reste en « zone 2 » (tu peux parler)."],
    erreurs: ["Se tenir aux barres (ça annule l'effet de la pente).", "Pente trop forte dès le début."],
  },
);
const WARMUP = [["e_bras", 1, "30 s"], ["e_hanches", 1, "30 s"], ["e_rotation", 1, "30 s"], ["e_inchworm", 1, "5"], ["s_worlds", 1, "5/côté"]];

// ================= MAISON (sans matériel + chaise romaine) =================
EXERCISES.push(
  {
    id: "cr_dips", nom: "Dips à la chaise romaine", groupe: "Calisthénie", type: "pdc", maison: "chaise",
    img: "Parallel_Bar_Dip", materiel: "Chaise romaine (poignées dips)",
    muscles: ["triceps", "pecs"], secondaires: ["epaules"],
    etapes: ["Mains sur les poignées, bras tendus, pieds décollés.", "Descends jusqu'à ce que les coudes fassent ~90°.", "Remonte en poussant fort."],
    conseils: ["Buste droit = triceps, penché en avant = pecs.", "Trop dur ? Garde un pied posé sur la marche pour t'aider."],
    erreurs: ["Descendre trop bas (épaules).", "Hausser les épaules."],
  },
  {
    id: "cr_releve_genoux", nom: "Relevé de genoux (chaise romaine)", groupe: "Abdos", type: "pdc", maison: "chaise",
    img: "Knee_Hip_Raise_On_Parallel_Bars", materiel: "Chaise romaine",
    muscles: ["abdos"], secondaires: ["obliques"],
    etapes: ["Dos collé au dossier, avant-bras sur les accoudoirs.", "Monte les genoux vers la poitrine en enroulant le bassin.", "Redescends lentement sans te balancer."],
    conseils: ["Plus dur : jambes tendues.", "Pour les obliques : monte les genoux vers une épaule puis l'autre."],
    erreurs: ["Se balancer.", "Juste lever les jambes sans enrouler le bassin."],
  },
  {
    id: "c_pont", nom: "Pont fessier", groupe: "Calisthénie", type: "pdc",
    img: "Butt_Lift_Bridge", materiel: "Aucun",
    muscles: ["fessiers"], secondaires: ["ischios", "lombaires"],
    etapes: ["Allongé sur le dos, genoux pliés, pieds à plat.", "Monte les hanches en serrant les fessiers.", "Tiens 1 s en haut puis redescends."],
    conseils: ["Plus dur : sur une jambe."], erreurs: ["Cambrer le bas du dos au lieu de serrer les fessiers."],
  },
  {
    id: "c_flutter", nom: "Battements de jambes (flutter kicks)", groupe: "Abdos", type: "temps",
    img: "Flutter_Kicks", materiel: "Aucun",
    muscles: ["abdos"], secondaires: ["quadriceps"],
    etapes: ["Allongé sur le dos, mains sous les fesses.", "Décolle les jambes tendues de quelques cm.", "Fais de petits battements haut/bas."],
    conseils: ["Bas du dos plaqué au sol."], erreurs: ["Dos qui se creuse."],
  },
);
EXERCISES.find((e) => e.id === "extensions_lombaires").maison = "lombaires";
EXERCISES.find((e) => e.id === "c_pont").aussi = ["Jambes"];

WORKOUT_CATS.unshift("Maison");
WORKOUTS.unshift(
  { id: "w_maison_fb", nom: "Maison – Full body", cat: "Maison", niveau: 1, desc: "Sans matériel : tout le corps dans ton salon.",
    ex: [["pompes", 4, "max", 60], ["c_squat_pdc", 4, "20", 60], ["c_fentes_marchees", 3, "12/jambe", 60], ["c_pont", 3, "15", 45], ["c_superman", 3, "15", 30], ["gainage", 3, "45 s", 30]] },
  { id: "w_maison_haut", nom: "Maison – Haut du corps (chaise romaine)", cat: "Maison", niveau: 2, desc: "Pompes + dips et abdos sur ta chaise romaine.",
    ex: [["cr_dips", 4, "max", 90], ["pompes", 4, "max", 60], ["c_pompes_diamant", 3, "10", 60], ["cr_releve_genoux", 3, "12", 45], ["c_gainage_lateral", 2, "30 s", 30]] },
  { id: "w_maison_abdos", nom: "Maison – Abdos chaise romaine", cat: "Maison", niveau: 2, desc: "Sangle abdo complète en 20 min.",
    ex: [["cr_releve_genoux", 4, "12", 45], ["crunch", 3, "20", 30], ["russian_twist", 3, "24", 30], ["c_flutter", 3, "30 s", 30], ["gainage", 3, "45 s", 30]] },
  { id: "w_maison_jambes", nom: "Maison – Jambes", cat: "Maison", niveau: 2, desc: "Cuisses et fessiers sans aucune charge.",
    ex: [["c_squat_pdc", 4, "25", 60], ["c_fentes_marchees", 4, "12/jambe", 60], ["c_pistol", 3, "5/jambe", 90], ["c_pont", 4, "20", 45], ["mountain_climbers", 3, "30 s", 30]] },
);
