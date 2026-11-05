/* =========================================================
   app.js — logika UI
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const form = $("dl-form");
  const input = $("url-input");
  const pasteBtn = $("paste-btn");
  const detected = $("detected");
  const detectedName = $("detected-name");
  const submitBtn = $("submit-btn");
  const btnLabel = submitBtn.querySelector(".btn-label");
  const btnSpinner = submitBtn.querySelector(".btn-spinner");
  const messageBox = $("message");
  const resultCard = $("result");
  const historySection = $("history-section");
  const historyList = $("history-list");

  const HISTORY_KEY = "snapgrab_history";
  const cfg = window.APP_CONFIG;

  /* ---------- deteksi platform saat mengetik ---------- */
  input.addEventListener("input", () => {
    const p = window.VideoProviders.detectPlatform(input.value.trim());
    if (p) {
      detected.hidden = false;
      detectedName.textContent = p.name;
    } else {
      detected.hidden = true;
    }
  });

  /* ---------- tombol tempel dari clipboard ---------- */
  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        input.value = text;
        input.dispatchEvent(new Event("input"));
      }
    } catch (e) {
      showMessage("Tidak bisa akses clipboard — tempel manual saja ya.", "info");
    }
  });

  /* ---------- submit ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = input.value.trim();
    if (!url) return;

    setLoading(true);
    hideMessage();
    resultCard.hidden = true;

    try {
      const result = await window.VideoProviders.extractVideo(url);
      renderResult(result);
      addToHistory(result, url);
      if (window.SupaLog) window.SupaLog.log(result.platform, url);
    } catch (err) {
      showMessage(err.message, "error");
    } finally {
      setLoading(false);
    }
  });

  function setLoading(on) {
    submitBtn.disabled = on;
    btnSpinner.hidden = !on;
    btnLabel.textContent = on ? "Memproses…" : "Ambil Video";
  }

  function showMessage(text, type) {
    messageBox.hidden = false;
    messageBox.className = "message " + (type || "info");
    messageBox.textContent = text;
  }
  function hideMessage() {
    messageBox.hidden = true;
  }

  /* ---------- render hasil ---------- */
  function renderResult(r) {
    const mediaBox = $("result-media");
    mediaBox.innerHTML = "";

    if (r.isSlides && r.images.length > 0) {
      // ── POSTINGAN SLIDE (foto carousel): galeri horizontal ──
      const gallery = document.createElement("div");
      gallery.className = "slides-gallery";
      r.images.forEach((src, i) => {
        const a = document.createElement("a");
        a.href = src;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "slide-item";
        const img = document.createElement("img");
        img.src = src;
        img.loading = "lazy";
        img.alt = "Slide " + (i + 1);
        a.appendChild(img);
        gallery.appendChild(a);
      });
      mediaBox.appendChild(gallery);
      const hint = document.createElement("p");
      hint.className = "media-hint";
      hint.textContent = "Ini postingan slide (foto). Geser untuk lihat semua, tap gambar untuk buka ukuran penuh, lalu tekan lama → Simpan Gambar.";
      mediaBox.appendChild(hint);
    } else {
      // ── VIDEO: preview bisa diputar, rasio otomatis ikut video asli ──
      const videoLink = r.links.find((l) => l.type === "video");
      const video = document.createElement("video");
      video.className = "result-video";
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      if (r.thumbnail) video.poster = r.thumbnail;
      if (videoLink) video.src = videoLink.url;
      // default rasio sementara sebelum metadata masuk (vertical utk TikTok/IG/dll)
      const vertical = /tiktok|instagram|threads|snapchat|pinterest|reddit/i.test(r.platform || "");
      video.style.aspectRatio = vertical ? "9 / 16" : "16 / 9";
      // setelah metadata dimuat, sesuaikan rasio persis dengan video asli
      video.addEventListener("loadedmetadata", () => {
        const w = video.videoWidth, h = video.videoHeight;
        if (w && h) video.style.aspectRatio = w + " / " + h;
      });
      // jika preview gagal dimuat (mis. CDN blokir), fallback ke thumbnail
      video.addEventListener("error", () => {
        if (r.thumbnail) {
          const img = document.createElement("img");
          img.className = "result-video fallback-thumb";
          img.src = r.thumbnail;
          img.alt = "thumbnail";
          img.style.aspectRatio = video.style.aspectRatio;
          mediaBox.replaceChild(img, video);
          const note = document.createElement("p");
          note.className = "media-hint";
          note.textContent = "Preview tidak bisa diputar di sini, tapi link download di bawah tetap bisa dipakai.";
          mediaBox.appendChild(note);
        }
      });
      mediaBox.appendChild(video);
      const hint = document.createElement("p");
      hint.className = "media-hint";
      hint.textContent = "Putar dulu untuk preview, lalu pilih kualitas download di bawah.";
      mediaBox.appendChild(hint);
    }

    // ── CREATOR ──
    const creatorEl = $("result-creator");
    const name = (r.creator || "").trim();
    const user = (r.author || "").trim();
    let creatorText;
    if (name && user) creatorText = "CREATOR: " + name + " (@" + user + ")";
    else if (name) creatorText = "CREATOR: " + name;
    else if (user) creatorText = "CREATOR: @" + user;
    else creatorText = "CREATOR: " + (r.platform || "Tidak diketahui");
    creatorEl.textContent = "";
    const icon = document.createElement("span");
    icon.className = "stat-icon";
    icon.textContent = "👤";
    creatorEl.appendChild(icon);
    const txt = document.createElement("span");
    txt.textContent = creatorText;
    creatorEl.appendChild(txt);

    // ── STATISTIK (like / komen / share) — sembunyikan jika data tidak ada ──
    setStat("result-likes", "♥️ LIKE: ", r.likes);
    setStat("result-comments", "💬 KOMEN: ", r.comments);
    setStat("result-shares", "↗️ SHARE: ", r.shares);
    const statLine = $("result-stat-line");
    const anyStat = !$("result-likes").hidden || !$("result-comments").hidden || !$("result-shares").hidden;
    statLine.style.display = anyStat ? "flex" : "none";

    // ── DESKRIPSI VIDEO ──
    const descEl = $("result-desc");
    const desc = (r.description || r.title || "").trim();
    if (desc) {
      descEl.textContent = desc;
      descEl.hidden = false;
    } else {
      descEl.hidden = true;
    }

    // ── LINK DOWNLOAD ──
    const linksBox = $("result-links");
    linksBox.innerHTML = "";
    if (r.links.length === 0 && r.isSlides) {
      const note = document.createElement("p");
      note.className = "media-hint";
      note.style.textAlign = "center";
      note.textContent = "Tidak ada file video — simpan gambar slide satu per satu lewat galeri di atas.";
      linksBox.appendChild(note);
    }
    r.links.forEach((l) => {
      const a = document.createElement("a");
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "dl-link" + (l.type === "audio" ? " audio" : "");
      a.innerHTML = `<span>${l.label}</span><span class="dl-size">${l.type === "audio" ? "MP3" : "MP4"} ↓</span>`;
      linksBox.appendChild(a);
    });

    resultCard.hidden = false;
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setStat(id, label, val) {
    const el = $(id);
    if (val == null || Number(val) <= 0) { el.hidden = true; return; }
    el.hidden = false;
    el.textContent = label + formatCompact(Number(val));
  }

  function formatCompact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",").replace(/,0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(".", ",").replace(/,0$/, "") + "K";
    return String(n);
  }

  /* ---------- riwayat (localStorage) ---------- */
  function addToHistory(r, url) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { list = []; }
    list.unshift({ title: r.title, platform: r.platform, url, at: Date.now() });
    list = list.slice(0, cfg.historyLimit || 8);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    renderHistory();
  }

  function renderHistory() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { list = []; }
    if (!list.length) {
      historySection.hidden = true;
      return;
    }
    historySection.hidden = false;
    historyList.innerHTML = "";
    list.forEach((h) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="h-platform">${h.platform}</span><span class="h-title">${escapeHtml(h.title)}</span>`;
      li.style.cursor = "pointer";
      li.title = "Klik untuk isi ulang link";
      li.addEventListener("click", () => {
        input.value = h.url;
        input.dispatchEvent(new Event("input"));
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      historyList.appendChild(li);
    });
  }

  $("clear-history").addEventListener("click", () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  });

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s || "";
    return div.innerHTML;
  }

  renderHistory();
})();
