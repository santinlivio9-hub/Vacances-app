// Génère src/data/communes.json à partir de l'API officielle geo.api.gouv.fr (Etalab, Licence Ouverte 2.0).
// Usage : npm run donnees:communes
// Derrière un proxy HTTPS, lancer avec NODE_USE_ENV_PROXY=1 (Node >= 22.21).
//
// Format compact en colonnes (≈ 275 Ko gzip pour ~34 700 communes), trié par code postal :
//   noms          : "Nom1|Nom2|…"
//   codesPostaux  : "01000|01090 01190|…"   (plusieurs codes séparés par un espace)
//   lat, lon      : écarts successifs, en centièmes de degré (~1 km de précision)
//   population    : classe = round(4 × log10(population)), sert uniquement à trier les résultats

import { writeFile } from 'node:fs/promises'

const API = 'https://geo.api.gouv.fr'
const CHAMPS = 'nom,codesPostaux,centre,population,codeDepartement'
const SORTIE = new URL('../src/data/communes.json', import.meta.url)

async function lireJson(url, essais = 5) {
  for (let essai = 1; ; essai++) {
    try {
      const reponse = await fetch(url)
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`)
      return await reponse.json()
    } catch (erreur) {
      if (essai >= essais) throw new Error(`${url} : ${erreur.message}`)
      await new Promise((r) => setTimeout(r, 1000 * essai))
    }
  }
}

function enEcarts(valeurs) {
  return valeurs.map((v, i) => (i === 0 ? v : v - valeurs[i - 1]))
}

const departements = await lireJson(`${API}/departements?fields=code`)
// Métropole + Corse uniquement : les calculs voiture / train n'ont pas de sens depuis l'outre-mer.
const metropole = departements.map((d) => d.code).filter((code) => !code.startsWith('97'))

const communes = []
for (const code of metropole) {
  const liste = await lireJson(`${API}/departements/${code}/communes?fields=${CHAMPS}&format=json`)
  for (const c of liste) {
    const [lon, lat] = c.centre.coordinates
    communes.push({
      nom: c.nom,
      codesPostaux: c.codesPostaux.join(' '),
      lat: Math.round(lat * 100),
      lon: Math.round(lon * 100),
      classe: Math.round(4 * Math.log10(Math.max(c.population ?? 1, 1))),
    })
  }
}

communes.sort((a, b) => a.codesPostaux.localeCompare(b.codesPostaux) || a.nom.localeCompare(b.nom, 'fr'))

const sortie = {
  source: 'geo.api.gouv.fr (Etalab, Licence Ouverte 2.0)',
  date: new Date().toISOString().slice(0, 10),
  noms: communes.map((c) => c.nom).join('|'),
  codesPostaux: communes.map((c) => c.codesPostaux).join('|'),
  lat: enEcarts(communes.map((c) => c.lat)),
  lon: enEcarts(communes.map((c) => c.lon)),
  population: communes.map((c) => c.classe),
}

await writeFile(SORTIE, JSON.stringify(sortie))
console.log(`${communes.length} communes écrites dans ${SORTIE.pathname}`)
