/* =========================================================
   Vercel Serverless Function — proxy anti-CORS.
   Frontend memanggil: GET /api/extract?provider=<id>&url=<link>
   Fungsi ini yang meneruskan ke endpoint pihak ketiga.
   ========================================================= */

function detectPlatform(url) {
  const u = String(url || "").toLowerCase();
  if (/tiktok|vm\.tiktok|vt\.tiktok/.test(u)) return "TikTok";
  if (/instagram|instagr\.am/.test(u)) return "Instagram";
  if (/facebook|fb\.watch|fb\.com/.test(u)) return "Facebook";
  if (/youtube|youtu\.be/.test(u)) return "YouTube";
  if (/twitter|x\.com|t\.co/.test(u)) return "Twitter / X";
  if (/pinterest|pin\.it/.test(u)) return "Pinterest";
  if (/reddit|v\.redd/.test(u)) return "Reddit";
  return "Sosmed";
}

const PROVIDERS = {
  // ─── Zyvor All-in-One (TikTok, Instagram, Facebook, YouTube, Twitter/X, dll) ───
  zyvor: {
    method: "POST",
    url: "https://api.zyvor.my.id/api/downloader/allinone",
    headers: () => ({ "Content-Type": "application/json" }),
    body: (url) => JSON.stringify({ url }),
    normalize: (json, url) => {
      if (!json || json.status !== true || !json.result) {
        return {
          success: false,
          error: {
            code: "EXTRACT_FAILED",
            message: (json && json.error) || "Gagal mengambil video (link tidak valid / platform belum didukung / server sibuk).",
          },
        };
      }
      const r = json.result;
      const items = [];
      (r.downloads || []).forEach((d) => {
        if (!d || !d.url) return;
        const isAudio = /audio/i.test(d.label || "") || /sf=mp3/i.test(d.url);
        const label = (d.label || "Download")
          .replace(/^Download\s*/i, "")
          .replace(/[()]/g, "")
          .trim();
        items.push({
          label: isAudio ? "Audio (MP3)" : label || "Video",
          url: d.url,
          type: isAudio ? "audio" : "video",
        });
      });
      if (items.length === 0) {
        return { success: false, error: { code: "NO_MEDIA", message: "Tidak ada media yang bisa diunduh dari link ini." } };
      }
      const video = items.find((i) => i.type !== "audio");
      const audio = items.find((i) => i.type === "audio");
      return {
        success: true,
        data: {
          platform: detectPlatform(url),
          title: r.title || "Video",
          author: r.owner || "",
          thumbnail: r.thumbnail || "",
          duration: null,
          quality: "",
          video_url: video ? video.url : "",
          audio_url: audio ? audio.url : null,
          items,
        },
      };
    },
  },

  // ─── TEMPLATE: tambah provider lain (IG/FB/dll) di sini ─
  // zyvor_ig: {
  //   method: "POST",
  //   url: "https://api.zyvor.my.id/api/downloader/instagram...",
  //   headers: () => ({ "Content-Type": "application/json" }),
  //   body: (url) => JSON.stringify({ url }),
  //   normalize: (json) => {
  //     // mapping field dari respons endpoint itu ke format:
  //     // return { success: true, data: { platform, title, author, thumbnail,
  //     //           duration, quality, video_url, audio_url, items:[] } };
  //   },
  // },
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const { provider, url, apiKey } = req.query || {};

  if (!provider || !url) {
    res.status(400).json({ success: false, error: { code: "MISSING_PARAM", message: "provider & url wajib diisi" } });
    return;
  }

  const p = PROVIDERS[provider];
  if (!p) {
    res.status(400).json({ success: false, error: { code: "UNKNOWN_PROVIDER", message: `Provider '${provider}' tidak terdaftar di api/extract.js` } });
    return;
  }

  try {
    const targetUrl = p.method === "POST" ? p.url : `${p.url}?url=${encodeURIComponent(url)}`;
    const fetchOpts = {
      method: p.method || "GET",
      headers: { ...(p.headers ? p.headers(apiKey) : {}), "User-Agent": "Mozilla/5.0 SnapGrab/1.0" },
    };
    if (p.body) fetchOpts.body = p.body(url);

    const upstream = await fetch(targetUrl, fetchOpts);
    const text = await upstream.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }

    if (!upstream.ok) {
      res.status(upstream.status).json({
        success: false,
        error: {
          code: "UPSTREAM_" + upstream.status,
          message: (json && json.error) || `Endpoint error (HTTP ${upstream.status}) — kemungkinan server sibuk, coba lagi nanti.`,
        },
      });
      return;
    }
    if (!json) {
      res.status(502).json({ success: false, error: { code: "BAD_JSON", message: "Endpoint tidak mengembalikan JSON" } });
      return;
    }
    res.status(200).json(p.normalize(json, url));
  } catch (e) {
    res.status(502).json({ success: false, error: { code: "FETCH_FAILED", message: e.message } });
  }
};
                                      
