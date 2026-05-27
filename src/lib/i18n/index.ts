import { en } from './en'
import { ne } from './ne'
import type { UICopy } from './types'

export type { UICopy, HomeCopy, HomeTileCopy, LicenseFormCopy, LicenseResultCopy } from './types'

export type Language = 'en' | 'ne'

export const translations: Record<Language, UICopy> = { en, ne }

/** @deprecated Use `translations` instead for dynamic language support */
export const uiCopy: UICopy = en
