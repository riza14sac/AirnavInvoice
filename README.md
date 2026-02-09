# AirNav Invoice System - WITT

Sistem Pengelolaan Tagihan Advanced/Extended Charges untuk Bandara Sultan Iskandar Muda (ICAO: WITT).

## 📋 Features

- ✅ **User Authentication** - Login dengan role-based access (Admin, Operator, Viewer)
- ✅ **Service Management** - Input data layanan navigasi penerbangan (APP/TWR/AFIS)
- ✅ **Auto Calculation** - Perhitungan otomatis durasi, jam tagih, gross, PPN, dan total
- ✅ **Auto Numbering** - Nomor kuitansi otomatis (WITT.CODE.YYYY.MM.NNNN)
- ✅ **PDF Generation** - Generate Receipt, Breakdown, dan Combined PDF
- ✅ **CSV Import/Export** - Import data lama dan export laporan
- ✅ **Dashboard** - KPI interaktif, tren, top airlines, overdue list
- ✅ **Timezone Support** - Input WIB, simpan UTC, tampilkan keduanya

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm atau pnpm

### Installation

```bash
# Clone repository
cd airnav-invoice-app

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dan isi DATABASE_URL dengan koneksi PostgreSQL Anda

# Generate Prisma client
npm run db:generate

# Push schema ke database
npm run db:push

# Seed initial data (admin user)
npm run db:seed

# Run development server
npm run dev
```

### Default Users

Setelah seed:

| Role     | Email                  | Password    |
|----------|------------------------|-------------|
| Admin    | admin@airnav.co.id     | admin123    |
| Operator | operator@airnav.co.id  | operator123 |
| Viewer   | viewer@airnav.co.id    | viewer123   |

## 📁 Project Structure

```
airnav-invoice-app/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── public/
│   └── logos/             # Logo assets
├── src/
│   ├── app/
│   │   ├── (auth)/        # Auth pages (login)
│   │   ├── (app)/         # App pages (dashboard, services, users)
│   │   └── api/           # API routes
│   ├── components/
│   │   ├── layout/        # AppShell, Sidebar, Topbar
│   │   └── ui/            # shadcn/ui components
│   ├── lib/
│   │   ├── auth/          # Auth utilities
│   │   ├── calc/          # Billing & receipt calculation
│   │   ├── config/        # Constants & rates
│   │   ├── csv/           # CSV parsing
│   │   ├── db/            # Prisma client
│   │   ├── export/        # CSV export
│   │   ├── pdf/           # PDF generation
│   │   └── time/          # Timezone utilities
│   ├── types/             # TypeScript types
│   └── validators/        # Zod schemas
└── storage/               # PDF & import storage
```

## 💰 Billing Rates

| Unit | Rate per Jam |
|------|--------------|
| APP  | Rp 822.000   |
| TWR  | Rp 575.500   |
| AFIS | Rp 246.500   |

- **PPN**: 12% dari Gross Total
- **Billable Hours**: Ceiling per jam (5 menit = 1 jam tagih)

## 📄 Receipt Number Format

```
WITT.<CODE>.<YYYY>.<MM>.<NNNN>
```

- **WITT**: Airport code
- **CODE**: 21 (Domestic) atau 22 (International)
- **YYYY.MM**: Tahun dan bulan dari ATA (dalam WIB)
- **NNNN**: Nomor urut 4 digit (per bucket CODE+YYYY+MM)

Contoh: `WITT.21.2025.12.0208`

## 🔐 Role Permissions

| Permission      | Admin | Operator | Viewer |
|-----------------|-------|----------|--------|
| View Dashboard  | ✅    | ✅       | ✅     |
| View Services   | ✅    | ✅       | ✅     |
| Create Service  | ✅    | ✅       | ❌     |
| Import CSV      | ✅    | ✅       | ❌     |
| Export CSV      | ✅    | ✅       | ❌     |
| Mark as Paid    | ✅    | ✅       | ❌     |
| Delete Service  | ✅    | ❌       | ❌     |
| Manage Users    | ✅    | ❌       | ❌     |

## 📊 CSV Import Format

```csv
airline_operator_gh,flight_type,flight_number,registration,aircraft_type,departure,arrival,arrival_date,ata_utc,atd_utc,service_start_utc,service_end_utc,advance_extend,unit_app,unit_twr,unit_afis,pic_dinas
PT. BATIK INDONESIA AIR,DOM,BTK6898,PK-LZH,A320,WIII,WITT,2025-12-13,19:05:00,,19:00:00,19:05:00,EXTEND,1,0,0,WIDYA ANGGRAINI
```

## 🖨️ PDF Output

Sistem menghasilkan 3 jenis PDF:

1. **Breakdown (Lampiran 1)** - Detail lengkap dengan tabel unit charges
2. **Receipt (Lampiran 2)** - Kuitansi ringkas untuk pembayaran
3. **Combined** - Gabungan kedua dokumen

## 🛠️ Development

```bash
# Run development server
npm run dev

# Run Prisma Studio (database GUI)
npm run db:studio

# Build for production
npm run build

# Start production server
npm start
```

## 📝 License

Internal use only - PERUM LPPNPI Cabang Banda Aceh

---

Built with ❤️ using Next.js 14, TypeScript, Prisma, and Tailwind CSS.
