# 🧳 Budget Voyage

Simulateur de coût de vacances. On choisit une destination, le nombre de voyageurs, la durée, le niveau de confort et sa ville de départ, et l'application calcule le coût du voyage poste par poste. Un mode « budget inversé » indique aussi où partir avec une somme donnée.

**Site en ligne : https://santinlivio9-hub.github.io/Vacances-app/**

L'application tourne entièrement dans le navigateur : pas de serveur ni de clé d'API. Les prix sont des estimations moyennes constatées en 2026 (voir [src/data/SOURCES.md](src/data/SOURCES.md)).

## Avancement

- [x] Phase 1 — Données : 12 destinations, toutes les communes de France comme villes de départ, aéroports, barème des transports
- [x] Phase 2 — Moteur de calcul : coût du voyage, mode budget, liens de réservation (112 tests)
- [ ] Phase 3 — Interface (simulateur, mode budget, récap, simulations sauvegardées)
- [ ] Phase 4 — Finitions et documentation complète

## Règles de calcul (`src/engine/`)

- **Logement** : une chambre pour deux voyageurs (`ceil(personnes / 2)`) × nuits × prix de la nuit × coefficient de saison.
- **Repas, activités, transport sur place** : par personne et par jour, avec un jour par nuit. Les jours d'arrivée et de départ sont en partie pris par le trajet.
- **Activités cochées** : prix indicatif × nombre de voyageurs.
- **Transport**, toujours en aller-retour :
  - voiture : une voiture pour 4, carburant et péages au km ;
  - train : prix au km par personne, avec un minimum et un plafond ;
  - avion : forfait plus un barème dégressif, majoré en haute saison. Le vol part de l'aéroport le plus proche, et le trajet jusqu'à l'aéroport est compté s'il dépasse 30 km.
  - Distances : vol d'oiseau, × 1,2 pour la route et le rail.
- **Mode impossible** (voiture pour New York, avion sous 300 km…) : le calcul bascule sur le mode possible le moins cher et affiche un avertissement.
- **Saison** : déduite du mois de départ, ou choisie à la main (moyenne saison sans date).
- **Imprévus** : 10 % du sous-total par défaut, réglable.
- **Mode budget** :
  - les imprévus sont mis de côté, puis le transport reçoit son coût réel ;
  - le reste est réparti en 35 / 25 / 15 entre logement, repas et activités ;
  - pour chaque destination, on retient le meilleur confort qui tient dans le budget : vert s'il reste au moins 10 % de marge, orange entre 0 et 10 %, rouge si le budget est dépassé.

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
