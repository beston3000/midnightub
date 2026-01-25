"use strict";

/**
 * Player loader (Games + Apps)
 * - Supports CSV lists (preferred) with JSON fallback
 * - Games: if gameType === "local", loads URL directly (no Scramjet)
 * - Otherwise proxies through Scramjet inside the player iframe
 * - Apps: same behavior (local allowed; otherwise proxied)
 * - Keeps back/forward/reload/fullscreen controls
 * - Default icon: ./assets/images/{id}.webp
 */

(function () {
  const form = document.getElementById("sj-form");
  const address = document.getElementById("sj-address");
  const searchEngine = document.getElementById("sj-search-engine");
  const host = document.getElementById("gameHost");
  const loading = document.getElementById("loading");
  const titleEl = document.getElementById("gameTitle");
  const iconEl = document.getElementById("gameIcon");

  const backBtn = document.getElementById("navBack");
  const forwardBtn = document.getElementById("navForward");
  const reloadBtn = document.getElementById("navReload");
  const fullBtn = document.getElementById("navFull");
  const gamesBtn = document.getElementById("navGames");

  const error = document.getElementById("sj-error");
  const errorCode = document.getElementById("sj-error-code");

  if (!host) {
    alert("Missing #gameHost in play.html");
    return;
  }

  function showError(message, err) {
    if (!error || !errorCode) {
      alert(message + (err ? "\n\n" + String(err) : ""));
      return;
    }
    error.textContent = message;
    errorCode.textContent = err ? String(err) : "";
    error.style.display = "block";
    errorCode.style.display = "block";
    if (loading) loading.style.display = "none";
  }

  function hideError() {
    if (error) error.style.display = "none";
    if (errorCode) errorCode.style.display = "none";
  }

  // ============================================================
  // CSV utilities (supports quoted fields + commas)
  // ============================================================
  function parseCSV(text) {
    const s = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < s.length; i++) {
      const c = s[i];

      if (inQuotes) {
        if (c === '"') {
          // escaped quote
          if (s[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ",") {
          row.push(field);
          field = "";
        } else if (c === "\n") {
          row.push(field);
          field = "";
          // ignore totally-empty trailing lines
          if (row.some((x) => String(x).trim() !== "")) rows.push(row);
          row = [];
        } else {
          field += c;
        }
      }
    }

    // last row
    row.push(field);
    if (row.some((x) => String(x).trim() !== "")) rows.push(row);

    if (!rows.length) return [];
    const headers = rows.shift().map((h) => String(h || "").trim());

    return rows.map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? "").toString().trim();
      });
      return obj;
    });
  }

  async function fetchFirstAvailable(paths) {
    let lastErr = null;
    for (const p of paths) {
      try {
        const res = await fetch(p, { cache: "no-store" });
        if (!res.ok) throw new Error(`${p} -> HTTP ${res.status}`);
        const text = await res.text();
        return { path: p, text };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("No list files found");
  }

  function pick(obj, keys, fallback = "") {
    for (const k of keys) {
      if (obj && obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]).trim();
    }
    return fallback;
  }

  function normalizeItem(raw, kind) {
    const id = pick(raw, ["id", "ID", "Id", "gameId", "appId"]);
    const name =
      kind === "games"
        ? pick(raw, ["gameName", "name", "title", "appName"], id)
        : pick(raw, ["appName", "name", "title", "gameName"], id);

    const url =
      kind === "games"
        ? pick(raw, ["gameURL", "url", "href", "appURL"])
        : pick(raw, ["appURL", "url", "href", "gameURL"]);

    const type =
      (kind === "games"
        ? pick(raw, ["gameType", "type", "appType"], "online")
        : pick(raw, ["appType", "type", "gameType"], "online")
      ).toLowerCase();

    const icon =
      pick(raw, ["gameIcon", "appIcon", "icon"], "") || (id ? `./assets/images/${id}.webp` : "");

    return { id, name, url, type, icon, raw };
  }

  async function loadList(kind) {
    // Try CSV first, then JSON for backwards compatibility
    // NOTE: apps.csv is now the PRIMARY for apps.
    const gameCandidates = [
      "gameList.csv",
      "/gameList.csv",
      "games.csv",
      "/games.csv",
      "gameList.json",
      "/gameList.json",
    ];

    const appCandidates = [
      "apps.csv",
      "/apps.csv",
      // fallback to older names if still present
      "apps-list.csv",
      "/apps-list.csv",
      "apps-list.json",
      "/apps-list.json",
    ];

    const candidates = kind === "games" ? gameCandidates : appCandidates;
    const { path, text } = await fetchFirstAvailable(candidates);

    // CSV
    if (path.toLowerCase().endsWith(".csv")) {
      const rows = parseCSV(text);
      return rows.map((r) => normalizeItem(r, kind)).filter((x) => x.id);
    }

    // JSON fallback (old format)
    try {
      const data = JSON.parse(text);
      const arr =
        kind === "games"
          ? (Array.isArray(data?.games) ? data.games : Array.isArray(data) ? data : [])
          : (Array.isArray(data?.apps) ? data.apps : Array.isArray(data) ? data : []);

      return arr.map((r) => normalizeItem(r, kind)).filter((x) => x.id);
    } catch (e) {
      throw new Error(`Failed to parse ${path} as JSON or CSV: ${String(e)}`);
    }
  }

  // ============================================================
  // Scramjet setup (lazy-init so local loads still work)
  // ============================================================
  /** @type {any|null} */
  let scramjet = null;
  /** @type {any|null} */
  let connection = null;
  /** @type {any|null} */
  let frame = null;

  /** @type {HTMLIFrameElement|null} */
  let localFrame = null;

  let transportReady = false;

  function ensureScramjet() {
    if (scramjet && connection) return;

    if (!window.$scramjetLoadController) {
      throw new Error("Scramjet controller loader wasn't found. Is /scram/scramjet.all.js loading?");
    }
    if (!window.BareMux || !window.BareMux.BareMuxConnection) {
      throw new Error("BareMux wasn't found. Is baremux/index.js loading?");
    }

    const { ScramjetController } = window.$scramjetLoadController();
    scramjet = new ScramjetController({
      files: {
        wasm: "/scram/scramjet.wasm.wasm",
        all: "/scram/scramjet.all.js",
        sync: "/scram/scramjet.sync.js",
      },
    });
    scramjet.init();

    connection = new BareMux.BareMuxConnection("/baremux/worker.js");
  }

  async function ensureTransportOnce() {
    if (transportReady) return;
    await ensureTransport();
    transportReady = true;
  }

  async function ensureTransport() {
    ensureScramjet();

    const wispUrl =
      (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";

    if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
      await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    }
  }

  function activeIframe() {
    return frame?.frame ? frame.frame : localFrame;
  }

  function activeWindow() {
    return activeIframe()?.contentWindow || null;
  }

  function updateButtons() {
    const has = !!activeIframe();
    if (backBtn) backBtn.disabled = !has;
    if (forwardBtn) forwardBtn.disabled = !has;
    if (reloadBtn) reloadBtn.disabled = !has;
    if (fullBtn) fullBtn.disabled = !has;
  }

  async function goBack() {
    if (frame && typeof frame.back === "function") return frame.back();
    const w = activeWindow();
    try { w?.history?.back?.(); } catch { }
  }

  async function goForward() {
    if (frame && typeof frame.forward === "function") return frame.forward();
    const w = activeWindow();
    try { w?.history?.forward?.(); } catch { }
  }

  async function reloadActive() {
    if (frame) {
      if (typeof frame.reload === "function") return frame.reload();
      if (typeof frame.refresh === "function") return frame.refresh();
    }
    const w = activeWindow();
    try { w?.location?.reload?.(); } catch { }
  }

  function mountIframe(iframe) {
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.setAttribute("allowfullscreen", "true");
    iframe.setAttribute(
      "allow",
      "fullscreen *; autoplay *; clipboard-read *; clipboard-write *; gamepad *; microphone *; camera *; geolocation *"
    );

    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-modals allow-downloads"
    );

    host.innerHTML = "";
    host.appendChild(iframe);
    updateButtons();
  }

  function normalizeInput(raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return "";

    let target = trimmed;
    try {
      if (typeof search === "function") {
        target = search(trimmed, searchEngine?.value || "https://www.google.com/search?q=%s");
      }
    } catch {
      target = trimmed;
    }
    return target;
  }

  // ============================================================
  // Navigation
  // ============================================================
  async function go(url) {
    const raw = String(url || "").trim();
    if (!raw) return;

    hideError();

    try {
      ensureScramjet();
    } catch (err) {
      showError("Scramjet isn't available, so proxied mode can't start.", err);
      return;
    }

    try {
      if (typeof registerSW === "function") {
        await registerSW();
      } else {
        throw new Error("registerSW() is not defined. Is register-sw.js loading?");
      }
    } catch (err) {
      showError("Failed to register service worker.", err);
      return;
    }

    try {
      await ensureTransportOnce();
    } catch (err) {
      showError("Failed to set BareMux transport.", err);
      return;
    }

    const target = normalizeInput(raw);
    if (address) address.value = target;

    // Leaving local mode
    if (localFrame) {
      try { localFrame.remove(); } catch { }
      localFrame = null;
    }

    if (!frame) {
      frame = scramjet.createFrame();
      frame.frame.id = "sj-game-frame";
      mountIframe(frame.frame);
    }

    if (loading) loading.style.display = "none";
    frame.go(target);
  }

  function resolveLocalURL(url) {
    return new URL(url, window.location.href).href;
  }

  async function goLocal(url) {
    // IMPORTANT: if we were previously proxied, reset transportReady
    transportReady = false;

    const raw = String(url || "").trim();
    if (!raw) return;

    hideError();

    const target = resolveLocalURL(raw);
    if (address) address.value = target;

    // Leaving proxied mode
    if (frame) {
      try { frame.frame.remove(); } catch { }
      frame = null;
    }

    if (!localFrame) {
      localFrame = document.createElement("iframe");
      mountIframe(localFrame);
    }

    if (loading) loading.style.display = "none";
    localFrame.src = target;
  }

  function setTitleAndIcon(name, id, iconPath) {
    const safeName = name || "Player";
    if (titleEl) titleEl.textContent = safeName;
    document.title = `${safeName} — Midnight BR0WSER`;

    if (iconEl) {
      const src = iconPath || (id ? `./assets/images/${id}.webp` : "");
      if (src) iconEl.src = src;
    }
  }

  async function loadFromQuery() {
    const params = new URLSearchParams(location.search);
    const gameId = params.get("game");
    const appId = params.get("app");
    const directUrl = params.get("url");

    // Back button behavior
    if (gamesBtn) {
      gamesBtn.addEventListener("click", () => {
        location.href = appId ? "apps.html" : "g.html";
      });
    }

    // Direct URL (manual navigation)
    if (directUrl) {
      setTitleAndIcon("Player", "", "");
      await go(directUrl);
      return;
    }

    // ===============================
    // 🎮 GAME LOADER (CSV/JSON)
    // ===============================
    if (gameId) {
      try {
        const games = await loadList("games");
        const game = games.find((g) => g.id === gameId);

        if (!game) {
          showError("Game not found: " + gameId, null);
          return;
        }

        setTitleAndIcon(game.name || "Game", game.id, game.icon);

        if (String(game.type).toLowerCase() === "local") {
          await goLocal(game.url);
        } else {
          await go(game.url);
        }
        return;
      } catch (err) {
        showError("Couldn't load games list (CSV/JSON).", err);
        return;
      }
    }

    // ===============================
    // 🧩 APP LOADER (CSV/JSON)
    // ===============================
    if (appId) {
      try {
        const apps = await loadList("apps");
        const app = apps.find((a) => a.id === appId);

        if (!app) {
          showError("App not found: " + appId, null);
          return;
        }

        setTitleAndIcon(app.name || "App", app.id, app.icon);

        // Many apps block embedding normally; proxied mode usually fixes that.
        if (String(app.type).toLowerCase() === "local") {
          await goLocal(app.url);
        } else {
          await go(app.url);
        }
        return;
      } catch (err) {
        showError("Couldn't load apps list (CSV/JSON).", err);
        return;
      }
    }

    showError("Nothing selected. Go back and choose a game or app.", null);
  }

  // Controls
  backBtn?.addEventListener("click", () => void goBack());
  forwardBtn?.addEventListener("click", () => void goForward());
  reloadBtn?.addEventListener("click", () => void reloadActive());
  fullBtn?.addEventListener("click", () => {
    const el = activeIframe();
    if (!el) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) req.call(el);
  });

  // Address bar navigation (proxied)
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    void go(address.value);
  });

  // Keyboard shortcuts (lite)
  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const ctrl = isMac ? e.metaKey : e.ctrlKey;

    // Alt+Left/Right
    if (e.altKey && !ctrl) {
      if (e.key === "ArrowLeft") { e.preventDefault(); void goBack(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); void goForward(); return; }
    }

    if (!ctrl) return;

    const key = e.key.toLowerCase();
    if (key === "r") { e.preventDefault(); void reloadActive(); return; }
    if (key === "l") { e.preventDefault(); address?.focus(); address?.select?.(); return; }
  });

  updateButtons();
  void loadFromQuery();
})();