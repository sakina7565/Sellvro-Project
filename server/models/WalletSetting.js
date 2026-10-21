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
