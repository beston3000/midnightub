"use strict";

/**
 * Simple Scramjet player:
 * - Loads play.html?game=<id> from gameList.json
 * - Loads play.html?app=<id> from apps-list.json
 * - Runs the target URL through Scramjet (proxied) in an embedded frame
 * - Provides back/forward/reload/fullscreen controls
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

  if (!window.$scramjetLoadController) {
    showError("Scramjet controller loader wasn't found. Is /scram/scramjet.all.js loading?", null);
    return;
  }

  const { ScramjetController } = window.$scramjetLoadController();
  const scramjet = new ScramjetController({
    files: {
      wasm: "/scram/scramjet.wasm.wasm",
      all: "/scram/scramjet.all.js",
      sync: "/scram/scramjet.sync.js",
    },
  });

  scramjet.init();

  const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

  /** @type {any|null} */
  let frame = null;

  async function ensureTransport() {
    const wispUrl =
      (location.protocol === "https:" ? "wss" : "ws") +
      "://" +
      location.host +
      "/wisp/";

    if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
      await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    }
  }

  function updateButtons() {
    const has = !!frame;
    if (backBtn) backBtn.disabled = !has;
    if (forwardBtn) forwardBtn.disabled = !has;
    if (reloadBtn) reloadBtn.disabled = !has;
    if (fullBtn) fullBtn.disabled = !has;
  }

  function getFrameWindow() {
    return frame?.frame?.contentWindow || null;
  }

  async function goBack() {
    if (!frame) return;
    if (typeof frame.back === "function") return frame.back();
    const w = getFrameWindow();
    if (w?.history) w.history.back();
  }

  async function goForward() {
    if (!frame) return;
    if (typeof frame.forward === "function") return frame.forward();
    const w = getFrameWindow();
    if (w?.history) w.history.forward();
  }

  async function reloadActive() {
    if (!frame) return;
    if (typeof frame.reload === "function") return frame.reload();
    if (typeof frame.refresh === "function") return frame.refresh();
    const w = getFrameWindow();
    if (w?.location?.reload) return w.location.reload();
  }

  async function go(url) {
    const raw = String(url || "").trim();
    if (!raw) return;

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
      await ensureTransport();
    } catch (err) {
      showError("Failed to set BareMux transport.", err);
      return;
    }

    // Normalize (lets you also type search terms in the bar)
    let target = raw;
    try {
      if (typeof search === "function") {
        target = search(raw, searchEngine?.value || "https://www.google.com/search?q=%s");
      }
    } catch {
      target = raw;
    }

    if (address) address.value = target;

    if (!frame) {
      frame = scramjet.createFrame();
      frame.frame.id = "sj-game-frame";
      frame.frame.style.width = "100%";
      frame.frame.style.height = "100%";
      frame.frame.style.border = "0";
      frame.frame.setAttribute("allowfullscreen", "true");
      frame.frame.setAttribute(
        "allow",
        "fullscreen *; autoplay *; clipboard-read *; clipboard-write *; gamepad *; microphone *; camera *; geolocation *"
      );

      host.innerHTML = "";
      host.appendChild(frame.frame);
      updateButtons();
    }

    if (loading) loading.style.display = "none";
    frame.go(target);
  }

  async function loadFromQuery() {
    const params = new URLSearchParams(location.search);
    const gameId = params.get("game");
    const appId = params.get("app");
    const directUrl = params.get("url");

    // Decide where the "home/back" button should go
    const kind = appId ? "apps" : "games";
    const backPage = kind === "apps" ? "apps.html" : "g.html";
    if (gamesBtn) gamesBtn.addEventListener("click", () => (location.href = backPage));

    if (directUrl) {
      titleEl.textContent = "Player";
      document.title = "Player — Midnight BR0WSER";
      await go(directUrl);
      return;
    }

    const selectedId = appId || gameId;
    if (!selectedId) {
      titleEl.textContent = "Player";
      document.title = "Player — Midnight BR0WSER";
      showError("Nothing selected. Go back to the Games/Apps page and pick something.", null);
      return;
    }

    const config =
      kind === "apps"
        ? {
            label: "App",
            arrayKey: "apps",
            files: ["apps-list.json", "appsList.json", "apps.json"],
            nameKeys: ["appName", "name", "gameName"],
            urlKeys: ["appURL", "url", "gameURL"],
            iconKeys: ["appIcon", "icon", "gameIcon"],
          }
        : {
            label: "Game",
            arrayKey: "games",
            files: ["gameList.json", "games.json", "gamelist.json"],
            nameKeys: ["gameName", "name", "appName"],
            urlKeys: ["gameURL", "url", "appURL"],
            iconKeys: ["gameIcon", "icon", "appIcon"],
          };

    async function fetchFirstJson(files) {
      let lastErr = null;
      for (const f of files) {
        try {
          const res = await fetch(f, { cache: "no-store" });
          if (!res.ok) throw new Error(`${f}: ${res.status} ${res.statusText}`);
          return await res.json();
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("No list file found.");
    }

    try {
      const data = await fetchFirstJson(config.files);
      const list = Array.isArray(data?.[config.arrayKey]) ? data[config.arrayKey] : [];
      const item = list.find((x) => String(x?.id) === String(selectedId));

      if (!item) {
        showError(`${config.label} not found in ${config.files[0]}: ${selectedId}`, null);
        return;
      }

      const pick = (obj, keys) => {
        for (const k of keys) if (obj && obj[k]) return obj[k];
        return "";
      };

      const name = pick(item, config.nameKeys) || config.label;
      const url = pick(item, config.urlKeys);
      const icon = pick(item, config.iconKeys);

      if (!url) {
        showError(
          `${config.label} is missing a URL field (expected one of: ${config.urlKeys.join(", ")})`,
          null
        );
        return;
      }

      titleEl.textContent = name;
      document.title = `${name} — Midnight BR0WSER`;
      if (iconEl && icon) iconEl.src = icon;

      await go(url);
    } catch (err) {
      showError(`Couldn't load ${kind} list JSON.`, err);
    }
  }

  // Controls
  backBtn?.addEventListener("click", () => void goBack());
  forwardBtn?.addEventListener("click", () => void goForward());
  reloadBtn?.addEventListener("click", () => void reloadActive());
  fullBtn?.addEventListener("click", () => {
    const el = frame?.frame;
    if (!el) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) req.call(el);
  });

  // Address bar navigation
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