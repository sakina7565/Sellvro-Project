/**
 * Backend IBAN & International Bank Account Validator
 * Standard ISO 13616 & ISO 7064 Mod 97-10 Checksum Implementation
 */

export const IBAN_COUNTRY_LENGTHS = {
  PK: 24,
  GB: 22,
  AE: 23,
  SA: 24,
  DE: 22,
  FR: 27,
  IT: 27,
  ES: 24,
  TR: 26,
  QA: 29,
  KW: 30,
  BH: 22,
  OM: 23,
  NL: 18,
  CH: 21,
  BE: 16,
  AT: 20,
  IE: 22,
}

export function checkIbanModulo97(rawIban) {
  const clean = String(rawIban).toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length < 5) return false

  const rearranged = clean.slice(4) + clean.slice(0, 4)

  let numericString = ''
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i)
    if (code >= 65 && code <= 90) {
      numericString += code - 55
    } else {
      numericString += rearranged[i]
    }
  }

  let remainder = 0
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = String(remainder) + numericString.slice(i, i + 7)
    remainder = parseInt(chunk, 10) % 97
  }

  return remainder === 1
}

export function validateIban(input) {
  if (!input || !String(input).trim()) {
    return {
      isValid: false,
      error: 'Bank account number ya IBAN enter karna lazmi hai.',
    }
  }

  const clean = String(input).toUpperCase().replace(/[^A-Z0-9]/g, '')

  // TRC-20 Crypto Address
  if (clean.startsWith('T') && clean.length === 34) {
    return {
      isValid: true,
      formattedIban: clean,
      country: 'CRYPTO',
    }
  }

  const country = clean.slice(0, 2)
  if (!/^[A-Z]{2}$/.test(country)) {
    return {
      isValid: false,
      error: 'IBAN ka aaghaz 2-harfi country code se hona chahiye (e.g. PK, GB, AE, SA).',
    }
  }

  const expectedLength = IBAN_COUNTRY_LENGTHS[country]

  if (country === 'PK') {
    if (clean.length !== 24) {
      return {
        isValid: false,
        error: `Pakistani IBAN exactly 24 characters ka hona chahiye. Aapne ${clean.length} characters enter kiye hain.`,
      }
    }

    const pkPattern = /^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/
    if (!pkPattern.test(clean)) {
      return {
        isValid: false,
        error: 'Pakistani IBAN format ghalat hai. Format: PK (2 digits) (4 Bank letters) (16 Account numbers). E.g: PK36MEZN0001020304050607.',
      }
    }

    if (!checkIbanModulo97(clean)) {
      return {
        isValid: false,
        error: 'Invalid IBAN checksum! Enter kiye gaye IBAN ke check digits ghalat hain. Baraye meherbani apna asal IBAN check karein.',
      }
    }

    return {
      isValid: true,
      cleanIban: clean,
      country: 'PK',
    }
  }

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
      cleanIban: clean,
      country,
    }
  }

  if (clean.length >= 10 && clean.length <= 34) {
    return {
      isValid: true,
      cleanIban: clean,
      country: country || 'INTL',
    }
  }

  return {
    isValid: false,
    error: 'Account number / IBAN ki length kam se kam 10 characters aur zayada se zayada 34 characters honi chahiye.',
  }
}
