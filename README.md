# 🏋️ GymTrack

Appli mobile **100% gratuite** pour la muscu : séances, progression, nutrition et suivi corporel.
C'est une *PWA* (application web installable) : pas besoin de store, elle s'installe sur l'écran d'accueil et marche hors-ligne.
Toutes les données restent **sur ton téléphone** (aucun compte, aucun serveur).

## Fonctionnalités

- **Séances** : séries / reps / kg, poids du corps, gainage (secondes), cardio (min + km).
  Affiche ce que tu as fait la dernière fois, chrono de repos automatique (vibration + bip), détection des records 🏆.
- **Ressenti** : fatigue /10, humeur et notes à la fin de chaque séance.
- **Progrès** : pour chaque exercice, comparaison avec la fois d'avant (plus lourd, plus de reps, tenu plus longtemps…) + courbes (1RM estimé, charge max, volume).
- **Agenda** : calendrier des jours à la salle, heure d'arrivée / départ et temps passé (bouton « J'arrive » / « Je pars »).
- **Exercices** : ~100 exercices en français avec images du mouvement, silhouette des muscles (vert = principal, jaune = secondaire), étapes, conseils et erreurs à éviter.
  Machines Technogym / Hammer Strength (type Fitness Park), calisthénie et étirements. Une machine absente de ta salle peut être masquée.
- **Défi du jour** : 4 exos maison (pompes, squats, gainage, tractions…), série de jours 🔥, niveau qui monte, chrono, tests de records.
- **Rangs** : Fer → Bronze → Argent → Or → Platine → Diamant → Champion sur chaque exo, calculés selon ton poids (1RM estimé) ou tes reps max.
- **Schéma anatomique détaillé** : muscles découpés en chefs, vue zoomée avec le nom de chaque muscle.
- **Séances toutes faites** : 41 séances prêtes (full body, pecs, dos, jambes, fessiers, HIIT, machines, calisthénie, express 30 min, étirements…).
- **Eau** : compteur de verres avec objectif journalier.
- **Apple Santé** : envoi de l'eau, du poids, des séances et des calories via l'app Raccourcis de l'iPhone (guide dans Réglages → Apple Santé).
- **Programmes** : débutant, 100% machines, prise de masse (PPL, haut/bas), sèche, perte de poids, force 5×5, calisthénie, étirements.
- **Nutrition** : scan du code-barres (base Open Food Facts), recherche de produits, aliments de base, saisie manuelle.
  Calcul automatique des calories et macros selon la quantité, objectif journalier calculé selon ton profil et ton objectif.
- **Corps** : poids, % de gras, masse musculaire, tours de taille/bras/poitrine/cuisse, IMC, courbes.
- **Sauvegarde** : export / import d'un fichier JSON (Réglages ⚙︎).

## Mettre l'appli sur ton téléphone (gratuit)

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : Deploy from a branch**,
   choisis la branche `main` et `/ (root)` → **Save**.
2. Après 1-2 minutes, l'appli est en ligne sur : https://lamangueuhhh.github.io/gymtrack/
3. Ouvre ce lien sur ton téléphone :
   - **Android (Chrome)** : menu ⋮ → *Installer l'application*.
   - **iPhone (Safari)** : bouton Partager → *Sur l'écran d'accueil*.

Le scanner de code-barres a besoin de HTTPS (c'est le cas avec GitHub Pages) et de l'autorisation caméra.

## Tester sur l'ordi

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page |
| `style.css` | Design (thème sombre) |
| `app.js` | Toute la logique de l'appli |
| `data.js` | Exercices, programmes, objectifs |
| `defi.js` | Défi quotidien |
| `ranks.js` | Rangs et standards de force |
| `seances.js` | Séances toutes faites |
| `data-extra.js` | Machines de la salle, calisthénie, étirements |
| `bodymap.js` | Silhouette des muscles travaillés |
| `foods.js` | Aliments de base (valeurs / 100 g) |
| `sw.js` + `manifest.json` | Mode hors-ligne et installation |
| `vendor/` | Chart.js (graphiques) et html5-qrcode (scanner) |

Crédits : images d'exercices [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domaine public),
données alimentaires [Open Food Facts](https://world.openfoodfacts.org) (licence ODbL).
