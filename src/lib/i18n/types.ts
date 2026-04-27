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
}

export interface UICopy {
  home: HomeCopy
  form: LicenseFormCopy
  result: LicenseResultCopy
}
