import mongoose from 'mongoose'

const accountDetailSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    methodName: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    accountTitle: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    iban: { type: String, trim: true, default: '' },
    branch: { type: String, trim: true, default: '' },
    instructions: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

const walletSettingSchema = new mongoose.Schema(
  {
    usdRatePerPkr: {
      type: Number,
      required: true,
      default: 280,
      min: 1,
    },
    marketplaceFeePercent: {
      type: Number,
      required: true,
      default: 8,
      min: 0,
      max: 100,
    },
    wmsFeePercent: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    pkrAccounts: {
      type: [accountDetailSchema],
      default: [
        {
          id: 'pkr_bank',
          methodName: 'Bank Transfer (IBFT)',
          bankName: 'Meezan Bank Ltd.',
          accountTitle: 'Sellvro Technologies (Pvt) Ltd',
          accountNumber: '01020304050607',
          iban: 'PK36MEZN0001020304050607',
          branch: 'Main Branch, Karachi',
          instructions: 'Send via Online Mobile Banking or ATM IBFT transfer. Enter TID & attach receipt.',
        },
        {
          id: 'pkr_easypaisa',
          methodName: 'EasyPaisa',
          bankName: 'Telenor Microfinance Bank',
          accountTitle: 'Sellvro Official / Admin',
          accountNumber: '0300-1234567',
          iban: '',
          branch: 'EasyPaisa Wallet',
          instructions: 'Send via EasyPaisa App > Send Money > EasyPaisa Transfer.',
        },
        {
          id: 'pkr_jazzcash',
          methodName: 'JazzCash',
          bankName: 'Mobilink Microfinance Bank',
          accountTitle: 'Sellvro Official / Admin',
          accountNumber: '0301-7654321',
          iban: '',
          branch: 'JazzCash Wallet',
          instructions: 'Send via JazzCash App > Send Money > Mobile Account.',
        },
      ],
    },
    usdAccounts: {
      type: [accountDetailSchema],
      default: [
        {
          id: 'usd_crypto',
          methodName: 'Binance / Crypto USDT (TRC-20)',
          bankName: 'Binance / TRON Network',
          accountTitle: 'Sellvro Corporate Crypto',
          accountNumber: 'TYd3X9kP8vLm2qR7zW4bN6eJ1aC5sT0uFa',
          iban: '',
          branch: 'TRON (TRC-20) Network Only',
          instructions: 'Send exact USDT on TRC-20 network. Enter Transaction Hash (TxID) and upload screenshot.',
        },
        {
          id: 'usd_wise',
          methodName: 'Wise / Bank Wire (SWIFT)',
          bankName: 'Wise / Community Federal Savings Bank',
          accountTitle: 'Sellvro Global Inc.',
          accountNumber: '890123456789',
          iban: 'US8901234567890123',
          branch: 'Routing: 026009593 / SWIFT: TRWUS33XXX',
          instructions: 'Transfer USD via Wise or International wire. Enter transfer reference.',
        },
        {
          id: 'usd_payoneer',
          methodName: 'Payoneer / Direct USD Transfer',
          bankName: 'Payoneer Direct',
          accountTitle: 'Sellvro Enterprise',
          accountNumber: 'payments@sellvro.com',
          iban: '',
          branch: 'Payoneer In-Network Payment',
          instructions: 'Pay to registered Payoneer email payments@sellvro.com. Enter Payment ID.',
        },
      ],
    },
    // Admin configured International Payment Methods for real client transfers
    internationalPaymentMethods: {
      wise: {
        enabled: { type: Boolean, default: true },
        accountTitle: { type: String, default: 'Sellvro Global Inc. (Wise)' },
        accountNumber: { type: String, default: '890123456789' },
        iban: { type: String, default: 'US8901234567890123' },
        routing: { type: String, default: '026009593' },
        apiKey: { type: String, default: '' },
        profileId: { type: String, default: '' },
        instructions: { type: String, default: 'Direct real-time transfer to client Wise account or international bank account.' },
      },
      payoneer: {
        enabled: { type: Boolean, default: true },
        accountTitle: { type: String, default: 'Sellvro Enterprise Payoneer' },
        accountNumber: { type: String, default: 'PAY-9041284' },
        email: { type: String, default: 'payments@sellvro.com' },
        clientId: { type: String, default: '' },
        clientSecret: { type: String, default: '' },
        instructions: { type: String, default: 'Real-time payment transfer to client Payoneer ID or registered Payoneer email.' },
      },
      stripe: {
        enabled: { type: Boolean, default: true },
        accountId: { type: String, default: 'acct_1SellvroGlobal' },
        secretKey: { type: String, default: '' },
        publishableKey: { type: String, default: '' },
        instructions: { type: String, default: 'Automated Stripe Connect payout to client bank account.' },
      },
      bankWire: {
        enabled: { type: Boolean, default: true },
        bankName: { type: String, default: 'JPMorgan Chase / Citibank N.A.' },
        accountTitle: { type: String, default: 'Sellvro Global Holding Inc.' },
        accountNumber: { type: String, default: '440189230198' },
        iban: { type: String, default: 'US44CHAS0000440189230198' },
        swift: { type: String, default: 'CHASUS33XXX' },
        routing: { type: String, default: '021000021' },
        instructions: { type: String, default: 'Global SWIFT wire transfer to client international bank account.' },
      },
    },
    // Shipping Courier Integrations (USPS, UPS, FedEx)
    courierIntegrations: {
      usps: {
        enabled: { type: Boolean, default: true },
        accountNumber: { type: String, default: 'USPS-981024' },
        userId: { type: String, default: '' },
        apiKey: { type: String, default: '' },
        defaultService: { type: String, default: 'Priority Mail' },
      },
      ups: {
        enabled: { type: Boolean, default: true },
        accountNumber: { type: String, default: '1Z9999999999999999' },
        clientId: { type: String, default: '' },
        clientSecret: { type: String, default: '' },
        defaultService: { type: String, default: 'UPS Ground' },
      },
      fedex: {
        enabled: { type: Boolean, default: true },
        accountNumber: { type: String, default: 'FDX-7410293' },
        apiKey: { type: String, default: '' },
        secretKey: { type: String, default: '' },
        meterNumber: { type: String, default: '' },
        defaultService: { type: String, default: 'FedEx 2Day' },
      },
    },
  },
  { timestamps: true },
)

/**
 * Singleton retrieval helper with safe default fallback.
 */
walletSettingSchema.statics.getOrCreate = async function getOrCreate() {
  let doc = await this.findOne()
  if (!doc) {
    doc = await this.create({ usdRatePerPkr: 280 })
  }
  return doc
}

const WalletSetting = mongoose.model('WalletSetting', walletSettingSchema)

export default WalletSetting
