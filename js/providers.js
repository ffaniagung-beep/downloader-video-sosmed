/* =========================================================
   providers.js — deteksi platform + pemanggilan endpoint via proxy
   ========================================================= */
(function () {
  const PLATFORM_PATTERNS = [
    { id: "tiktok", name: "TikTok", patterns: [/tiktok\.com/i, /vm\.tiktok\.com/i, /vt\.tiktok\.com/i] },
    { id: "instagram", name: "Instagram", patterns: [/instagram\.com/i, /instagr\.am/i] },
    { id: "facebook", name: "Facebook", patterns: [/facebook\.com/i, /fb\.watch/i, /fb\.com/i] },
    { id: "twitter", name: "Twitter / X", patterns: [/twitter\.com/i, /x\.com/i, /t\.co/i] },
    { id: "pinterest", name: "Pinterest", patterns: [/pinterest\.com/i, /pin\.it/i] },
    { id: "reddit", name: "Reddit", patterns: [/reddit\.com/i, /v\.redd\.it/i] },
    { id: "threads", name: "Threads", patterns: [/threads\.net/i] },
    { id: "youtube", name: "YouTube", patterns: [/youtube\.com/i, /youtu\.be/i] },
    { id: "snapchat", name: "Snapchat", patterns: [/snapchat\.com/i] },
    { id: "linkedin", name: "LinkedIn", patterns: [/linkedin\.com/i] },
  ];

  function detectPlatform(url) {
    for (const p of PLATFORM_PATTERNS) {
      if (p.patterns.some((re) => re.test(url))) return p;
    }
    return null;
  }

  /* Coba semua provider yang enabled, berurutan.
     Return objek ter-normalisasi:
     { platform, title, author, thumbnail, duration, quality,
       links: [{label, url, type:'video'|'audio', quality}] } */
  async function extractVideo(url) {
    const cfg = window.APP_CONFIG;
    const enabled = cfg.providers.filter((p) => p.enabled);
    if (enabled.length === 0) {
      throw new Error("Tidak ada provider aktif. Aktifkan minimal satu provider di js/config.js");
    }
    const errors = [];
    for (const provider of enabled) {
      try {
        const params = new URLSearchParams({ provider: provider.id, url });
        if (provider.apiKey) params.set("apiKey", provider.apiKey);
        if (provider.host) params.set("host", provider.host);
        const res = await fetch("/api/extract?" + params.toString());
        const body = await res.json().catch(() => null);
        if (!res.ok || !body || body.success === false) {
          const code = body && body.error ? body.error.code : "HTTP_" + res.status;
          errors.push(`${provider.label}: ${code}`);
          continue; // coba provider berikutnya
        }
        return normalize(body.data, provider.id);
      } catch (e) {
        errors.push(`${provider.label}: ${e.message}`);
      }
    }
    throw new Error(
      "Semua provider gagal. Kemungkinan: limit harian habis, link privat, atau endpoint sedang down.\n\nDetail: " +
        errors.join(" | ")
    );
  }

  function normalize(data, providerId) {
    const links = [];
    // Jika proxy sudah mengembalikan daftar items lengkap (label + url + type), pakai itu
    if (Array.isArray(data.items) && data.items.length) {
      data.items.forEach((it) => {
        if (it.url) {
          links.push({ label: it.label || "Download", url: it.url, type: it.type || "video", quality: it.quality });
        }
      });
    } else {
      if (data.video_url) {
        links.push({ label: `Download Video${data.quality ? " (" + data.quality + ")" : ""}`, url: data.video_url, type: "video", quality: data.quality });
      }
      if (data.audio_url) {
        links.push({ label: "Download Audio (MP3)", url: data.audio_url, type: "audio" });
      }
    }
    // Format fastsaver: { url, thumbnail, author, duration, formats:[{url, quality, ext}] }
    if (Array.isArray(data.formats) && data.formats.length) {
      data.formats.forEach((f) => {
        links.push({ label: `${f.ext ? f.ext.toUpperCase() : "Video"} ${f.quality || ""}`, url: f.url, type: f.ext === "mp3" ? "audio" : "video", quality: f.quality });
      });
    }
    // Pisahkan gambar (slide) dari link download — URL berakhiran gambar dianggap slide
    const isImgUrl = (u) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u || "");
    const imagesFromItems = links.filter((l) => l.type === "video" && isImgUrl(l.url)).map((l) => l.url);
    const realLinks = links.filter((l) => !(l.type === "video" && isImgUrl(l.url)));
    const images = [...(Array.isArray(data.images) ? data.images : []), ...imagesFromItems];
    const hasVideo = realLinks.some((l) => l.type === "video");
    const isSlides = Boolean(data.isSlides) || (!hasVideo && images.length > 0);
    if (realLinks.length === 0 && !isSlides) throw new Error("Endpoint tidak mengembalikan link video yang bisa diunduh.");

    return {
      platform: data.platform || providerId,
      title: data.title || data.caption || "Video",
      author: data.author || data.username || "",
      creator: data.creator || data.nickname || data.name || "",
      thumbnail: data.thumbnail || data.cover || (images[0] || ""),
      duration: data.duration ? formatDuration(data.duration) : "",
      quality: data.quality || "",
      likes: data.likes != null ? Number(data.likes) : null,
      comments: data.comments != null ? Number(data.comments) : null,
      shares: data.shares != null ? Number(data.shares) : null,
      plays: data.plays != null ? Number(data.plays) : null,
      description: data.description || data.caption || data.desc || "",
      images,
      isSlides,
      links: realLinks,
    };
  }

  function formatDuration(sec) {
    const s = Math.round(Number(sec) || 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  window.VideoProviders = { detectPlatform, extractVideo };
})();
