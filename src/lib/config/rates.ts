// Unit rates in Rupiah (fixed rates per hour)
export const UNIT_RATES = {
    APP: 822000,
    TWR: 575500,
    AFIS: 246500,
} as const;

// PPN (VAT) percentage
export const PPN_RATE = 0.12; // 12%

// Airport code
export const AIRPORT_CODE = "WITT";

// Flight type codes for receipt numbering
export const FLIGHT_TYPE_CODES = {
    DOM: "21",
    INT: "22",
} as const;

// Bank transfer details for receipts
export const BANK_DETAILS = {
    bankName: "BANK SYARIAH INDONESIA",
    branchName: "CABANG BANDA ACEH",
    accountName: "PERUM LPPNPI CABANG BANDA ACEH",
    accountNumber: "7143344287",
} as const;

// Company info
export const COMPANY_INFO = {
    name: "AIRNAV INDONESIA",
    fullName: "PERUM LEMBAGA PENYELENGGARA PELAYANAN NAVIGASI PENERBANGAN INDONESIA",
    subtitle: "ADVANCED/EXTENDED CHARGES",
} as const;
