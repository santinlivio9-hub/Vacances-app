import destinationsJson from './destinations.json'
import villesDepartJson from './villesDepart.json'
import aeroportsJson from './aeroports.json'
import transportJson from './transport.json'
import type { Aeroport, Destination, TarifsTransport, VilleDepart } from './types'

export const destinations = destinationsJson as Destination[]
export const villesDepart = villesDepartJson as VilleDepart[]
export const aeroports = aeroportsJson as Aeroport[]
export const tarifsTransport = transportJson as TarifsTransport

export function trouverDestination(id: string): Destination | undefined {
  return destinations.find((d) => d.id === id)
}

export type * from './types'
