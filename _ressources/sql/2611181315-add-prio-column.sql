-- Colonne « Prio ciné » (plan 2611181315 — onglet Listes)
-- À exécuter une seule fois dans le SQL editor Supabase. Rejouable : `if not exists`.
--
-- Ajoute à la table `calendar` :
--   - prio : film en salle qu'Alexis veut voir en priorité (bloc « Prio ciné » de l'onglet Listes,
--            étoile jaune devant le titre). Remis à false quand le film sort des salles (il passe
--            alors dans « À rattraper »), passe en « vu », change de média ou quitte la liste.
--
-- Pas d'horodatage d'ajout, contrairement à `catchup_at` (`2608041130`) : la liste est triée par
-- date de sortie, jamais par ordre d'ajout. Un booléen suffit.
--
-- `not null default false` : les lignes existantes ne sont pas en prio, aucun backfill.
--
-- Droits : rien à ajouter. Les policies de `calendar` sont par ligne (`2609231045`, `2609231743`)
-- et couvrent la nouvelle colonne comme `catchup`. La lecture des listes partagées passe par
-- `useSharedLists`, qui énumère ses colonnes : `prio` n'y figure pas, l'étoile ne s'affiche donc pas
-- chez les autres comptes (décision 6 du plan).
--
-- Tant que cette migration n'est pas jouée, l'app tourne sans la colonne : `isMissingSchema` la
-- détecte, l'onglet Listes montre une Prio ciné vide et aucune écriture `prio` n'est envoyée.

alter table calendar
  add column if not exists prio boolean not null default false;
