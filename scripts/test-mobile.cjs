/**
 * Test mobile (390 × 844, iPhone) : aucun écran ni onglet ne doit défiler horizontalement.
 * Vérifie document.documentElement.scrollWidth <= window.innerWidth sur chaque écran, pour trois voyages :
 * stage Troyes → Pau, vacances Troyes → Annecy, week-end Paris → Bruxelles.
 *
 * Usage : npm run build && npm run test:mobile   (Playwright et Chromium doivent être installés)
 */
const { spawn } = require('node:child_process')
const { chromium, devices } = require('playwright')

const PORT = 4179
const BASE = process.env.BASE ?? `http://localhost:${PORT}/Vacances-app/`
const L = {
  troyes: { nom: 'Troyes', detail: 'Aube, France', lat: 48.2973, lon: 4.0744, pays: 'fr', type: 'city' },
  pau: { nom: 'Pau', detail: 'Pyrénées-Atlantiques, France', lat: 43.2951, lon: -0.3708, pays: 'fr', type: 'city' },
  annecy: { nom: 'Annecy', detail: 'Haute-Savoie, France', lat: 45.8992, lon: 6.1294, pays: 'fr', type: 'city' },
  paris: { nom: 'Paris', detail: 'Île-de-France, France', lat: 48.8566, lon: 2.3522, pays: 'fr', type: 'city' },
  bruxelles: { nom: 'Bruxelles', detail: 'Belgique', lat: 50.8467, lon: 4.3525, pays: 'be', type: 'city' },
}
const CAS = [
  { nom: 'stage', depart: 'troyes', arrivee: 'pau', type: /^Stage/ },
  { nom: 'vacances', depart: 'troyes', arrivee: 'annecy', type: /^Vacances/ },
  { nom: 'week-end', depart: 'paris', arrivee: 'bruxelles', type: /^Week-end/ },
]

async function attendreServeur(url, essais = 40) {
  for (let i = 0; i < essais; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Serveur injoignable : ${url}`)
}

async function main() {
  const serveur = process.env.BASE ? null : spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  const echecs = []
  let verifs = 0
  try {
    await attendreServeur(BASE)
    const navigateur = await chromium.launch()
    const { defaultBrowserType: _d, ...iphone } = devices['iPhone 13']
    for (const cas of CAS) {
      const ctx = await navigateur.newContext({ ...iphone, viewport: { width: 390, height: 844 }, locale: 'fr-FR' })
      const page = await ctx.newPage()
      const verifier = async (ecran) => {
        await page.waitForTimeout(400)
        const r = await page.evaluate(() => {
          const w = window.innerWidth
          // Le filet de sécurité (overflow-x: clip) cache le défilement : on cherche aussi les éléments qui dépassent
          const fautifs = []
          for (const el of document.querySelectorAll('body *')) {
            const rc = el.getBoundingClientRect()
            if (!rc.width || !rc.height || el.closest('.leaflet-container')) continue
            let p = el.parentElement
            let defile = false
            while (p && p !== document.body) {
              const ox = getComputedStyle(p).overflowX
              if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') {
                defile = true
                break
              }
              p = p.parentElement
            }
            if (!defile && rc.right > w + 1) fautifs.push(`<${el.tagName.toLowerCase()}> « ${(el.textContent || '').trim().slice(0, 30)} » (${Math.round(rc.right)} px)`)
          }
          return { sw: document.documentElement.scrollWidth, w, fautifs: fautifs.slice(0, 3) }
        })
        verifs++
        if (r.sw > r.w) echecs.push(`${cas.nom} · ${ecran} : largeur ${r.sw} px > ${r.w} px`)
        if (r.fautifs.length) echecs.push(`${cas.nom} · ${ecran} : ${r.fautifs.join(', ')}`)
      }
      await page.goto(BASE)
      await page.evaluate(({ d, a }) => localStorage.setItem('budget-voyage:v2', JSON.stringify({ state: { depart: d, arrivee: a, typeChoisi: false }, version: 2 })), { d: L[cas.depart], a: L[cas.arrivee] })
      await page.reload()
      await page.waitForTimeout(1500)
      await verifier('explorer')
      await page.goto(BASE + '#/configurer')
      await verifier('types de voyage')
      await page.getByRole('radio', { name: cas.type }).first().click()
      await verifier('configuration simple')
      await page.getByRole('radio', { name: /Avancé/ }).click()
      await verifier('configuration avancée')
      await page.getByRole('radio', { name: /^Simple/ }).click()
      await page.getByRole('button', { name: /Calculer/ }).click()
      await page.waitForURL(/propositions/, { timeout: 30000 })
      await verifier('propositions')
      await page.getByRole('button', { name: 'Choisir cette proposition' }).first().click()
      await page.waitForURL(/voyage/)
      await page.getByRole('tab').first().waitFor()
      const onglets = await page.getByRole('tab').allInnerTexts()
      if (onglets.length < 4) echecs.push(`${cas.nom} · mon voyage : ${onglets.length} onglets trouvés`)
      for (const onglet of onglets) {
        await page.getByRole('tab', { name: onglet }).click()
        await verifier(`mon voyage, onglet ${onglet}`)
      }
      for (const route of ['mes-voyages', 'favoris', 'compte']) {
        await page.goto(BASE + '#/' + route)
        await verifier(route)
      }
      await ctx.close()
    }
    await navigateur.close()
  } finally {
    serveur?.kill()
  }
  if (echecs.length) {
    console.error(`✗ Débordement horizontal :\n  ${echecs.join('\n  ')}`)
    process.exit(1)
  }
  console.log(`✓ ${verifs} écrans vérifiés en 390 px : aucun défilement horizontal.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
