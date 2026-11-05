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
    $("result-title").textContent = r.title;
    $("result-author").textContent = r.author ? "@" + r.author : r.platform;
    $("result-duration").textContent = r.duration || "—";
    $("result-quality").textContent = r.quality || "HD";
    const thumb = $("result-thumb");
    if (r.thumbnail) {
      thumb.src = r.thumbnail;
      thumb.style.display = "block";
    } else {
      thumb.style.display = "none";
    }
    const linksBox = $("result-links");
    linksBox.innerHTML = "";
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
 
