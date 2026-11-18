# Onglet Listes et Prio ciné — mode d'emploi et pièges

Ce que fait l'onglet « Listes », comment ses deux listes s'échangent des films d'elles-mêmes, et ce
qui casse si on touche au mauvais endroit.

Plan d'origine : `_ressources/plans/2611181315-onglet-listes-prio-cine.md`.
Migration : `_ressources/sql/2611181315-add-prio-column.sql`.
Maquette : `_ressources/tmpl/Timeline.html`.

---

## 1. L'onglet

- Route **`/[year]/mes-listes`** — et pas `/[year]/listes`, déjà pris par les listes partagées
  (`/[year]/listes/[user]`). Onglet « Listes » (signet) entre Timeline et Stats, sans compteur.
- Trois blocs empilés (`app/components/ListsView.vue`) :
  1. **Prio ciné** (`lists/Prio.vue`) — toutes années confondues ;
  2. **Top 10 Letterboxd** (`lists/TopRated.vue`) — année choisie, déplacé depuis Stats ;
  3. **À rattraper** (`lists/Catchup.vue`) — année choisie, déplacé depuis Stats, **sans plafond**.
- Stats ne montre plus ces deux derniers ; les notes Letterboxd se rafraîchissent à l'ouverture de
  Listes (`layouts/default.vue`), le Top 10 étant leur seul lecteur.

### Prio ciné

Les films **en salle** qu'on veut voir en premier.

- Tri par date de sortie croissante — le plus ancien quittera l'affiche le premier. Date manuelle si
  posée, sinon TMDB ; sans date en fin, puis titre.
- Carte = lien vers la vue Séances cadrée sur le film. Pas de tag « En salle » : toute la liste l'est.
- Deux façons d'ajouter :
  - le slot « Ajouter » → popin (`lists/FilmPicker.vue`, partagée avec À rattraper) : **mes** films
    en salle, recherche dans ces films seulement (pas de TMDB : un film hors de ma liste n'a pas
    d'état « en salle ») ;
  - le menu ⋯ d'une ligne de la Timeline → « Ajouter aux prios », proposé **seulement** pour un film
    en salle ; « Retirer des prios » toujours.
- Étoile jaune (`PrioStar.vue`, `$color-prio`) devant le titre : Timeline, rail « Au ciné en ce
  moment », Séances, Événements. **Jamais** dans la liste d'un autre compte. Dans la Timeline, c'est
  un bouton : un clic retire le film des prios (focus rendu au bouton ⋯ de la ligne).
- Aucun plafond.

---

## 2. Les règles

Toutes dans `app/utils/prioCine.js`, pures et couvertes par `npm test` (famille 19).

| Situation | Effet |
|---|---|
| Prio passée en « vu » | Quitte les prios. **Ne va pas** dans À rattraper : il n'y a plus rien à rattraper. |
| Prio passée en streaming (média ≠ cinéma) | Quitte les prios. |
| Prio sans séances (état ≠ « en salle ») | → **À rattraper** de son année de sortie (année courante si sans date). Déjà dans À rattraper → quitte seulement les prios. |
| Film d'À rattraper vu à l'affiche par la synchro | → **Prio ciné**, et quitte À rattraper. |
| Ajout manuel en prio d'un film d'À rattraper | Quitte À rattraper : les deux listes s'excluent. |
| Film en salle | N'entre pas dans À rattraper : l'entrée du menu ⋯ disparaît (sauf pour l'en retirer), la popin et son repli TMDB l'écartent. |
| Film supprimé | La ligne disparaît, rien à faire. |

« A des séances » se lit `state === 'inTheaters'` : c'est l'état que `useInTheatersSync` tient depuis
Allociné (cf. `README-seances.md`).

---

## 3. Qui applique quoi, et quand

Deux sens de circulation, et une asymétrie voulue.

- **Prio → À rattraper** est un *invariant* : `prioExitPatch` se vérifie à tout moment sur l'état d'un
  film. `useMovieCalendar.reconcilePrio()` l'applique :
  - en fin de `getMovies` (chaque chargement) ;
  - après l'écriture des verdicts de `syncInTheaters` et de `pruneEmptyHorizon`.
  Elle est idempotente : un transfert dont l'écriture a raté est rattrapé au passage suivant.
- **État et média** passent par `useMovieCalendar.setState` / `setMedia` : le retrait des prios
  voyage dans **la même** requête `update`, jamais une étoile sur un film vu.
- **À rattraper → prio** est un *événement* : il n'a de sens que sur une **preuve** de séances.
  `promoteReturnedToPrio(ids)` n'est appelée que par `syncInTheaters`, avec les films que le contrôle
  Allociné vient de voir à l'affiche (verdict `true`, écrit).

⚠️⚠️ **Jamais dans `applyAutoInTheaters`, ni dans `reconcilePrio`.** La promotion « en salle » du
chargement est *optimiste* : un film de l'année, sorti, jamais contrôlé, passe « en salle » sans
qu'Allociné ait rien dit. Y brancher la ressortie ferait sauter en prio un film qu'on vient de ranger
dans À rattraper — et il en ressortirait au contrôle suivant.

**Délai assumé** : la synchro tourne au plus une fois par semaine ciné, et seulement app ouverte.
`pruneEmptyHorizon` accélère le cas d'une prio sortie de l'affiche en cours de semaine, quand la vue
Séances ou Événements a relevé l'horizon entier.

---

## 4. Pièges

- **`yearOf(null)` vaut 1970** (`new Date(null)` est l'epoch). Pour l'année d'un film : `yearOfMovie`
  (`app/utils/movieDate.js`), qui rend `null`. Sans ça, une prio sans date partait dans « À rattraper
  1970 », invisible de toutes les vues.
- **Migration pas jouée** : `select('*')` ne lève pas sur une colonne absente, il ne la ramène pas.
  `getMovies` le détecte (clé `prio` absente des lignes), et une écriture le confirme
  (`isMissingSchema`) : plus aucune écriture `prio`, un seul avertissement en console, Prio ciné vide.
- **`MovieListItem` n'écrit plus en base.** Il émet `state-changed` / `media-changed`, la page appelle
  le composable. Avant, `movies` restait sur l'ancienne valeur jusqu'au rechargement. Conséquence
  voulue : les effets sont **immédiats** — avec un filtre « Envie de voir » actif, une ligne passée en
  « vu » disparaît tout de suite, et le rail se met à jour sans rechargement.
- **`reconcilePrio` est attendue** dans `getMovies`, **avant** `recheckUpcomingCinema` : celle-ci
  réassigne `movies` depuis une copie prise avant son `await`, et effacerait des transferts appliqués
  entre-temps.
- **Listes partagées** : `useSharedLists` énumère ses colonnes et ne lit pas `prio` — l'étoile ne sort
  pas chez les autres comptes. La colonne reste lisible par leur API, comme toutes celles de
  `calendar` (la policy de partage est par ligne) : c'est un choix d'affichage, pas un secret.
- **Boutons à `aria-label`** (rail, lignes d'Événements) : l'`aria-label` remplace le contenu, donc le
  nom « Prio ciné » de l'étoile y serait muet. Il est écrit dans le libellé (« Voir les séances de X,
  en prio ciné »).
- **Popin** : la page derrière est `inert` (`app/utils/inertOutside.js`) ; l'inertie est levée
  **avant** de rendre le focus au slot « Ajouter », sinon il tomberait sur `<body>`. Le déclencheur est
  passé explicitement (`returnFocus`) : Safari ne donne pas le focus à un bouton cliqué.

---

## 5. Actions manuelles

1. **Jouer la migration** `_ressources/sql/2611181315-add-prio-column.sql` dans le SQL editor Supabase
   (rejouable).
2. À savoir : les films déjà dans À rattraper **et encore en salle** passeront en prio à la prochaine
   synchro hebdomadaire. C'est la règle de ressortie qui s'applique à l'existant.

---

## 6. Où vit quoi

| Fichier | Rôle |
|---|---|
| `app/utils/prioCine.js` | Règles pures : entrée, tri, suggestions, sortie, ressortie, libellés |
| `app/utils/movieDate.js` | `dayMonthShort` (« 04 NOV »), partagé avec le rail |
| `app/utils/inertOutside.js` | Inertie autour d'une modale imbriquée |
| `app/composables/useMovieCalendar.js` | `setPrio`, `setState`, `setMedia`, `reconcilePrio`, `promoteReturnedToPrio` |
| `app/composables/useInTheatersSync.js` | Branche les transferts sur les verdicts Allociné |
| `app/composables/usePrioToggle.js` | Ajout / retrait + annonce dans la zone live du layout |
| `app/components/lists/*.vue` | Prio, Top 10, À rattraper, popin partagée |
| `app/components/ListsView.vue`, `app/pages/[year]/mes-listes.vue` | Vue et page |
| `app/components/PrioStar.vue` | L'étoile (`role="img"`, « Prio ciné ») |
| `app/components/MovieActionsBtn.vue` | Menu ⋯ : entrée prio, règle « À rattraper », retour du focus |
