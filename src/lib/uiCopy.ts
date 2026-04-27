export type UILanguage = 'en' | 'ne'

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
  languageLabel: string
  lightLabel: string
  darkLabel: string
  englishLabel: string
  nepaliLabel: string
  tiles: HomeTileCopy[]
  footerPrefix: string
  footerSuffix: string
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

export const UI_COPY: Record<UILanguage, UICopy> = {
  en: {
    home: {
      badge: 'Government of Nepal · DOTM',
      title: 'License Print Status',
      titleAccent: 'Checker',
      description: 'Check if your smart card driving license has been printed and is ready for collection from your transport management office.',
      themeLabel: 'Theme',
      languageLabel: 'Language',
      lightLabel: 'Light',
      darkLabel: 'Dark',
      englishLabel: 'English',
      nepaliLabel: 'नेपाली',
      tiles: [
        {
          title: 'License Format',
          text: 'Enter in format XX-XX-XXXXXXXX (Office–District–Unique). Example: 01-01-12345678',
        },
        {
          title: 'Collection',
          text: 'Visit your transport management office with citizenship, old license and payment receipt',
        },
        {
          title: 'Data Source',
          text: 'Data is fetched from official DOTM Nepal published license records on dotm.gov.np',
        },
        {
          title: 'Update Frequency',
          text: 'DOTM publishes new batches periodically. Check again in a few days if not found',
        },
      ],
      footerPrefix: 'Official data from',
      footerSuffix: 'Department of Transport Management, Nepal',
      toasts: {
        rateLimit: 'Too many requests. Please wait a moment.',
        serverError: 'Failed to check license. Please try again.',
        found: 'License found in printed records!',
        notFound: 'License not found in printed records',
      },
    },
    form: {
      label: 'Driving License Number',
      placeholder: '01-01-12345678',
      clearLabel: 'Clear license number',
      submitLabel: 'Check Status',
      checkingLabel: 'Checking...',
      formatLabel: 'Format:',
      formatHint: 'Office–District–Unique Number',
      loadingMessages: [
        'Connecting to DOTM records...',
        'Searching printed license lists...',
        'Scanning PDF records...',
        'Almost there...',
      ],
      errors: {
        required: 'Please enter a license number',
        invalidShort: 'Invalid format. Use XX-XX-XXXXXXXX',
        invalidFull: 'Invalid format. Use XX-XX-XXXXXXXX (e.g. 01-01-12345678)',
      },
    },
    result: {
      errorTitle: 'Connection Error',
      errorDescription: 'Unable to reach DOTM records at this time.',
      errorHintPrefix: 'Please try again in a moment. If the problem persists, visit',
      errorHintSuffix: 'directly.',
      notFoundTitle: 'Not Yet Printed',
      notFoundDescription: 'Not found in current DOTM printed records.',
      searchedLicenseLabel: 'Searched License Number',
      printStatusLabel: 'Print Status',
      notPrintedStatus: 'Not in printed records',
      possibleReasonsLabel: 'Possible reasons:',
      possibleReasons: [
        'Your license printing is still in progress',
        'The license number entered may be incorrect',
        'DOTM may not have published the latest batch yet',
        'Your district office may have a separate list',
      ],
      notFoundHintPrefix: 'Check again in a few days or contact your local transport office directly. You can also view the full printed list at',
      notFoundHintSuffix: '',
      foundTitle: 'License Printed & Ready!',
      foundDescription: 'Your smart card license has been printed.',
      licenseHolderLabel: 'License Holder',
      licenseNumberLabel: 'License Number',
      statusLabel: 'Status',
      printedStatus: 'PRINTED',
      issuingOfficeLabel: 'Issuing Office',
      vehicleCategoryLabel: 'Vehicle Category',
      recordUpdatedLabel: 'Record Updated',
      readyForCollectionTitle: 'Ready for Collection',
      readyForCollectionDescription: 'Visit your transport management office with original documents (citizenship card, old license, and payment receipt) to collect your smart card driving license.',
      checkAnotherLabel: 'Check Another License',
    },
  },
  ne: {
    home: {
      badge: 'नेपाल सरकार · यातायात व्यवस्था विभाग',
      title: 'लाइसेन्स प्रिन्ट स्थिति',
      titleAccent: 'जाँच',
      description: 'तपाईंको स्मार्ट कार्ड सवारी चालक अनुमति पत्र प्रिन्ट भई सङ्कलनका लागि तयार छ कि छैन जाँच गर्नुहोस्।',
      themeLabel: 'थिम',
      languageLabel: 'भाषा',
      lightLabel: 'लाइट',
      darkLabel: 'डार्क',
      englishLabel: 'English',
      nepaliLabel: 'नेपाली',
      tiles: [
        {
          title: 'लाइसेन्स ढाँचा',
          text: 'XX-XX-XXXXXXXX ढाँचामा लेख्नुहोस् (कार्यालय–जिल्ला–युनिक)। उदाहरण: 01-01-12345678',
        },
        {
          title: 'सङ्कलन',
          text: 'नागरिकता, पुरानो लाइसेन्स र भुक्तानी रसिद सहित आफ्नो यातायात कार्यालयमा जानुहोस्।',
        },
        {
          title: 'डाटा स्रोत',
          text: 'डाटा dotm.gov.np मा प्रकाशित आधिकारिक DOTM रेकर्डबाट लिइन्छ।',
        },
        {
          title: 'अपडेट आवृत्ति',
          text: 'DOTM ले नयाँ सूची समय-समयमा प्रकाशित गर्छ। नभेटिए केही दिनपछि फेरि जाँच गर्नुहोस्।',
        },
      ],
      footerPrefix: 'आधिकारिक डाटा स्रोत:',
      footerSuffix: 'यातायात व्यवस्था विभाग, नेपाल',
      toasts: {
        rateLimit: 'धेरै अनुरोध भए। कृपया केही समय पर्खनुहोस्।',
        serverError: 'लाइसेन्स जाँच गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।',
        found: 'लाइसेन्स प्रिन्ट रेकर्डमा भेटियो!',
        notFound: 'लाइसेन्स प्रिन्ट रेकर्डमा भेटिएन',
      },
    },
    form: {
      label: 'सवारी चालक अनुमति पत्र नम्बर',
      placeholder: '01-01-12345678',
      clearLabel: 'लाइसेन्स नम्बर खाली गर्नुहोस्',
      submitLabel: 'स्थिति जाँच',
      checkingLabel: 'जाँच भइरहेको छ...',
      formatLabel: 'ढाँचा:',
      formatHint: 'कार्यालय–जिल्ला–युनिक नम्बर',
      loadingMessages: [
        'DOTM रेकर्डमा जडान हुँदै...',
        'प्रिन्ट सूची खोजिँदै...',
        'PDF रेकर्ड स्क्यान हुँदै...',
        'लगभग सकिन लाग्यो...',
      ],
      errors: {
        required: 'कृपया लाइसेन्स नम्बर लेख्नुहोस्',
        invalidShort: 'अमान्य ढाँचा। XX-XX-XXXXXXXX प्रयोग गर्नुहोस्',
        invalidFull: 'अमान्य ढाँचा। XX-XX-XXXXXXXX प्रयोग गर्नुहोस् (जस्तै 01-01-12345678)',
      },
    },
    result: {
      errorTitle: 'जडान त्रुटि',
      errorDescription: 'अहिले DOTM रेकर्डमा पुग्न सकिएन।',
      errorHintPrefix: 'कृपया केही समयपछि फेरि प्रयास गर्नुहोस्। समस्या कायम रहे',
      errorHintSuffix: 'सीधै हेर्नुहोस्।',
      notFoundTitle: 'अहिलेसम्म प्रिन्ट भएको छैन',
      notFoundDescription: 'हालको DOTM प्रिन्ट रेकर्डमा भेटिएन।',
      searchedLicenseLabel: 'खोजिएको लाइसेन्स नम्बर',
      printStatusLabel: 'प्रिन्ट स्थिति',
      notPrintedStatus: 'प्रिन्ट रेकर्डमा छैन',
      possibleReasonsLabel: 'सम्भावित कारणहरू:',
      possibleReasons: [
        'तपाईंको लाइसेन्स प्रिन्ट प्रक्रिया अझै चलिरहेको हुन सक्छ',
        'प्रविष्ट गरिएको लाइसेन्स नम्बर गलत हुन सक्छ',
        'DOTM ले नयाँ सूची अझै प्रकाशित नगरेको हुन सक्छ',
        'तपाईंको जिल्ला कार्यालयको छुट्टै सूची हुन सक्छ',
      ],
      notFoundHintPrefix: 'केही दिनपछि फेरि जाँच गर्नुहोस् वा आफ्नो स्थानीय यातायात कार्यालयमा सम्पर्क गर्नुहोस्। पूर्ण सूची',
      notFoundHintSuffix: 'मा पनि हेर्न सक्नुहुन्छ।',
      foundTitle: 'लाइसेन्स प्रिन्ट भई तयार छ!',
      foundDescription: 'तपाईंको स्मार्ट कार्ड लाइसेन्स प्रिन्ट भइसकेको छ।',
      licenseHolderLabel: 'लाइसेन्सधारी',
      licenseNumberLabel: 'लाइसेन्स नम्बर',
      statusLabel: 'स्थिति',
      printedStatus: 'प्रिन्टेड',
      issuingOfficeLabel: 'जारी गर्ने कार्यालय',
      vehicleCategoryLabel: 'सवारी वर्ग',
      recordUpdatedLabel: 'रेकर्ड अपडेट मिति',
      readyForCollectionTitle: 'सङ्कलनका लागि तयार',
      readyForCollectionDescription: 'स्मार्ट कार्ड लाइसेन्स लिन नागरिकता, पुरानो लाइसेन्स र भुक्तानी रसिद सहित आफ्नो यातायात कार्यालयमा जानुहोस्।',
      checkAnotherLabel: 'अर्को लाइसेन्स जाँच गर्नुहोस्',
    },
  },
}
