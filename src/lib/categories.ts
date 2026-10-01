// src/lib/categories.ts
// Official Nepal Driving License Vehicle Categories Breakdown

export interface VehicleCategory {
  code: string
  nameEn: string
  nameNe: string
  vehiclesEn: string
  vehiclesNe: string
  icon: 'bike' | 'car' | 'auto' | 'erickshaw' | 'tractor' | 'bus' | 'truck' | 'heavy' | 'scooter'
}

export const VEHICLE_CATEGORIES: Record<string, VehicleCategory> = {
  A: {
    code: 'A',
    nameEn: 'Motorcycle / Scooter / Moped',
    nameNe: 'मोटरसाइकल, स्कुटर, मोपेड',
    vehiclesEn: 'Two-wheelers with or without gear',
    vehiclesNe: 'गियर वा बिना गियरका दुई पाङ्ग्रे सवारी',
    icon: 'bike',
  },
  B: {
    code: 'B',
    nameEn: 'Car / Jeep / Delivery Van',
    nameNe: 'कार, जीप, डेलिभरी भ्यान',
    vehiclesEn: 'Light motor vehicles up to 4 wheels',
    vehiclesNe: '४ पाङ्ग्रे साना सवारी साधन',
    icon: 'car',
  },
  C: {
    code: 'C',
    nameEn: 'Tempo / Auto-Rickshaw',
    nameNe: 'टेम्पो, अटो रिक्सा',
    vehiclesEn: 'Three-wheelers (Auto, Tempo)',
    vehiclesNe: 'तीन पाङ्ग्रे सवारी (अटो, टेम्पो)',
    icon: 'auto',
  },
  C1: {
    code: 'C1',
    nameEn: 'E-Rickshaw',
    nameNe: 'इ-रिक्सा (विद्युतीय रिक्सा)',
    vehiclesEn: 'Electric three-wheelers / Safari',
    vehiclesNe: 'विद्युतीय तीन पाङ्ग्रे सफारी / रिक्सा',
    icon: 'erickshaw',
  },
  D: {
    code: 'D',
    nameEn: 'Power Tiller',
    nameNe: 'पावर टिलर',
    vehiclesEn: 'Agricultural power tiller',
    vehiclesNe: 'कृषि प्रयोजनको पावर टिलर',
    icon: 'tractor',
  },
  E: {
    code: 'E',
    nameEn: 'Tractor',
    nameNe: 'ट्र्याक्टर',
    vehiclesEn: 'Agricultural / Industrial tractor',
    vehiclesNe: 'कृषि तथा औद्योगिक ट्र्याक्टर',
    icon: 'tractor',
  },
  F: {
    code: 'F',
    nameEn: 'Minibus / Mini-truck',
    nameNe: 'मिनीबस, मिनीट्रक',
    vehiclesEn: 'Medium commercial vehicles',
    vehiclesNe: 'मध्यम व्यावसायिक सवारी साधन',
    icon: 'bus',
  },
  G: {
    code: 'G',
    nameEn: 'Truck / Bus / Heavy Vehicle',
    nameNe: 'ट्रक, ठूलो बस, लरी',
    vehiclesEn: 'Heavy transport vehicles',
    vehiclesNe: 'ठूला सार्वजनिक तथा ढुवानी सवारी',
    icon: 'truck',
  },
  H: {
    code: 'H',
    nameEn: 'Heavy Equipment / Dozer / Crane',
    nameNe: 'डोजर, क्रेन, रोलर, एस्काभेटर',
    vehiclesEn: 'Construction & earthmoving machinery',
    vehiclesNe: 'निर्माण तथा भारी मेसिनरी उपकरण',
    icon: 'heavy',
  },
  K: {
    code: 'K',
    nameEn: 'Scooter Only',
    nameNe: 'स्कुटर मात्र',
    vehiclesEn: 'Automatic gearless scooter',
    vehiclesNe: 'गियर नभएको स्कुटर मात्र',
    icon: 'scooter',
  },
}

export function parseCategoryCodes(categoryStr: string): VehicleCategory[] {
  if (!categoryStr) return []
  const tokens = categoryStr
    .toUpperCase()
    .split(/[,/ ]+/)
    .map(t => t.trim())
    .filter(Boolean)

  const result: VehicleCategory[] = []
  for (const token of tokens) {
    if (VEHICLE_CATEGORIES[token]) {
      result.push(VEHICLE_CATEGORIES[token])
    } else {
      // Fallback custom entry
      result.push({
        code: token,
        nameEn: `Category ${token}`,
        nameNe: `वर्ग ${token}`,
        vehiclesEn: 'Authorized vehicle class',
        vehiclesNe: 'स्वीकृत सवारी वर्ग',
        icon: 'car',
      })
    }
  }
  return result
}
