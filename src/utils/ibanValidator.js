/**
 * IBAN & International Bank Account Validator
 * Standard ISO 13616 & ISO 7064 Mod 97-10 Checksum Implementation
 */

// Supported IBAN lengths by ISO country code
export const IBAN_COUNTRY_LENGTHS = {
  PK: 24, // Pakistan
  GB: 22, // United Kingdom
  AE: 23, // United Arab Emirates
  SA: 24, // Saudi Arabia
  DE: 22, // Germany
  FR: 27, // France
  IT: 27, // Italy
  ES: 24, // Spain
  TR: 26, // Turkey
  QA: 29, // Qatar
  KW: 30, // Kuwait
  BH: 22, // Bahrain
  OM: 23, // Oman
  NL: 18, // Netherlands
  CH: 21, // Switzerland
  BE: 16, // Belgium
  AT: 20, // Austria
  IE: 22, // Ireland
}

// Known Pakistani Bank Codes (4 letters after check digits: PKxxBBBB...)
export const PAKISTANI_BANK_CODES = {
  MEZN: 'Meezan Bank Ltd.',
  HABB: 'Habib Bank Limited (HBL)',
  UBLP: 'United Bank Limited (UBL)',
  MCBL: 'MCB Bank Limited',
  ALFH: 'Bank Alfalah',
  BAHL: 'Bank AL Habib',
  SCBL: 'Standard Chartered Pakistan',
  FAYS: 'Faysal Bank',
  FABL: 'Faysal Bank',
  ASCM: 'Askari Bank',
  ALLH: 'Allied Bank Limited (ABL)',
  JSBL: 'JS Bank',
  SONE: 'Soneri Bank',
  BIPL: 'BankIslami Pakistan',
  DIBP: 'Dubai Islamic Bank',
  NBPK: 'National Bank of Pakistan (NBP)',
  BOPK: 'The Bank of Punjab (BOP)',
  BOKP: 'The Bank of Khyber',
  SBLP: 'Samba Bank',
  FWBL: 'First Women Bank',
  MIBL: 'MCB Islamic Bank',
  SUMB: 'Summit Bank',
}

// Major banks list for dropdowns & auto-suggestions
export const POPULAR_BANKS = [
  // Pakistani Domestic Banks
  { id: 'meezan', name: 'Meezan Bank Ltd.', code: 'MEZN', country: 'PK', type: 'local' },
  { id: 'hbl', name: 'Habib Bank Limited (HBL)', code: 'HABB', country: 'PK', type: 'local' },
  { id: 'ubl', name: 'United Bank Limited (UBL)', code: 'UBLP', country: 'PK', type: 'local' },
  { id: 'mcb', name: 'MCB Bank Limited', code: 'MCBL', country: 'PK', type: 'local' },
  { id: 'alfalah', name: 'Bank Alfalah', code: 'ALFH', country: 'PK', type: 'local' },
  { id: 'alhabib', name: 'Bank AL Habib', code: 'BAHL', country: 'PK', type: 'local' },
  { id: 'scb_pk', name: 'Standard Chartered Pakistan', code: 'SCBL', country: 'PK', type: 'local' },
  { id: 'faysal', name: 'Faysal Bank', code: 'FAYS', country: 'PK', type: 'local' },
  { id: 'askari', name: 'Askari Bank', code: 'ASCM', country: 'PK', type: 'local' },
  { id: 'abl', name: 'Allied Bank Limited (ABL)', code: 'ALLH', country: 'PK', type: 'local' },
  { id: 'js', name: 'JS Bank', code: 'JSBL', country: 'PK', type: 'local' },
  { id: 'nbp', name: 'National Bank of Pakistan (NBP)', code: 'NBPK', country: 'PK', type: 'local' },
  // International Digital & Wire Banks
  { id: 'wise', name: 'Wise (TransferWise Multi-Currency)', code: 'WISE', country: 'INTL', type: 'international' },
  { id: 'payoneer', name: 'Payoneer Global Payout', code: 'PAYO', country: 'INTL', type: 'international' },
  { id: 'jpmorgan', name: 'JPMorgan Chase & Co.', code: 'CHAS', country: 'US', type: 'international' },
  { id: 'citibank', name: 'Citibank N.A.', code: 'CITI', country: 'US', type: 'international' },
  { id: 'barclays', name: 'Barclays Bank', code: 'BARC', country: 'GB', type: 'international' },
  { id: 'hsbc', name: 'HSBC Global', code: 'MIDL', country: 'GB', type: 'international' },
  { id: 'crypto_binance', name: 'Binance / Crypto USDT (TRC-20)', code: 'TRC20', country: 'CRYPTO', type: 'crypto' },
  { id: 'other', name: 'Other Bank / Financial Institution', code: '', country: 'OTHER', type: 'other' },
]

/**
 * Standard ISO 7064 Modulo 97-10 checksum check
 */
export function checkIbanModulo97(rawIban) {
  const clean = String(rawIban).toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length < 5) return false

  // Move first 4 characters to end: PK36MEZN... -> MEZN...PK36
  const rearranged = clean.slice(4) + clean.slice(0, 4)

  // Replace letters with A=10, B=11 ... Z=35
  let numericString = ''
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i)
    if (code >= 65 && code <= 90) {
      numericString += code - 55
    } else {
      numericString += rearranged[i]
    }
  }

  // Perform piecewise modulo 97 to avoid JavaScript large integer precision errors
  let remainder = 0
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = String(remainder) + numericString.slice(i, i + 7)
    remainder = parseInt(chunk, 10) % 97
  }

  return remainder === 1
}

/**
 * Validates any IBAN or International Bank Account
 * @param {string} input - Raw IBAN or account string
 * @param {string} [expectedBankCode] - Optional expected 4-letter bank code (e.g. 'MEZN')
 * @returns {{ isValid: boolean, error?: string, formattedIban?: string, bankName?: string, country?: string }}
 */
export function validateIban(input, expectedBankCode = '') {
  if (!input || !String(input).trim()) {
    return {
      isValid: false,
      error: 'Bank account number ya IBAN enter karna lazmi hai.',
    }
  }

  const clean = String(input).toUpperCase().replace(/[^A-Z0-9]/g, '')

  // Special case: TRC-20 Crypto Address (starts with T, length 34)
  if (clean.startsWith('T') && clean.length === 34) {
    return {
      isValid: true,
      formattedIban: clean,
      bankName: 'TRON USDT (TRC-20)',
      country: 'CRYPTO',
    }
  }

  // Country Code (First 2 chars)
  const country = clean.slice(0, 2)
  if (!/^[A-Z]{2}$/.test(country)) {
    return {
      isValid: false,
      error: 'IBAN ka aaghaz 2-harfi country code se hona chahiye (e.g. PK, GB, AE, SA).',
    }
  }

  const expectedLength = IBAN_COUNTRY_LENGTHS[country]

  // If Pakistani IBAN
  if (country === 'PK') {
    if (clean.length !== 24) {
      return {
        isValid: false,
        error: `Pakistani IBAN exactly 24 characters ka hona chahiye. Aapne ${clean.length} characters enter kiye hain.`,
      }
    }

    // Format: PK + 2 check digits + 4 bank letters + 16 alphanumeric
    const pkPattern = /^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/
    if (!pkPattern.test(clean)) {
      return {
        isValid: false,
        error: 'Pakistani IBAN format ghalat hai. Format: PK (2 digits) (4 Bank letters) (16 Account numbers). E.g: PK36MEZN0001020304050607.',
      }
    }

    const bankCode = clean.slice(4, 8)
    const detectedBank = PAKISTANI_BANK_CODES[bankCode] || `Bank Code ${bankCode}`

    // If expected bank code was specified and doesn't match
    if (expectedBankCode && expectedBankCode.length === 4 && bankCode !== expectedBankCode.toUpperCase()) {
      return {
        isValid: false,
        error: `Select kiye gaye bank ka code (${expectedBankCode}) enter kiye gaye IBAN ke bank code (${bankCode}) se match nahi karta.`,
      }
    }

    // MOD-97 check
    if (!checkIbanModulo97(clean)) {
      return {
        isValid: false,
        error: 'Invalid IBAN checksum! Enter kiye gaye IBAN ke check digits ghalat hain. Baraye meherbani apna asal IBAN check karein.',
      }
    }

    return {
      isValid: true,
      formattedIban: formatIbanSpaces(clean),
      cleanIban: clean,
      bankName: detectedBank,
      bankCode,
      country: 'PK',
    }
  }

  // If other known IBAN country
  if (expectedLength) {
    if (clean.length !== expectedLength) {
      return {
        isValid: false,
        error: `${country} ka IBAN exactly ${expectedLength} characters ka hona chahiye (Aapke characters: ${clean.length}).`,
      }
    }

    if (!checkIbanModulo97(clean)) {
      return {
        isValid: false,
        error: `Invalid ${country} IBAN checksum! Enter kiye gaye IBAN digits verify nahi ho sakay.`,
      }
    }

    return {
      isValid: true,
      formattedIban: formatIbanSpaces(clean),
      cleanIban: clean,
      country,
    }
  }

  // Generic / US Routing + Account or Generic International
  if (clean.length >= 10 && clean.length <= 34) {
    return {
      isValid: true,
      formattedIban: clean,
      cleanIban: clean,
      country: country || 'INTL',
    }
  }

  return {
    isValid: false,
    error: 'Account number / IBAN ki length kam se kam 10 characters aur zayada se zayada 34 characters honi chahiye.',
  }
}

/**
 * Formats IBAN into 4-character separated groups (e.g. PK36 MEZN 0001 0203 0405 0607)
 */
export function formatIbanSpaces(str) {
  if (!str) return ''
  const clean = String(str).toUpperCase().replace(/[^A-Z0-9]/g, '')
  return clean.replace(/(.{4})/g, '$1 ').trim()
}
