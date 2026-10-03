export interface HomeTileCopy {
  title: string
  text: string
}

export interface HomeCopy {
  badge: string
  title: string
  titleAccent: string
  description: string
  themeLabel: string
  lightLabel: string
  darkLabel: string
  lastUpdatedLabel: string
  lastUpdatedFallback: string
  tiles: HomeTileCopy[]
  footerPrefix: string
  footerSuffix: string
  developerCreditLabel: string
  developerPortfolioLabel: string
  toasts: {
    rateLimit: string
    serverError: string
    found: string
    notFound: string
    copied: string
  }
}

export interface LicenseFormCopy {
  label: string
  placeholder: string
  clearLabel: string
  submitLabel: string
  checkingLabel: string
  formatLabel: string
  formatHint: string
  detectedOfficeLabel: string
  recentSearchesLabel: string
  clearRecentLabel: string
  pasteHint: string
  loadingMessages: string[]
  errors: {
    required: string
    invalidShort: string
    invalidFull: string
  }
}

export interface LicenseResultCopy {
  errorTitle: string
  errorDescription: string
  errorHintPrefix: string
  errorHintSuffix: string
  notFoundTitle: string
  notFoundDescription: string
  searchedLicenseLabel: string
  printStatusLabel: string
  notPrintedStatus: string
  possibleReasonsLabel: string
  possibleReasons: string[]
  notFoundHintPrefix: string
  notFoundHintSuffix: string
  foundTitle: string
  foundDescription: string
  licenseHolderLabel: string
  licenseNumberLabel: string
  statusLabel: string
  printedStatus: string
  issuingOfficeLabel: string
  vehicleCategoryLabel: string
  recordUpdatedLabel: string
  readyForCollectionTitle: string
  readyForCollectionDescription: string
  checkAnotherLabel: string
  categoryBreakdownTitle: string
  authorizedVehiclesLabel: string
  printSlipLabel: string
  shareResultLabel: string
  copyDetailsLabel: string
  officeDetailsTitle: string
  officePhoneLabel: string
  officeAddressLabel: string
  whatToBringTitle: string
  requiredDocs: string[]
}

export interface OfficesModalCopy {
  title: string
  subtitle: string
  searchPlaceholder: string
  codeLabel: string
  locationLabel: string
  phoneLabel: string
  provinceLabel: string
  noMatch: string
  closeLabel: string
}

export interface SmsGuideCopy {
  title: string
  subtitle: string
  numbersLabel: string
  carriersLabel: string
  step1Title: string
  step1Desc: string
  step2Title: string
  step2Desc: string
  step3Title: string
  step3Desc: string
  carrierNote: string
  closeLabel: string
}

export interface UICopy {
  home: HomeCopy
  form: LicenseFormCopy
  result: LicenseResultCopy
  officesModal: OfficesModalCopy
  smsGuide: SmsGuideCopy
}
