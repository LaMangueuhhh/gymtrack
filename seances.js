// Séances toutes faites : choisis, appuie sur « Commencer », c'est parti.
// ex : [idExercice, séries, "reps", repos en secondes]

const WORKOUT_CATS = ["Full body", "Pecs", "Dos", "Épaules", "Bras", "Jambes", "Fessiers", "Abdos", "Cardio / HIIT", "Machines", "Calisthénie", "Express", "Étirements"];

const WORKOUTS = [
  // ---------- FULL BODY ----------
  { id: "w_fb_debutant", nom: "Full body débutant", cat: "Full body", niveau: 1, desc: "Les mouvements de base pour reprendre en douceur.",
    ex: [["goblet", 3, "12", 90], ["m_chest_press", 3, "12", 90], ["tirage_vertical", 3, "12", 90], ["m_shoulder_press", 2, "12", 60], ["leg_curl", 2, "12", 60], ["gainage", 3, "30 s", 45]] },
  { id: "w_fb_force", nom: "Full body force", cat: "Full body", niveau: 3, desc: "Charges lourdes sur les gros mouvements. Repos long.",
    ex: [["squat", 4, "5", 180], ["dev_couche", 4, "5", 180], ["rowing_barre", 4, "6", 150], ["dev_militaire", 3, "6", 120], ["releve_jambes", 3, "10", 60]] },
  { id: "w_fb_halteres", nom: "Full body haltères", cat: "Full body", niveau: 2, desc: "Tout le corps avec seulement une paire d'haltères et un banc.",
    ex: [["goblet", 4, "10", 90], ["dev_couche_halteres", 4, "10", 90], ["rowing_haltere", 4, "10/bras", 90], ["fentes", 3, "10/jambe", 90], ["dev_halteres_assis", 3, "10", 60], ["curl_marteau", 2, "12", 45]] },
  { id: "w_fb_hypertrophie", nom: "Full body volume", cat: "Full body", niveau: 2, desc: "Beaucoup de séries modérées pour faire grossir le muscle.",
    ex: [["presse", 4, "10-12", 120], ["dev_incline_halteres", 4, "10-12", 90], ["tirage_horizontal", 4, "10-12", 90], ["elev_laterales", 3, "15", 45], ["sdt_roumain", 3, "10", 90], ["extension_poulie", 3, "12", 45], ["curl_halteres", 3, "12", 45]] },
  { id: "w_haut", nom: "Haut du corps complet", cat: "Full body", niveau: 2, desc: "Pecs, dos, épaules et bras en une séance.",
    ex: [["dev_couche", 4, "8", 120], ["tractions", 4, "max", 120], ["dev_halteres_assis", 3, "10", 90], ["rowing_haltere", 3, "10/bras", 90], ["elev_laterales", 3, "15", 45], ["curl_barre", 3, "10", 60], ["barre_front", 3, "10", 60]] },
  { id: "w_bas", nom: "Bas du corps complet", cat: "Full body", niveau: 2, desc: "Quadriceps, ischios, fessiers, mollets.",
    ex: [["squat", 4, "8", 150], ["sdt_roumain", 3, "10", 120], ["presse", 3, "12", 90], ["leg_curl", 3, "12", 60], ["hip_thrust", 3, "10", 90], ["mollets", 4, "15", 45]] },

  // ---------- PECS ----------
  { id: "w_pecs_classique", nom: "Pecs – Classique", cat: "Pecs", niveau: 2, desc: "Développé, incliné, écarté : la base pour des pecs épais.",
    ex: [["dev_couche", 4, "6-8", 150], ["dev_incline_halteres", 4, "8-10", 120], ["ecarte_halteres", 3, "12", 60], ["dips", 3, "max", 90], ["poulie_vis_a_vis", 3, "15", 45]] },
  { id: "w_pecs_haut", nom: "Pecs – Focus haut des pecs", cat: "Pecs", niveau: 2, desc: "Pour remplir le haut de la poitrine.",
    ex: [["m_incline_press", 4, "8-10", 120], ["dev_incline_halteres", 4, "10", 90], ["poulie_vis_a_vis", 3, "12-15", 60], ["c_pompes_declinees", 3, "max", 60], ["pec_deck", 3, "15", 45]] },
  { id: "w_pecs_triceps", nom: "Pecs + triceps", cat: "Pecs", niveau: 2, desc: "La séance « push » classique sans les épaules.",
    ex: [["dev_couche", 4, "8", 150], ["dev_incline_halteres", 3, "10", 90], ["pec_deck", 3, "12", 60], ["dev_serre", 3, "8", 90], ["extension_poulie", 3, "12", 45], ["ext_nuque", 3, "12", 45]] },

  // ---------- DOS ----------
  { id: "w_dos_largeur", nom: "Dos – Largeur", cat: "Dos", niveau: 2, desc: "Pour un dos en V : tirages verticaux.",
    ex: [["tractions", 4, "max", 120], ["tirage_vertical", 4, "10", 90], ["m_high_row", 3, "10-12", 90], ["face_pull", 3, "15", 45], ["curl_marteau", 3, "12", 45]] },
  { id: "w_dos_epaisseur", nom: "Dos – Épaisseur", cat: "Dos", niveau: 3, desc: "Rowings lourds pour un dos dense.",
    ex: [["souleve_terre", 3, "5", 180], ["rowing_barre", 4, "8", 120], ["m_tbar", 3, "10", 90], ["tirage_horizontal", 3, "12", 90], ["shrugs", 3, "12", 60]] },
  { id: "w_dos_biceps", nom: "Dos + biceps", cat: "Dos", niveau: 2, desc: "La séance « pull » complète.",
    ex: [["tractions", 4, "6-10", 120], ["rowing_haltere", 4, "10/bras", 90], ["tirage_horizontal", 3, "12", 90], ["face_pull", 3, "15", 45], ["curl_barre", 3, "10", 60], ["curl_marteau", 3, "12", 45]] },

  // ---------- ÉPAULES ----------
  { id: "w_epaules_3d", nom: "Épaules 3D", cat: "Épaules", niveau: 2, desc: "Avant, côté, arrière : des épaules rondes et larges.",
    ex: [["dev_militaire", 4, "6-8", 150], ["arnold", 3, "10", 90], ["elev_laterales", 4, "12-15", 45], ["m_lat_raise_cable", 3, "15", 45], ["oiseau", 3, "15", 45], ["face_pull", 3, "15", 45]] },
  { id: "w_epaules_machines", nom: "Épaules machines", cat: "Épaules", niveau: 1, desc: "Épaules en sécurité sur machines et poulies.",
    ex: [["m_shoulder_press", 4, "10", 90], ["m_lat_raise_cable", 4, "15", 45], ["m_reverse_fly", 3, "15", 45], ["m_shrug", 3, "12", 60]] },

  // ---------- BRAS ----------
  { id: "w_bras", nom: "Bras – Biceps & triceps", cat: "Bras", niveau: 2, desc: "En supersets : un exo biceps puis un exo triceps.",
    ex: [["curl_barre", 4, "8-10", 60], ["barre_front", 4, "8-10", 60], ["curl_pupitre", 3, "10-12", 60], ["extension_poulie", 3, "12", 60], ["curl_marteau", 3, "12", 45], ["ext_nuque", 3, "12", 45]] },
  { id: "w_bras_pump", nom: "Bras – Pump", cat: "Bras", niveau: 1, desc: "Léger, beaucoup de reps, gros pump.",
    ex: [["m_curl", 3, "15", 45], ["m_triceps", 3, "15", 45], ["curl_halteres", 3, "12", 45], ["extension_poulie", 3, "15", 45], ["c_pompes_diamant", 2, "max", 60]] },

  // ---------- JAMBES ----------
  { id: "w_jambes_quadri", nom: "Jambes – Quadriceps", cat: "Jambes", niveau: 3, desc: "Squat, presse, extensions : ça va brûler.",
    ex: [["squat", 4, "6-8", 180], ["m_hack_squat", 3, "10", 120], ["presse", 3, "12", 120], ["leg_ext", 3, "15", 60], ["mollets", 4, "15", 45]] },
  { id: "w_jambes_ischios", nom: "Jambes – Ischios", cat: "Jambes", niveau: 2, desc: "L'arrière des cuisses, trop souvent oublié.",
    ex: [["sdt_roumain", 4, "8", 150], ["leg_curl", 3, "10-12", 60], ["m_leg_curl_assis", 3, "12", 60], ["hip_thrust", 3, "10", 90], ["m_mollets_assis", 3, "15", 45]] },
  { id: "w_jambes_machines", nom: "Jambes – 100% machines", cat: "Jambes", niveau: 1, desc: "Jambes complètes sans barre libre.",
    ex: [["presse", 4, "12", 120], ["m_smith_squat", 3, "10", 120], ["leg_ext", 3, "15", 60], ["leg_curl", 3, "12", 60], ["m_adducteurs", 3, "15", 45], ["m_mollets_assis", 3, "15", 45]] },

  // ---------- FESSIERS ----------
  { id: "w_fessiers", nom: "Fessiers", cat: "Fessiers", niveau: 2, desc: "Hip thrust, fentes, kickback : focus fessiers.",
    ex: [["hip_thrust", 4, "10", 120], ["fentes", 3, "12/jambe", 90], ["sdt_roumain", 3, "10", 90], ["m_kickback", 3, "15/jambe", 45], ["m_abducteurs", 3, "20", 45]] },
  { id: "w_fessiers_maison", nom: "Fessiers sans machine", cat: "Fessiers", niveau: 1, desc: "Faisable n'importe où.",
    ex: [["c_squat_pdc", 4, "20", 45], ["c_fentes_marchees", 3, "12/jambe", 60], ["step_ups", 3, "12/jambe", 60], ["c_superman", 3, "15", 30], ["gainage", 3, "40 s", 30]] },

  // ---------- ABDOS ----------
  { id: "w_abdos_15", nom: "Abdos 15 min", cat: "Abdos", niveau: 1, desc: "À la fin d'une séance ou seul.",
    ex: [["crunch", 3, "20", 30], ["releve_jambes", 3, "10", 45], ["russian_twist", 3, "20", 30], ["gainage", 3, "45 s", 30]] },
  { id: "w_abdos_beton", nom: "Abdos béton", cat: "Abdos", niveau: 3, desc: "Pour les abdos déjà entraînés.",
    ex: [["c_toes_to_bar", 4, "8-10", 60], ["crunch_poulie", 4, "12-15", 45], ["m_abs", 3, "15", 45], ["c_gainage_lateral", 3, "45 s", 30], ["mountain_climbers", 3, "40 s", 30]] },

  // ---------- CARDIO / HIIT ----------
  { id: "w_hiit_20", nom: "HIIT 20 min", cat: "Cardio / HIIT", niveau: 2, desc: "Fais les exos en circuit, 30 s de repos entre chaque. Brûle un max.",
    ex: [["kb_swing", 4, "15", 30], ["mountain_climbers", 4, "30 s", 30], ["goblet", 4, "15", 30], ["pompes", 4, "max", 30], ["corde", 1, "3 min", 0]] },
  { id: "w_cardio_zone2", nom: "Cardio doux (zone 2)", cat: "Cardio / HIIT", niveau: 1, desc: "Tu dois pouvoir parler en faisant l'effort. Parfait pour brûler du gras.",
    ex: [["course_tapis", 1, "15 min", 60], ["velo", 1, "15 min", 60], ["elliptique", 1, "15 min", 0]] },
  { id: "w_cardio_fractionne", nom: "Fractionné rameur + vélo", cat: "Cardio / HIIT", niveau: 3, desc: "Alterne 30 s à fond / 30 s lent.",
    ex: [["rameur", 1, "10 min", 120], ["velo", 1, "10 min", 120], ["m_escalier", 1, "10 min", 0]] },
  { id: "w_seche_circuit", nom: "Circuit sèche", cat: "Cardio / HIIT", niveau: 2, desc: "Muscu + cardio sans pause pour garder le muscle en perdant le gras.",
    ex: [["presse", 3, "15", 30], ["tirage_vertical", 3, "15", 30], ["m_chest_press", 3, "15", 30], ["step_ups", 3, "12/jambe", 30], ["m_escalier", 1, "12 min", 0]] },

  // ---------- MACHINES ----------
  { id: "w_machines_haut", nom: "Machines – Haut du corps", cat: "Machines", niveau: 1, desc: "Technogym / Hammer Strength : simple et sûr.",
    ex: [["m_chest_press", 3, "10-12", 90], ["m_high_row", 3, "10-12", 90], ["m_shoulder_press", 3, "10-12", 90], ["m_iso_row", 3, "10-12", 90], ["pec_deck", 3, "12", 60], ["m_curl", 2, "12", 45], ["m_triceps", 2, "12", 45]] },
  { id: "w_machines_bas", nom: "Machines – Bas du corps", cat: "Machines", niveau: 1, desc: "Toutes les machines jambes de la salle.",
    ex: [["presse", 3, "12", 120], ["m_hack_squat", 3, "10", 120], ["leg_ext", 3, "15", 60], ["m_leg_curl_assis", 3, "12", 60], ["m_adducteurs", 2, "15", 45], ["m_abducteurs", 2, "15", 45], ["m_mollets_assis", 3, "15", 45]] },
  { id: "w_hammer", nom: "Hammer Strength lourd", cat: "Machines", niveau: 3, desc: "Machines à disques : charge lourd sans pareur.",
    ex: [["m_incline_press", 4, "6-8", 150], ["m_iso_row", 4, "6-8", 150], ["m_ground_base", 3, "8", 150], ["m_shrug", 3, "10", 90], ["m_dips", 3, "8-10", 90]] },

  // ---------- CALISTHÉNIE ----------
  { id: "w_cali_debutant", nom: "Calisthénie débutant", cat: "Calisthénie", niveau: 1, desc: "Les bases au poids du corps.",
    ex: [["c_australian", 3, "10", 60], ["pompes", 3, "max", 60], ["c_squat_pdc", 3, "20", 45], ["c_superman", 3, "12", 30], ["gainage", 3, "30 s", 30]] },
  { id: "w_cali_tirage", nom: "Calisthénie – Tirage", cat: "Calisthénie", niveau: 2, desc: "Tractions sous toutes leurs formes.",
    ex: [["tractions", 5, "max", 120], ["c_chin_up", 3, "max", 90], ["c_australian", 3, "12", 60], ["c_toes_to_bar", 3, "8", 60]] },
  { id: "w_cali_poussee", nom: "Calisthénie – Poussée", cat: "Calisthénie", niveau: 2, desc: "Dips, pompes et équilibre.",
    ex: [["dips", 4, "max", 120], ["c_pompes_declinees", 3, "12", 60], ["c_pompes_diamant", 3, "10", 60], ["c_hspu", 3, "5", 90], ["c_gainage_lateral", 2, "30 s", 30]] },
  { id: "w_cali_skills", nom: "Calisthénie – Skills", cat: "Calisthénie", niveau: 3, desc: "Muscle-up et pistol squat : pour les confirmés.",
    ex: [["c_muscle_up", 5, "2-3", 150], ["c_pistol", 4, "5/jambe", 90], ["c_hspu", 4, "5", 120], ["c_toes_to_bar", 3, "10", 60]] },

  // ---------- EXPRESS ----------
  { id: "w_express_push", nom: "Express 30 min – Push", cat: "Express", niveau: 2, desc: "Pas le temps ? 3 exos, l'essentiel.",
    ex: [["dev_couche", 4, "8", 90], ["dev_halteres_assis", 3, "10", 60], ["extension_poulie", 3, "12", 45]] },
  { id: "w_express_pull", nom: "Express 30 min – Pull", cat: "Express", niveau: 2, desc: "Dos et biceps en vitesse.",
    ex: [["tractions", 4, "max", 90], ["rowing_haltere", 3, "10/bras", 60], ["curl_marteau", 3, "12", 45]] },
  { id: "w_express_legs", nom: "Express 30 min – Jambes", cat: "Express", niveau: 2, desc: "Jambes en 30 minutes chrono.",
    ex: [["goblet", 4, "12", 90], ["fentes", 3, "10/jambe", 60], ["leg_curl", 3, "12", 45]] },
  { id: "w_express_fb", nom: "Express 25 min – Full body", cat: "Express", niveau: 1, desc: "Tout le corps, vite fait bien fait.",
    ex: [["m_chest_press", 3, "12", 60], ["tirage_vertical", 3, "12", 60], ["presse", 3, "12", 60], ["gainage", 2, "45 s", 30]] },

  // ---------- ÉTIREMENTS ----------
  { id: "w_stretch_haut", nom: "Étirements haut du corps", cat: "Étirements", niveau: 1, desc: "10 min après une séance haut du corps.",
    ex: [["s_pecs", 2, "30 s", 0], ["s_epaules", 2, "30 s", 0], ["s_triceps", 2, "30 s", 0], ["s_biceps", 1, "30 s", 0], ["s_dorsaux", 2, "30 s", 0], ["s_nuque", 2, "20 s", 0]] },
  { id: "w_stretch_bas", nom: "Étirements bas du corps", cat: "Étirements", niveau: 1, desc: "10 min après les jambes.",
    ex: [["s_quadriceps", 2, "30 s", 0], ["s_ischios", 2, "30 s", 0], ["s_hanches", 2, "30 s", 0], ["s_fessiers", 2, "30 s", 0], ["s_adducteurs", 1, "45 s", 0], ["s_mollets", 2, "30 s", 0]] },
  { id: "w_mobilite", nom: "Mobilité matin / repos", cat: "Étirements", niveau: 1, desc: "Pour se dérouiller les jours sans salle.",
    ex: [["s_worlds", 2, "5/côté", 0], ["s_chat", 1, "10", 0], ["s_haut_dos", 1, "30 s", 0], ["s_hanches", 2, "30 s", 0], ["s_enfant", 1, "60 s", 0]] },
];
