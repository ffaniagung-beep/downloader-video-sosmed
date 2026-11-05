/* =========================================================
   Vercel Serverless — proxy Remove BG (anti-CORS).
   Frontend memanggil:
     POST /api/removebg  (multipart, upload file gambar langsung)
     GET  /api/removebg?url=<link gambar>  (mode URL, fallback)
   Diteruskan ke endpoint zyvor removebgbgv2.
   ========================================================= */
const UPSTREAM = "https://api.zyvor.my.id/api/image/removebgbgv2";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    let upstreamRes;

    if (req.method === "GET") {
      const url = (req.query && req.query.url) || "";
      if (!url) {
        res.status(400).json({ success: false, error: { code: "MISSING_URL", message: "url wajib diisi" } });
        return;
      }
      upstreamRes = await fetch(UPSTREAM + "?url=" + encodeURIComponent(url), {
        headers: { "User-Agent": "Mozilla/5.0 SnapGrab/1.0" },
      });
    } else if (req.method === "POST") {
      // Teruskan body multipart (file gambar) apa adanya ke upstream.
      // Frontend sudah memperkecil gambar (max 2048px) supaya di bawah limit body serverless.
      const chunks = [];
      for await (const c of req) chunks.push(Buffer.from(c));
      const body = Buffer.concat(chunks);
      upstreamRes = await fetch(UPSTREAM, {
        method: "POST",
        headers: {
          "Content-Type": req.headers["content-type"] || "multipart/form-data",
          "User-Agent": "Mozilla/5.0 SnapGrab/1.0",
        },
        body,
      });
    } else {
      res.status(405).json({ success: false, error: { code: "METHOD_NOT_ALLOWED" } });
      return;
    }

    const text = await upstreamRes.text();
    res.status(upstreamRes.status).setHeader("Content-Type", "application/json").send(text);
  } catch (e) {
    res.status(502).json({ success: false, error: { code: "FETCH_FAILED", message: e.message } });
  }
};
