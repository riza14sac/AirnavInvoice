# 📋 Panduan Lengkap Placeholder Template Word

## Cara Pakai Placeholder

1. Buka file `Template iA.docx`
2. Gunakan **Find & Replace** (Ctrl+H) di Word
3. Ganti teks asli dengan placeholder
4. Save As → `Template_Placeholder.docx`

---

## ✈️ Data Penerbangan

| Placeholder | Keterangan | Contoh Output |
|-------------|------------|---------------|
| `{airline}` | Nama maskapai | PT. BATIK INDONESIA AIR |
| `{flightNumber}` | Nomor penerbangan 1 | BTK6898 |
| `{flightNumber2}` | Nomor penerbangan 2 (jika ada) | BTK6899 |
| `{registration}` | Registrasi pesawat | PK-LZH |
| `{aircraftType}` | Tipe pesawat | A320 |
| `{depStation}` | Stasiun keberangkatan (ICAO) | WIII |
| `{arrStation}` | Stasiun tujuan (ICAO) | WITT |
| `{route}` | Rute lengkap | WIII-WITT |

---

## 📅 Tanggal & Waktu

| Placeholder | Keterangan | Format Output |
|-------------|------------|---------------|
| `{arrivalDate}` | Tanggal kedatangan | 2025-12-13 |
| `{arrivalDateFormatted}` | Tanggal kedatangan (format panjang) | 13 December 2025 |
| `{receiptDate}` | Tanggal kuitansi | 24 December 2025 |
| `{ataTime}` | Waktu ATA (UTC) | 19:05:00 |
| `{ataTimeWib}` | Waktu ATA (WIB) | 02:05:00 |
| `{atdTime}` | Waktu ATD/Departure (UTC) | 19:30:00 |
| `{atdTimeWib}` | Waktu ATD/Departure (WIB) | 02:30:00 |
| `{departureDate}` | Tanggal keberangkatan | 2025-12-13 |
| `{departureDateFormatted}` | Tanggal keberangkatan (format panjang) | 13 December 2025 |
| `{departureTime}` | Waktu keberangkatan (UTC) | 19:30:00 |
| `{departureTimeWib}` | Waktu keberangkatan (WIB) | 02:30:00 |
| `{serviceStart}` | Waktu mulai service (UTC) | 19:00:00 |
| `{serviceEnd}` | Waktu selesai service (UTC) | 19:35:00 |
| `{duration}` | Durasi service | 0:35:00 |
| `{durationMinutes}` | Durasi dalam menit | 35 |
| `{billableHours}` | Jam yang ditagih | 1.00 |

---

## 💰 Biaya

| Placeholder | Keterangan | Contoh Output |
|-------------|------------|---------------|
| `{rate}` | Tarif dasar | 822,000.00 |
| `{grossApp}` | Biaya APP | 500,000.00 |
| `{grossTwr}` | Biaya TWR | 322,000.00 |
| `{grossAfis}` | Biaya AFIS | 0.00 |
| `{grossTotal}` | Total bruto | 822,000.00 |
| `{ppn}` | PPn 11% | 90,420.00 |
| `{netTotal}` | Total bersih (dengan PPn) | 912,420.00 |
| `{total}` | Total (tanpa desimal) | 912,420 |
| `{terbilang}` | Jumlah dalam kata-kata | Sembilan Ratus Dua Belas Ribu Empat Ratus Dua Puluh Rupiah |

---

## 📄 Nomor Dokumen

| Placeholder | Keterangan | Contoh Output |
|-------------|------------|---------------|
| `{seqNo}` | Nomor urut | 0208 |
| `{receiptNo}` | Nomor kuitansi lengkap | WITT.21.2025.12.0208 |
| `{receiptNoPrefix}` | Prefix nomor kuitansi | WITT.21.2025.12. |
| `{receiptNoSeq}` | Sequence nomor | 0208 |

---

## 📝 Info Lainnya

| Placeholder | Keterangan | Contoh Output |
|-------------|------------|---------------|
| `{advanceExtend}` | Tipe layanan (ADVANCE/EXTEND) | EXTEND |
| `{flightType}` | Tipe penerbangan | INTL / DOM |
| `{remark}` | Catatan/Keterangan | WIII-WITT |
| `{picDinas}` | PIC Dinas | John Doe |

---

## ✍️ Tanda Tangan

| Placeholder | Keterangan |
|-------------|------------|
| `{signerName}` | Nama penandatangan (dari database) |
| `{signerTitle}` | Jabatan penandatangan |
| `{%signatureImage}` | **Gambar tanda tangan** (format image placeholder) |

### Cara Memasang Gambar Signature:

1. Di Word template, ketik placeholder: `{%signatureImage}`
2. Pastikan placeholder ada di posisi yang tepat (sebelum nama penandatangan)
3. Pastikan ada **signature aktif** di menu Settings → Signatures

**Contoh layout:**
```
Petugas Official AIRNAV INDONESIA

{%signatureImage}

________________________
{signerName}
```

> **⚠️ PENTING:** 
> - Gunakan `{%signatureImage}` (dengan tanda **%** dan nama **signatureImage**)
> - Gambar akan diambil dari signature yang aktif di database
> - Ukuran gambar otomatis: 150x60 pixel

---

## 🏦 Info Bank

| Placeholder | Keterangan | Contoh Output |
|-------------|------------|---------------|
| `{bankName}` | Nama bank | Bank Mandiri |
| `{bankAccount}` | Nomor rekening | 123-456-789 |
| `{bankHolder}` | Nama pemegang rekening | PT AIRNAV INDONESIA |

---

## ⚠️ Tips Penting

1. **Gunakan kurung kurawal**: `{placeholder}` bukan `{{placeholder}}`
2. **Case-sensitive**: Ketik persis seperti yang tertera
3. **Jangan pecah placeholder**: Pastikan seluruh placeholder dalam 1 run text
   - ✅ Benar: `{airline}`
   - ❌ Salah: `{air` + `line}` (terpisah karena formatting berbeda)
4. **Periksa formatting**: Jika placeholder tidak terganti, hapus dan ketik ulang

---

## 📖 Contoh Find & Replace

Di Word, buka Find & Replace (Ctrl+H):

| Find | Replace with |
|------|--------------|
| `PT. BATIK INDONESIA AIR` | `{airline}` |
| `BTK6898` | `{flightNumber}` |
| `PK-LZH` atau `PKLZH` | `{registration}` |
| `A320` | `{aircraftType}` |
| `822,000.00` (tarif) | `{rate}` |
| `90,420.00` (ppn) | `{ppn}` |
| `912,420.00` (total) | `{netTotal}` |
| `Sembilan Ratus...` | `{terbilang}` |
| `WIDYA ANGGRAINI` | `{signerName}` |
