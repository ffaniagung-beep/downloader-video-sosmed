/* =========================================================
   supabase.js — OPSIONAL. Log download ke Supabase (tanpa login).
   Aktifkan & isi kredensial di js/config.js.
   ========================================================= */
(function () {
  const cfg = (window.APP_CONFIG || {}).supabase || {};
  if (!cfg.enabled || !cfg.url || !cfg.anonKey) {
    window.SupaLog = { log: async () => {} }; // no-op
    return;
  }

  // Load supabase-js client dari CDN
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = () => {
    try {
      const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
      window.SupaLog = {
        log: async (platform, url) => {
          try {
            await sb.from(cfg.table || "download_logs").insert({ platform, url });
          } catch (e) {
            console.warn("Supabase log gagal (abaikan jika tabel belum dibuat):", e.message);
          }
        },
      };
    } catch (e) {
      console.warn("Init Supabase gagal:", e.message);
      window.SupaLog = { log: async () => {} };
    }
  };
  script.onerror = () => {
    console.warn("Gagal load supabase-js, fitur log dimatikan.");
    window.SupaLog = { log: async () => {} };
  };
  document.head.appendChild(script);
})();
