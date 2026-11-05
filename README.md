# SnapGrab — Video Downloader Web (HTML + Supabase + Vercel)

Web downloader video dari TikTok, Facebook, Twitter/X, Pinterest, Reddit, Threads, dll. Tanpa login. Struktur modular, siap deploy ke Vercel.

## Struktur Proyek

```
videodl/
├── index.html          # halaman utama
├── css/style.css       # styling
├── js/
│   ├── config.js       # ⭐ EDIT INI: daftar provider & kredensial Supabase
│   ├── providers.js    # deteksi platform + panggil endpoint via proxy
│   ├── supabase.js     # (opsional) log download ke Supabase
│   └── app.js          # logika UI
├── api/
│   └── extract.js      # ⭐ Vercel serverless function — proxy anti-CORS
├── vercel.json         # konfigurasi Vercel
└── README.md
```

## Cara Deploy ke Vercel (3 menit)

1. Daftar / login di [vercel.com](https://vercel.com) (bisa pakai akun GitHub).
2. Klik **Add New → Project**, upload folder ini (atau connect ke repo GitHub).
3. Framework preset: **Other** (static). Biarkan default.
4. Klik **Deploy**. Selesai — kamu dapat link `https://namaproject.vercel.app`.

> Folder `api/` otomatis terdeteksi sebagai serverless function oleh Vercel. Tidak perlu setting tambahan.

## Cara Menambah / Mengganti Endpoint

Semua endpoint pihak ketiga diatur di **`js/config.js`** (bagian `providers`) dan implementasi server-side-nya di **`api/extract.js`** (objek `PROVIDERS`). Untuk menambah provider baru:

1. Daftar ke penyedia API (misal [FastSaver](https://fastsaverapi.com), RapidAPI "All-in-One Video Downloader", atau self-host [Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API)).
2. Tambah entri di `config.js` → `providers` (set `enabled: true`, isi `apiKey` bila perlu).
3. Tambah handler dengan nama `id` yang sama di `api/extract.js` → `PROVIDERS` (isi `buildUrl`, `headers`, `normalize`).

### Kenapa lewat proxy?
Endpoint publik umumnya **tidak mengirim header CORS**, jadi tidak bisa dipanggil langsung dari browser. Proxy `/api/extract` yang meneruskan request dari server Vercel — selalu berhasil.

## Mengaktifkan Instagram / YouTube

Endpoint gratis tanpa key (SaveReelsFast) **tidak support Instagram & YouTube**. Untuk mengaktifkannya:

1. Daftar gratis di [fastsaverapi.com](https://fastsaverapi.com), dapatkan API key.
2. Buka `js/config.js`, di provider `fastsaver`: set `enabled: true` dan isi `apiKey: "..."`.
3. Deploy ulang. Selesai — IG & YouTube aktif.

## Mengaktifkan Supabase (opsional, untuk statistik)

Tanpa login, Supabase hanya dipakai untuk **log download** (berapa kali, platform apa). Jika tidak butuh, biarkan `enabled: false`.

1. Buat project di [supabase.com](https://supabase.com), catat `Project URL` & `anon public key`.
2. Di SQL Editor Supabase, jalankan:
   ```sql
   create table download_logs (
     id bigint generated always as identity primary key,
     platform text,
     url text,
     created_at timestamptz default now()
   );
   alter table download_logs enable row level security;
   create policy "allow insert anon" on download_logs for insert to anon with check (true);
   ```
3. Buka `js/config.js` → `supabase`: set `enabled: true`, isi `url` & `anonKey`.
4. Deploy ulang.

## Batasan & Catatan Penting

- **Rate limit**: endpoint gratis biasanya 50 request/hari per IP. Karena lewat proxy Vercel, IP-nya shared — jika ramai, bisa cepat habis. Solusi: tambah provider berbayar/key, atau self-host parser.
- **Link video expired**: URL CDN dari sosmed umumnya kedaluwarsa beberapa jam. Segera download setelah muncul.
- **Privat content**: video akun privat / perlu login tidak bisa di-download (semua endpoint menolaknya).
- **Hak cipta**: hanya download konten yang kamu miliki / diizinkan. Hormati kreator dan ToS platform. Web ini tidak menyimpan konten apa pun di server.

## Tes Lokal

```bash
npx serve .        # atau: python3 -m http.server 8080
```
Buka `http://localhost:8080`. Catatan: fitur download hanya aktif setelah di-deploy ke Vercel (karena butuh serverless function `/api/extract`). Untuk tes lokal penuh, install [Vercel CLI](https://vercel.com/docs/cli): `vercel dev`.
