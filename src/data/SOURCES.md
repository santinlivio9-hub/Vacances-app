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
  - les **seuils de réalisme** : pas d'avion sous 400 km (aucune ligne régulière entre villes aussi proches, Troyes–Annecy par exemple), pas de train au-delà de 1 800 km, pas de car au-delà de 1 600 km.
- **Enfants** : 70 % du prix adulte pour les repas et les activités, 100 % pour le transport et le logement.

## Services en ligne (gratuits, sans clé)

| Service | Usage | Règles respectées |
| --- | --- | --- |
| [Photon](https://photon.komoot.io) (komoot) | Autocomplétion des adresses | Saisie débouncée (300 ms), cache ; repli sur les communes embarquées |
| [Nominatim](https://operations.osmfoundation.org/policies/nominatim/) | Adresse d'un point cliqué ; recherche de secours | 1 requête/s maximum, jamais en autocomplétion, cache |
| [OSRM, serveur de démonstration](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server) | Distance et durée en voiture | Un appel par trajet, cache ; repli vol d'oiseau × 1,25 |
| [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | Lieux à visiter | Rayon limité (≈ 12 km), 150 résultats maximum, un appel par destination, cache |
| [Wikipédia](https://fr.wikipedia.org/api/rest_v1/) | Résumés, photos, lieux géolocalisés | Cache, liens vers les articles (licence CC BY-SA) |
| [Tuiles OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) | Fond de carte (CARTO exige une clé depuis septembre 2026) | Attribution affichée sous la carte, usage modéré |

Les données OpenStreetMap sont sous licence [ODbL](https://www.openstreetmap.org/copyright) : l'attribution « © OpenStreetMap » est affichée sur la carte et dans le pied de page.

---

## Moteur de calcul (refonte)

- **Coûts** (`src/engine/couts.ts`) : prix de référence France × indice du pays × coefficient de saison (logement). Enfants : 70 % pour repas, activités et souvenirs, 100 % pour le transport et le logement. Imprévus : pourcentage du reste.
- **Transport** (`src/engine/transport.ts`) : un mode est refusé avec une raison s'il est irréaliste (pas de route, trop long, vol de moins de 400 km).
- **Budget** (`src/engine/budget.ts`) : chaque piste d'économie est chiffrée en relançant l'estimation. Le plan proposé applique d'abord des pistes ciblées ; changer de style n'intervient que si c'est nécessaire.
- **Itinéraire** (`src/engine/itineraire.ts`) : les lieux sont notés (intérêts, notoriété, distance au centre, part de hasard réglée par une graine), puis regroupés par k-moyennes (un quartier par jour). Premier et dernier jour allégés, horaires indicatifs. Sans lieux trouvés : activités génériques.
- **Réservations** (`src/engine/liens.ts`) : liens publics pré-remplis quand le site accepte des paramètres dans l'adresse (Booking.com, Airbnb, BlaBlaCar, Google Vols, Google Maps, GetYourGuide), sinon page d'accueil. Aucun lien d'affiliation. Formalités indicatives, à vérifier sur diplomatie.gouv.fr.

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
- **Avion : forfait de 45 € par trajet, plus un prix par km dégressif par tranche** (0,07 €/km jusqu'à 1 000 km, 0,035 €/km de 1 000 à 3 000 km, 0,04 €/km au-delà). Le résultat est multiplié par 0,9 en basse saison et par 1,25 en haute saison. Pas d'avion pour moins de 400 km. Repères : aller-retour moyen Paris–Bangkok ≈ 931 € en juillet ([Où et quand](https://www.ou-et-quand.net/vols/thailande/bangkok/mois/juillet/)) ; tarifs Air France Paris–New York entre 258 et 509 € selon la saison ([Air Journal](https://www.air-journal.fr/?p=271461)) ; baisse des prix vers le Maroc ([L'Écho touristique](https://www.lechotouristique.com/distribution/billets-d-avion-ces-destinations-ou-les-prix-baissent-malgre-l-envolee-du-kerosene)).
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

## Version 3 : logements, séjours longs, propositions

### Logements à la nuit (`prixBase.json` → `logement`)

| Type | Prix Équilibré (France, 2 pers.) | Sources et remarques |
| --- | --- | --- |
| Chambre dans un logement (Airbnb) | 60 € / nuit | ordre de grandeur des chambres privées en ville moyenne (annonces Airbnb, 2025–2026) |
| Chez l'habitant | 58 € / nuit | chambres d'hôtes simples et chambres chez l'habitant (Gîtes de France, Airbnb) |
| Auberge, chambre privée | 78 € / nuit | chambres doubles des auberges HI et privées (Hostelworld) |
| Gîte (jusqu'à 4 pers.) | 105 € / nuit | moyenne des gîtes ruraux à la semaine ramenée à la nuit (Gîtes de France) |
| Frais Airbnb | ménage 50 €, service ≈ 14 % | frais de ménage moyens par séjour ; frais de service voyageur annoncés par Airbnb (structure en évolution depuis 2025 : de plus en plus d'annonces les incluent dans le prix affiché) |
| Taxe de séjour | 0,60 € à 2,50 € par adulte et par nuit | barèmes communaux français 2026 (fourchettes légales selon la catégorie, plus taxe additionnelle départementale) ; à l'étranger, ordre de grandeur ajusté au coût de la vie |

Avec une cuisine (appartement, gîte, auberge, chez l'habitant, camping), les repas pris hors restaurant sont comptés au prix des courses ; à l'hôtel, moitié courses, moitié snack.

### Séjours longs (`prixBase.json` → `sejourLong`, `villes.json`)

- **Loyers au mois** (une personne, charges comprises, grande ville hors Paris) : studio meublé 680 €, colocation 520 € la chambre, chambre chez l'habitant 480 €, résidence étudiante ou jeunes actifs 630 €, Airbnb au mois 1 250 € (réduction mensuelle comprise). Ordres de grandeur d'après les loyers affichés par [Studapart](https://www.studapart.com/fr/location-studio-lyon) (studio à Lyon ≈ 556 € hors meublé), les observatoires locaux des loyers et les annonces de colocation (chambre à Lyon ≈ 450 € hors charges).
- **Coefficient de ville** (`villes.json`) : Paris 1,75, Lyon 1,1, Bordeaux 1,05, Annecy 1,2… ; une ville absente compte pour 0,85. Pour les villes étrangères, le coefficient s'ajoute à l'indice du pays.
- **Abonnement de transports** : 62 € par mois par défaut, 90,80 € pour Navigo (Paris et petite couronne), 74 € pour Lyon. En France, l'employeur rembourse la moitié de l'abonnement, stagiaires compris (code du travail, article L3261-2) : option activée par défaut.
- **Zones autour du lieu de travail** : cercles calculés avec des vitesses moyennes porte à porte (à pied 4,5 km/h, vélo 14 km/h, transports en commun 16 km/h, voiture 24 km/h en ville). Loyer +12 % tout près du travail, −14 % dans la zone la plus éloignée. Ce sont des cercles, pas de vrais temps de trajet par les rues.
- **Vie courante** : courses 290 € par mois, sorties 130 €, petites dépenses 40 € (téléphone, hygiène, assurance habitation), d'après les budgets étudiants publiés par les CROUS et l'Observatoire de la vie étudiante.

### Dates flexibles (`src/engine/periodes.ts`)

On teste les 12 prochains mois (ou la période choisie), avec la durée la plus courte et la plus longue. Les prix changent avec la saison du pays (logement) et le coefficient saisonnier des vols : ce n'est pas un relevé des tarifs jour par jour.

### Propositions (`src/engine/propositions.ts`)

Chaque type de logement coché est combiné avec les modes de transport réalistes (possibles, et pas beaucoup plus lents que le plus rapide) et avec le style voisin. On garde 3 à 6 propositions : moins chère, meilleur rapport qualité-prix (confort, moins un point par tranche de 25 % au-dessus de la moins chère), plus confortable (sans dépasser le double de la moins chère), plus rapide ou plus proche du travail, vos réglages tels quels, et une version par type de logement. Le confort sur 10 tient compte du logement, du style et de la fatigue du trajet.

### Liens des séjours longs (vérifiés le 24/11/2026)

| Site | Lien | Remarque |
| --- | --- | --- |
| Airbnb au mois | `/s/Ville/homes?checkin=&checkout=` sur toute la durée | au-delà de 28 nuits, Airbnb affiche le prix au mois |
| Leboncoin | `/recherche?text=location meublée Ville` | recherche par mots-clés ; les paramètres de filtre ne sont pas documentés |
| Studapart | `/fr/logement-etudiant-ville` | pages par ville ([exemple Lyon](https://www.studapart.com/fr/logement-etudiant-lyon)), seulement pour les grandes villes françaises connues ; sinon page d'accueil |
| La Carte des Colocs | page d'accueil | l'adresse des recherches dépend de la région : simple lien |

## Version 4 : stage, gratification et vérifications (24/11/2026)

- **Gratification minimale des stages** : 4,50 € par heure de présence en 2026, soit 15 % du plafond horaire de la Sécurité sociale (30 € en 2026), exonérée de cotisations jusqu'à ce montant. Obligatoire quand la présence dépasse 2 mois, c'est-à-dire plus de 44 jours de 7 heures, soit plus de 308 heures, consécutives ou non. Source : [service-public.fr, fiche F32131](https://entreprendre.service-public.gouv.fr/vosdroits/F32131) (vérifiée le 24/11/2026), confirmée par [legisocial.fr](https://www.legisocial.fr/reperes-sociaux/gratification-stagiaire-2026.html). Constante `GRATIFICATION` dans `src/engine/sejourLong.ts`. Heures de présence : de l'heure d'arrivée à l'heure de départ, moins une heure de pause au-delà de 6 heures ; jours fériés non déduits.
- **Abonnement de transports à Pau** (réseau Idelis) : 35 € par mois pour les 26-64 ans, 14 € pour les 18-25 ans ; la moitié est remboursée par l'employeur. Source : [grille tarifaire Idelis](https://idelis.fr/fileadmin/Fichiers_client/Tarifs/Tarifs_A5_WEB3.pdf) (dernière grille publiée, en vigueur depuis janvier 2025). L'app retient le tarif tout public (35 €).
- **Loyer d'une colocation à Pau** : ≈ 440 € charges comprises (coefficient 0,85), dans la fourchette observée de 350 à 470 €.
- **Courses** : 230 à 390 € par mois selon le style (290 € en Équilibré), cohérent avec les 200 à 300 € habituels pour un étudiant seul.
- **Dépôt de garantie** : environ un mois de loyer hors charges pour un studio, une colocation ou une résidence ; il est remboursé à la fin, donc affiché à part et jamais compté dans le total. Avec un bail mobilité, aucun dépôt ne peut être demandé.
- **Aide au logement** : lien vers le [simulateur de la CAF](https://www.caf.fr/allocataires/aides-et-demarches/mes-demarches), sans calcul de montant.
- **Photos Wikipédia** : les montages (« Montage_Pau_4.jpg ») sont écartés comme les drapeaux et les blasons ; en dernier recours, l'app prend la première vraie photo de l'article (pour Pau : le château).

## Version 5 : trajets combinés et prix plus réalistes (24/11/2026)

### Audit des prix (avant → après)

| Poste | v4 | v5 | Source |
| --- | --- | --- | --- |
| Carburant | 2,05 €/L fixe | moyenne nationale du jour (gazole + SP95-E10) / 2 ; repli : 2,04 €/L relevé le 24/11/2026 (gazole 2,118, SP95 2,025, E10 1,954) | [API « prix des carburants », data.economie.gouv.fr](https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/) |
| Péages | 0,075 €/km sur tout le trajet | 0,10 €/km sur 70 % du trajet (part autoroute) | hausse de 0,86 % au 1er février 2026, ≈ 0,095 à 0,10 €/km en moyenne ([Assemblée nationale](https://www.assemblee-nationale.fr/dyn/17/questions/QANR5L17QE12670.pdf)) |
| Usure de la voiture | absente | option, 0,10 €/km | ordre de grandeur des frais d'entretien et de pneus |
| Train | 0,12 €/km, 15 à 150 € | tarifs officiels par paire de gares (OUIGO, TGV INOUI, Avantage, 1re) ; Intercités/TER : 0,07 à 0,20 €/km | [SNCF, « Tarifs TGV INOUI et OUIGO », data.gouv.fr, mise à jour du 17/03/2026](https://www.data.gouv.fr/datasets/tarifs-tgv-inoui-et-ouigo), licence ODbL ; prix moyens 2024 : OUIGO 34,70 €, INOUI 48,40 € (FNAUT) |
| Autocar | 0,06 €/km, BlaBlaCar Bus ou FlixBus | 0,063 €/km (fourchette 0,04 à 0,10), FlixBus seul | 6,30 € pour 100 km (rapport ART 2026 cité par [FlixBus](https://www.flixbus.fr/entreprise/presse/Flixbus-ART-prix-stables-frequentation-hausse)) ; BlaBlaCar Bus ferme fin 2026 ([Connexion](https://www.connexionfrance.com/news/blablacars-intercity-coach-service-to-shut-in-france/788230)) |
| Covoiturage | absent | 0,07 €/km par passager (0,055 à 0,085) + 18 % de frais | barème conseillé BlaBlaCar ≈ 0,06 à 0,08 €/km, commission 17,5 à 19 % |
| Parking en gare | absent | 38 €/jour à Paris, 25 € dans les grandes villes, 12 € en gare TGV, 7 € ailleurs | relevés 2025-2026 (Lyon Part-Dieu 25 à 35 €/jour) |
| Avion | forfait 45 € + barème | même barème comme prix « normal », fourchette ×0,45 à ×2 (low-cost) ou ×0,7 à ×2,2 ; 2 h d'avance | — |
| Hôtels, restaurants | prix France × indice pays | × indice de la ville (30 villes françaises, 30 étrangères) | ADR France 133 € (In Extenso 2025), province ≈ 100 € HT (UMIH/MKG, décembre 2025) ; Numbeo pour les écarts entre villes |
| Activités | prix moyen par type | tarif OSM (`charge`) quand il existe, sinon « prix estimé » | OpenStreetMap |

### Fourchettes

- **Billets réservables** (train, avion, autocar) : la fourchette officielle (prix minimum à maximum) est réduite à la partie où tombent la plupart des billets selon le moment de la réservation : tôt = 0 à 35 % de la fourchette (prix probable à 15 %), normal = 15 à 60 % (35 %), dernière minute = 55 à 100 % (80 %).
- **Le reste** : logement et repas −15 % / +20 %, activités −25 % / +30 %, transport sur place −20 % / +25 %, divers −20 % / +30 %, plus la marge pour imprévus.

### Trajets combinés (`src/engine/trajets.ts`, `src/data/hubs.json`, `src/data/tarifsTrain.json`)

- **Hubs** : 260 gares (liste officielle « Gares de voyageurs » SNCF, ODbL ; 242 avec un tarif TGV), 73 aéroports (35 en France, avec indicateur low-cost), 54 arrêts d'autocar.
- **Marges** : 20 min avant un train, 2 h avant un vol, 30 min à la sortie de l'aéroport, 20 min pour retrouver un covoiturage.
- **Correspondances** : par une grande gare seulement (Paris, Lyon Part-Dieu, Dijon…), changement de gare à Paris compté (40 min, ticket de métro). Intercités ou TER seulement jusqu'à 200 km (300 km vers Paris).
- **Options écartées** : détour de plus de 30 %, trajet jusqu'à la gare ou l'aéroport plus long que le trajet principal, ou trajet combiné plus de deux fois plus long que le plus rapide. Les trajets simples (voiture, autocar, covoiturage) ne sont jamais écartés, seulement signalés.

### Cas de contrôle (`src/engine/casControle.test.ts`)

| Cas | Référence | Résultat v5 | Verdict |
| --- | --- | --- | --- |
| Troyes → Lyon, 2 pers., 2 nuits mi-décembre | 650 à 1 150 € : train 2 × A/R 120 à 220 €, hôtel 3★ Lyon 2 nuits 200 à 300 €, repas 180 à 300 €, activités et sur place 60 à 180 € | 985 € (entre 810 et 1 210 €), train via Dijon 180 € | ✓ |
| Paris → Lisbonne, 2 pers., 7 nuits en juillet | 2 200 à 3 800 € : vols A/R juillet 180 à 320 € par personne + bagages, hôtel 130 à 200 €/nuit, repas 450 à 800 € | 3 391 € (entre 2 700 et 4 290 €), avion depuis Orly 867 € | ✓ |
| Troyes → Pau, stage de 11 semaines en colocation | 950 à 1 450 €/mois : colocation 350 à 450 €, courses 200 à 300 €, abonnement Idelis 17,50 € après remboursement | 1 250 €/mois + 257 € de frais | ✓ |
| Paris → Marseille, 1 pers., week-end en TGV | OUIGO 19 à 109 €, INOUI 25,50 à 138 € l'aller : tôt nettement moins cher | A/R 70 € tôt, 187 € à la dernière minute | ✓ |
