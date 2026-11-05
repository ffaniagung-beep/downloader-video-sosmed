/* =========================================================
   KONFIGURASI UTAMA — edit file ini saja jika ingin ganti/tambah endpoint
   ========================================================= */
window.APP_CONFIG = {

  /* Daftar provider (endpoint pihak ketiga).
     Dicoba berurutan dari atas; jika gagal, lanjut ke berikutnya.
     Semua dipanggil LEWAT proxy serverless kita (/api/extract) supaya tidak kena CORS. */
  providers: [
    {
      id: "zyvor",
      label: "Zyvor All-in-One (TikTok/IG/FB/YT/dll)",
      enabled: true,
      // Endpoint: https://api.zyvor.my.id/api/downloader/allinone (POST)
      //
      // CARA TAMBAH PLATFORM LAIN (IG/FB/dll) nanti:
      // 1. tambah blok di bawah ini: { id: "zyvor_ig", label: "...", enabled: true }
      // 2. tambah handler dengan id yang sama di api/extract.js -> PROVIDERS (ada templatenya)
    },
    // Contoh template (hapus tanda komentar untuk mengaktifkan):
    // { id: "zyvor_ig", label: "Zyvor API — Instagram", enabled: false },
  ],

  /* Supabase (OPSIONAL, tanpa login) — untuk log/statistik download.
     Biarkan enabled: false jika tidak dipakai. */
  supabase: {
    enabled: false,
    url: "",       // https://xxxx.supabase.co
    anonKey: "",   // anon public key
    table: "download_logs",
  },

  historyLimit: 8,
};
