# Sources des données

Mise à jour du **24 novembre 2026** (refonte). Ce sont des **ordres de grandeur arrondis**, pas des devis.

## Refonte : modèle de coût par pays

Le coût d'un voyage se calcule comme suit : **prix de référence France** (`prixBase.json`) × **indice du pays** (`pays.json`) × **coefficient de saison** × **niveau de confort**.

- **`pays.json`** : 78 pays, avec un indice de coût de la vie pour un voyageur (France = 1,0) et une valeur par défaut pour chacun des 8 continents ou régions. Un pays absent de la base prend la valeur de son continent.
  - Les indices sont des arrondis établis à partir de comparateurs de coût de la vie (Numbeo 2025–2026, baromètre Post Office 2026, prix hôteliers cités plus bas).
  - Ils ont été vérifiés contre les 12 fiches détaillées de 2026 (`reference/destinations-2026.json`). Exemples : Portugal 0,78 (Lisbonne 120 € contre Nice 135 € en hôtel moyen), Tchéquie 0,70, États-Unis 1,35, Thaïlande 0,50.
  - Mois de haute et basse saison : climat et vacances scolaires.
- **`prixBase.json`** : prix France 2026 par niveau (Éco / Équilibré / Confort).
  - Logement : camping, auberge, hôtel 2-3-4★, appartement.
  - Repas : courses, snack, restaurant simple / moyen / gastronomique.
  - Transport sur place, activités par type, assurance et souvenirs.
  - Les prix de l'hôtel 3★ « équilibré » (120 €) et des repas reprennent les moyennes françaises de la première version (Nice, Biarritz, Annecy, Marseille).
- **`transport.json`** : barèmes de la première version (voiture 0,208 €/km, train 0,12 €/km, avion dégressif), avec en plus :
  - le **car** longue distance : 0,06 €/km, de 10 à 110 € par trajet, d'après les tarifs constatés de FlixBus et BlaBlaCar Bus ;
  - les **classes** de voyage, les **bagages en soute** (environ 35 € par trajet sur les compagnies européennes) ;
  - les **seuils de réalisme** : pas d'avion sous 300 km, pas de train au-delà de 1 800 km, pas de car au-delà de 1 600 km.
- **Enfants** : 70 % du prix adulte pour les repas et les activités, 100 % pour le transport et le logement.

## Services en ligne (gratuits, sans clé)

| Service | Usage | Règles respectées |
| --- | --- | --- |
| [Photon](https://photon.komoot.io) (komoot) | Autocomplétion des adresses | Saisie débouncée (300 ms), cache ; repli sur les communes embarquées |
| [Nominatim](https://operations.osmfoundation.org/policies/nominatim/) | Adresse d'un point cliqué ; recherche de secours | 1 requête/s maximum, jamais en autocomplétion, cache |
| [OSRM, serveur de démonstration](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server) | Distance et durée en voiture | Un appel par trajet, cache ; repli vol d'oiseau × 1,25 |
| [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | Lieux à visiter | Rayon limité (≈ 12 km), 150 résultats maximum, un appel par destination, cache |
| [Wikipédia](https://fr.wikipedia.org/api/rest_v1/) | Résumés, photos, lieux géolocalisés | Cache, liens vers les articles (licence CC BY-SA) |
| [CARTO](https://carto.com/attributions) / OpenStreetMap | Fond de carte | Attribution affichée sur la carte |

Les données OpenStreetMap sont sous licence [ODbL](https://www.openstreetmap.org/copyright) : l'attribution « © OpenStreetMap » est affichée sur la carte et dans le pied de page.

---

# Sources de la première version (12 destinations)


Données compilées le **23 novembre 2026**. Ce sont des **ordres de grandeur arrondis**, pas des devis : les prix réels dépendent des dates, de la date de réservation et des disponibilités. L'application affiche toujours la mention « Estimation indicative — prix moyens constatés en 2026 ».

## Méthode

| Niveau | Logement (`logement`, € / nuit, chambre double ou logement 2 pers.) | Repas (`repas`, € / pers. / jour, 3 repas) |
| --- | --- | --- |
| `eco` | hôtel 1–2★, chambre privée en auberge, logement simple | boulangerie, supermarché, un repas simple au restaurant |
| `moyen` | hôtel 3★ ou logement entier correct | un repas au restaurant par jour, le reste plus simple |
| `confort` | hôtel 4★ et plus | restaurants midi et soir |

- Les prix de logement du fichier sont des prix de **moyenne saison**. La haute et la basse saison s'obtiennent avec les multiplicateurs `saison` de chaque destination. Les moyennes « été 2026 » publiées ont donc été divisées par le coefficient de haute saison.
- `activites` est un budget moyen par personne et par jour (entrées, visites, sorties). `activitesSuggerees` donne des prix publics indicatifs par personne, arrondis.
- `transportLocal` couvre les transports en commun et quelques taxis ou VTC, par personne et par jour.
- Les montants à l'étranger sont convertis en euros avec des taux de change approximatifs (environ 1 € = 1,15 $ US = 37 THB = 11 MAD = 25 CZK).

## Logement

- Été 2026 en France, prix moyen de l'hébergement : Marseille ≈ 188 €, Nice ≈ 175 €, Biarritz ≈ 212 € par nuit (étude cozycozy, reprise par la presse) :
  [Ulysse](https://ulysse.com/news/nuitee-ete-couter-double), [Paris Zigzag](https://www.pariszigzag.fr/marseille-actu/prix-hebergements-marseille-ete/), [Bourse Inside](https://bourseinside.fr/?p=11174)
- Baromètres hôteliers MKG pour la Côte d'Azur, 2026 : [Explore Nice Côte d'Azur](https://www.explorenicecotedazur.com/app/uploads/2026/10/mkg-barometre-de-lhotellerie-cote-dazur-aout-2026.pdf)
- Europe : hôtel milieu de gamme en 2026, Rome ≈ 202 $, Barcelone ≈ 196 $, Lisbonne ≈ 150 $, Prague ≈ 146 $ ([Statranker](https://statranker.org/?p=10219)). Prix moyen à Pâques 2026 : Amsterdam 282 €, Rome 352 €, Prague 172 € ([Travel Daily News](https://www.traveldailynews.com/statistics-trends/krakow-and-budapest-lead-affordable-easter-travel-demand-across-europe/)). Voir aussi [Which? / Post Office City Costs Barometer 2026](https://www.which.co.uk/news/article/best-value-euro-city-a0aKJ5N89qRT).
- New York : record de 468 $ en moyenne en septembre 2026, environ 203 $ pour un hôtel économique (CoStar, via [Rus Tourism News](https://www.rustourismnews.com/2026/11/02/new-york-hotel-prices-hit-record-468-a-night-as-holiday-season-approaches/) et [Latin Times](https://www.latintimes.com/new-york-city-hotel-rates-record-2026-601084)) ; [Engine](https://engine.com/data/hotel-prices/new-york-ny)
- Bangkok : prix moyen de 3 660 THB au 2ᵉ trimestre 2026 ([Cushman & Wakefield](https://assets.cushmanwakefield.com/-/media/cw/marketbeat-pdfs/2026/q2/apac-and-gc/thailand-bangkok-hotel-mb-2q2026.pdf)), 4 013 THB au 1ᵉʳ semestre 2026 ([Knight Frank](https://content.knightfrank.com/research/2972/documents/en/bangkok-phuket-hotel-market-h1-2026-12985.pdf))
- Marrakech : riad standard entre 100 et 180 € en mi-saison et entre 70 et 130 € en été ([Luxe Admiral](https://www.luxe-admiral.com/blog/location-riad-marrakech-guide)) ; hôtel 3★ ≈ 93 € ([combien-coute.net](https://www.combien-coute.net/hotel3/maroc/marrakech/))

## Repas

- Dîner pour deux dans un restaurant moyen en Europe, carte 2026 : [FerryGoGo](https://ferrygogo.com/?p=67048). Voir aussi [Travelsupermarket](https://www.travelsupermarket.com/en-gb/blog/fun/cheap-eats-european-cities-ranked-by-price-of-a-meal/) et [Statranker, prix des repas 2026](https://statranker.org/?p=11100).
- Prague parmi les capitales les moins chères pour manger : [Expats.cz](https://www.expats.cz/czech-news/article/despite-rising-costs-prague-ranks-among-europe-s-cheapest-dining-destinations)

## Transport (`transport.json`)

Les distances sont calculées à vol d'oiseau (formule de haversine), puis multipliées par **1,2** pour la route et le rail. Tous les trajets sont comptés en **aller-retour**.

- **Voiture : 0,208 € par km et par véhicule.** Carburant : 6,5 L/100 km × 2,05 €/L ≈ 0,133 €/km. Relevés de novembre 2026 : gazole ≈ 2,16 €/L, SP95-E10 ≈ 1,99 €/L ([Roole, 18/11/2026](https://media.roole.fr/quotidien/au-volant/prix-des-carburants-voici-les-tarifs-en-france-ce-mercredi-18-novembre-2026), [Connaissance des énergies / AFP](https://www.connaissancedesenergies.org/afp/carburants-la-baisse-du-prix-du-gazole-debut-novembre-loin-de-compenser-la-hausse-depuis-fevrier-261110)). Péages : environ 0,09 à 0,115 € par km d'autoroute ([tolltickets](https://tolltickets.com/fr/blog/france-toll-roads-telepeage-guide/), [hausse 2026](https://mondial.paris/actualites/auto-pratique/prix-des-peages-2026-hausse-des-tarifs-des-autoroutes-des-fevrier-53179.html)). Moyenne retenue : 0,075 €/km sur l'ensemble du trajet, car tout n'est pas payant (routes nationales, Espagne, Allemagne…). 4 places par véhicule.
- **Train : 0,12 € par km et par personne**, avec au moins 15 € et au plus 150 € par trajet. Le TGV INOUI coûte en moyenne 0,20 €/km en 2026 dans les relevés de [Que Choisir](https://www.quechoisir.org/actualite-tarifs-sncf-au-kilometre-2026-le-kilometre-de-tgv-toujours-plus-cher-n174790/), mais OUIGO et les réservations anticipées coûtent bien moins cher (billet OUIGO moyen ≈ 35 € selon la [FNAUT](https://www.tourmag.com/SNCF-La-FNAUT-denonce-l-envolee-des-prix-Ouigo-et-le-recul-de-l-offre-Inoui_a130519.html)). La valeur retenue est un compromis entre les deux.
- **Avion : forfait de 45 € par trajet, plus un prix par km dégressif par tranche** (0,07 €/km jusqu'à 1 000 km, 0,035 €/km de 1 000 à 3 000 km, 0,04 €/km au-delà). Le résultat est multiplié par 0,9 en basse saison et par 1,25 en haute saison. Pas d'avion pour moins de 300 km. Repères : aller-retour moyen Paris–Bangkok ≈ 931 € en juillet ([Où et quand](https://www.ou-et-quand.net/vols/thailande/bangkok/mois/juillet/)) ; tarifs Air France Paris–New York entre 258 et 509 € selon la saison ([Air Journal](https://www.air-journal.fr/?p=271461)) ; baisse des prix vers le Maroc ([L'Écho touristique](https://www.lechotouristique.com/distribution/billets-d-avion-ces-destinations-ou-les-prix-baissent-malgre-l-envolee-du-kerosene)).
- **Accès à l'aéroport** : si la commune de départ est à plus de 30 km de l'aéroport le plus proche, ce trajet est compté à 0,12 € par km et par personne.

Résultats du barème au départ de Paris, en moyenne saison :

| Destination | Avion A/R / pers. | Train A/R / pers. | Voiture A/R / véhicule |
| --- | --- | --- | --- |
| Nice (685 km) | 186 € | 197 € | 342 € |
| Barcelone (831 km) | 206 € | 239 € | 415 € |
| Lisbonne (1 453 km) | 262 € | — | 726 € |
| Marrakech (2 102 km) | 307 € | — | — |
| New York (5 837 km) | 597 € | — | — |
| Bangkok (9 443 km) | 885 € | — | — |

## Activités suggérées

Prix publics par adulte, arrondis, d'après les sites officiels des lieux (2025–2026). Ils n'ont pas été revérifiés un par un et peuvent changer : par exemple la Sagrada Família, les musées du Vatican, l'Empire State Building ou le Rijksmuseum.

## Liens de réservation (`src/engine/liens.ts`)

Liens testés le 23/11/2026 dans un navigateur automatisé :

| Site | Ce qui est transmis | Vérification |
| --- | --- | --- |
| Airbnb | ville, dates, voyageurs (`/s/Ville--Pays/homes?checkin=&checkout=&adults=`) | ✅ tout est pré-rempli |
| Booking.com | ville, dates, voyageurs, chambres (`ss`, `checkin`, `checkout`, `group_adults`, `no_rooms`) | ✅ ville et voyageurs repris ; dates non confirmées à cause de la protection anti-robot. Format repris par plusieurs sources : [Apify](https://apify.com/scrapyspider/booking-com-scraper.md), [Browserless](https://cloud.browserless.io/skills/booking.com/search-booking-hotel-prices) |
| Skyscanner | aéroports, dates au format AAMMJJ, voyageurs (`/transport/vols/cdg/nce/270601/270608/?adultsv2=2`) | ⚠️ captcha anti-robot, test impossible. Format documenté par [Apify](https://apify.com/memo23/skyscanner-scraper?fpr=data). Les codes de ville (PAR, NYC, ROM) sont remplacés par l'aéroport principal (CDG, JFK, FCO) |
| Google Flights | — | ❌ le paramètre `q` n'a pas été pris en compte : simple lien de recherche |
| SNCF Connect, Trainline | — | pas de recherche par URL stable : simples liens |
| GetYourGuide | nom de la ville (`/s/?q=Nice`) | ⚠️ accès bloqué aux robots ; dates non transmises car leur format n'est pas confirmé ([Apify](https://apify.com/abotapi/getyourguide-scraper)) |
| Google Maps (voiture) | départ, arrivée (`/maps/dir/?api=1&origin=&destination=&travelmode=driving`) | ✅ format officiel des URL Google Maps |

## Communes et aéroports

- **Communes** (`communes.json`) : 34 746 communes de France métropolitaine et de Corse, avec leur position et leurs codes postaux. Source : [geo.api.gouv.fr](https://geo.api.gouv.fr) (Etalab, Licence Ouverte 2.0), récupérées le 23/11/2026. Pour régénérer le fichier : `npm run donnees:communes`.
- **Aéroports** (`aeroports.json`) : 22 aéroports de départ en France. Coordonnées arrondies au kilomètre. « PAR » regroupe Roissy-CDG et Orly.
