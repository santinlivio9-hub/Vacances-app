# 🧳 Budget Voyage

Simulateur de coût de vacances. On choisit une destination, le nombre de voyageurs, la durée, le niveau de confort et sa ville de départ, et l'application calcule le coût du voyage poste par poste. Un mode « budget inversé » indique aussi où partir avec une somme donnée.

**Site en ligne : https://santinlivio9-hub.github.io/Vacances-app/**

L'application tourne entièrement dans le navigateur : pas de serveur ni de clé d'API. Les prix sont des estimations moyennes constatées en 2026 (voir [src/data/SOURCES.md](src/data/SOURCES.md)).

## Avancement

- [x] Phase 1 — Données : 12 destinations, toutes les communes de France comme villes de départ, aéroports, barème des transports
- [ ] Phase 2 — Moteur de calcul
- [ ] Phase 3 — Interface (simulateur, mode budget, récap, simulations sauvegardées)
- [ ] Phase 4 — Finitions et documentation complète

## Lancer en local

```bash
npm install
npm run dev      # http://localhost:5173/Vacances-app/
npm test         # tests du moteur et des données
npm run build    # version de production dans dist/
```

## Stack

Vite, React, TypeScript, Tailwind CSS, Recharts et Vitest. Le site est déployé automatiquement sur GitHub Pages par GitHub Actions à chaque push sur `main`.

## Organisation

```
src/
  data/       données JSON versionnées (destinations, transports, communes…) + SOURCES.md
  engine/     moteur de calcul : fonctions pures, testées
  components/ composants d'interface
  lib/        formatage et libellés
scripts/      génération de la liste des communes
```
