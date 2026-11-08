# DompetKu

[English](README.md) · [Bahasa Indonesia](README.id.md)

Aplikasi catatan keuangan personal berbasis Laravel 13, React 19, Inertia, PostgreSQL, dan double-entry ledger.

## Fitur

- Pemasukan, pengeluaran, transfer, dan tanggal transaksi kustom.
- **Edit transaksi** — ubah nominal, kategori, sumber dana, tanggal, atau jenis pemasukan↔pengeluaran; journal line dihapus & ditulis ulang dalam satu DB transaction.
- **Input nominal Rupiah berformat** — ketik `10000000` tampil `10.000.000`; shorthand `10k` → 10.000; chips Rp10rb–Rp100rb.
- Dashboard bulan ini, bulan lalu, atau tiga bulan terakhir.
- **Sisa kas vs sisa konsumsi** — setoran tabungan mengurangi saldo kas, tapi tidak dihitung sebagai konsumsi. Dua sudut pandang ditampilkan berdampingan.
- **Pemasukan rutin vs bonus** — transaksi bertanda non-rutin (bonus/THR) tetap masuk saldo dan arus kas, tetapi tidak menggelembungkan patokan anggaran bulanan: sisa bulan, rasio 50/30/20, dan persentase kategori selalu dihitung dari gaji rutin. Bonus tampil terpisah di Dashboard dan Laporan.
- **Laporan interaktif** — card Pemasukan/Pengeluaran/Arus bersih bisa diklik: rincian per kategori (nominal + persen), dan setiap kategori bisa dibuka lagi menjadi daftar transaksinya. Rentang tanggal memakai kalender kustom.
- Saldo keseluruhan (kekayaan bersih), saldo periode, dan saldo likuid saat ini.
- Sumber dana serta kategori kustom yang terisolasi per user.
- **Kategori dengan kelompok** — tiap kategori ditandai Kebutuhan wajib / Gaya hidup / Tabungan; menentukan bagaimana saran otomatis menilai.
- Target tabungan, kasbon/piutang, pinjaman/utang, dan pembayaran parsial.
- **Setoran tabungan dari luar** — mis. istri menabung; saldo sumber dana tidak tersentuh, tabungan tetap nambah; histori mutasi per goal mencatat siapa & dari mana.
- Kasbon mengurangi sumber dana ketika diberikan dan mengembalikannya ketika dibayar.
- **Laporan dengan donut chart SVG native** — alokasi pemasukan (kategori + sisa uang = 100%); persentase selalu dari pemasukan, bukan dari total pengeluaran.
- **Saran otomatis** berbasis patokan 50/30/20 (Warren & Tyagi, *All Your Worth*, 2005): rasio tabungan ≥20%, kebutuhan wajib ≤50%, gaya hidup ≤30%, dana darurat 3–6× pengeluaran bulanan. Kategori wajib tidak disarankan dipangkas.
- **Export Excel multi-sheet** termasuk sheet `Analisis` flat untuk parsing AI.
- Bahasa Indonesia/English serta mode terang/gelap/sistem.
- Layout mobile-first dengan sidebar off-canvas, form adaptif, dan target sentuh 44 px.
- Autentikasi, avatar profil, passkey, dan 2FA.
- PWA yang bisa dipasang dengan fallback offline dan navigasi mobile-first.

## Menjalankan di lokal

Database lokal yang direkomendasikan adalah PostgreSQL 17 agar sama dengan production. PostgreSQL dan Redis dijalankan melalui Docker, sementara PHP dapat memakai Laravel Herd.

```bash
docker compose -f compose.local.yml up -d
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm run build
composer run dev
```

Salin nilai `DB_*` dari `.env.example` (mengikuti `compose.local.yml`) ke `.env`. Akun demo hasil seeder beserta kredensialnya tercantum di [`database/seeders/DatabaseSeeder.php`](database/seeders/DatabaseSeeder.php) — seluruh datanya fiktif.

Untuk demo tanpa Docker, ubah `DB_CONNECTION=sqlite`, kosongkan variabel `DB_*` lain, buat file `database/database.sqlite`, lalu jalankan migrasi.

## Pemeriksaan kualitas

```bash
php artisan test
npm run check
npm run types:check
npm run build
```

UI perlu diuji pada lebar 320, 375, 768, 1024, dan 1280 px, dalam mode terang dan gelap.

## Deploy ke VPS

```bash
cp .env.production.example .env.production
# Isi APP_KEY, URL, password PostgreSQL, password Redis, dan mail provider.
docker compose --env-file .env.production -f compose.production.yml build
docker compose --env-file .env.production -f compose.production.yml run --rm app php artisan migrate --force
docker compose --env-file .env.production -f compose.production.yml up -d
```

Image `app` sudah berisi PHP/vendor/build frontend dan image `web` sudah berisi aset publik, sehingga deploy tidak bergantung pada `vendor`, `node_modules`, atau `public/build` milik host. Pasang TLS pada reverse proxy dan siapkan backup PostgreSQL terjadwal sebelum go-live.

Detail keputusan teknis tersedia di [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Lisensi

Dirilis di bawah [Lisensi MIT](LICENSE).
