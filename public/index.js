"use strict";

/**
 * This file keeps Scramjet’s original logic (register SW, normalize URL via search(),
 * set BareMux transport) BUT mounts the Scramjet frame inside the active tab view.
 *
 * Fixes:
 * - No top-level navigation (UI never disappears)
 * - No variable redeclaration conflicts
 * - No reliance on __scramjet$config
 */

// ===== MODE DETECTION =====
// ===== MODE DETECTION =====
// browser = full browser UI (b.html)
// player  = standalone game player (play.html)
const MODE = document.body?.dataset?.mode || "browser";


/** @type {HTMLFormElement} */
const form = document.getElementById("sj-form");
/** @type {HTMLInputElement} */
const address = document.getElementById("sj-address");
/** @type {HTMLButtonElement|null} */
const navBackBtn = document.getElementById("navBack");
/** @type {HTMLButtonElement|null} */
const navForwardBtn = document.getElementById("navForward");
/** @type {HTMLButtonElement|null} */
const navReloadBtn = document.getElementById("navReload");

/** @type {HTMLInputElement} */
const searchEngine = document.getElementById("sj-search-engine");
/** @type {HTMLParagraphElement} */
const error = document.getElementById("sj-error");
/** @type {HTMLPreElement} */
const errorCode = document.getElementById("sj-error-code");

// --- Scramjet init (same as demo) ---
const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
  files: {
    wasm: "/scram/scramjet.wasm.wasm",
    all: "/scram/scramjet.all.js",
    sync: "/scram/scramjet.sync.js",
  },
});

scramjet.init();

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

// --- Tabs state ---
const tabsEl = MODE === "browser" ? document.getElementById("tabs") : null;
const viewsEl = document.getElementById("views"); // this EXISTS in both
const addTabBtn = MODE === "browser" ? document.getElementById("addTab") : null;

/**
 * Each tab stores its Scramjet frame instance so navigation stays per-tab.
 * @type {Map<number, any>}
 */
const tabFrames = new Map();
// Stores the last known URL for each tab so the address bar can sync on tab changes.
const tabState = new Map();


let nextTabId = 1;

function getActiveTabId() {
  if (MODE !== "browser" || !tabsEl) return 1;
  const t = tabsEl.querySelector('.tab.active[data-id]');
  return t ? Number(t.dataset.id) : 1;
}

function syncAddressForTab(id) {
  const state = tabState.get(id);
  // If we have a known URL for this tab, show it. Otherwise keep it empty for New Tab.
  address.value = state?.url ? String(state.url) : "";
}

function getActiveFrame() {
  const id = getActiveTabId();
  return tabFrames.get(id) || null;
}

function updateNavButtons() {
  const hasFrame = !!getActiveFrame();
  if (navBackBtn) navBackBtn.disabled = !hasFrame;
  if (navForwardBtn) navForwardBtn.disabled = !hasFrame;
  if (navReloadBtn) navReloadBtn.disabled = !hasFrame;
}

async function goBack() {
  const frame = getActiveFrame();
  if (!frame) return;

  // Prefer Scramjet frame helpers if they exist
  if (typeof frame.back === "function") return frame.back();
  const w = frame.frame?.contentWindow;
  if (w?.history?.length) w.history.back();
}

async function goForward() {
  const frame = getActiveFrame();
  if (!frame) return;

  if (typeof frame.forward === "function") return frame.forward();
  const w = frame.frame?.contentWindow;
  if (w?.history?.length) w.history.forward();
}

async function reloadActive() {
  const id = getActiveTabId();
  const frame = getActiveFrame();
  if (!frame) return;

  if (typeof frame.reload === "function") return frame.reload();
  if (typeof frame.refresh === "function") return frame.refresh();

  const w = frame.frame?.contentWindow;
  if (w?.location?.reload) return w.location.reload();

  // last-resort: re-go the last url we know
  const state = tabState.get(id);
  if (state?.url && typeof frame.go === "function") frame.go(state.url);
}


function setActiveTab(id) {
  tabsEl.querySelectorAll('.tab[data-id]').forEach(t => t.classList.remove('active'));
  viewsEl.querySelectorAll('.view[data-id]').forEach(v => v.classList.remove('active'));

  const tab = tabsEl.querySelector(`.tab[data-id="${id}"]`);
  const view = viewsEl.querySelector(`.view[data-id="${id}"]`);
  if (tab) tab.classList.add('active');
  if (view) view.classList.add('active');
  syncAddressForTab(id);
  updateNavButtons();
}

function safeLabelFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "New Tab";
  }
}

function ensureViewHasFrameHost(view) {
  const host = view.querySelector('.frame-host');
  if (!host) {
    const h = document.createElement('div');
    h.className = 'frame-host';
    view.appendChild(h);
    return h;
  }
  return host;
}

function showFrameForTab(id) {
  const view = viewsEl.querySelector(`.view[data-id="${id}"]`);
  if (!view) return;

  const host = ensureViewHasFrameHost(view);
  // If we already created a frame, ensure it’s attached
  const frame = tabFrames.get(id);
  if (frame && frame.frame && !host.contains(frame.frame)) {
    host.innerHTML = "";
    host.appendChild(frame.frame);
  }

  // Toggle landing vs iframe host
  const landing = view.querySelector('.newtab');
  if (landing) landing.style.display = frame ? "none" : "flex";
  host.hidden = !frame;
}

function closeTab(id) {
  // Don’t allow closing the last tab
  const all = [...tabsEl.querySelectorAll('.tab[data-id]')];
  if (all.length <= 1) return;

  const tab = tabsEl.querySelector(`.tab[data-id="${id}"]`);
  const view = viewsEl.querySelector(`.view[data-id="${id}"]`);

  // best-effort cleanup
  const frame = tabFrames.get(id);
  if (frame?.frame?.remove) frame.frame.remove();
  tabFrames.delete(id);
  tabState.delete(id);

  tab?.remove();
  view?.remove();

  // Activate nearest remaining tab
  const remaining = [...tabsEl.querySelectorAll('.tab[data-id]')];
  const fallback = remaining[Math.max(0, remaining.length - 1)];
  if (fallback) {
    setActiveTab(Number(fallback.dataset.id));
    showFrameForTab(Number(fallback.dataset.id));
  }
}

function createTab() {
  nextTabId++;
  const id = nextTabId;

  // tab button
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.dataset.id = String(id);
  tab.innerHTML = `<span class="dot"></span><span class="label">New Tab</span><span class="close" title="Close">✕</span>`;

  // view
  const view = document.createElement('div');
  view.className = 'view';
  view.dataset.id = String(id);
  view.innerHTML = `
    <div class="newtab">
      <div class="card">
        <h1>Scramjet Browser</h1>
        <p>Type a URL above and press Enter. Shortcuts: <b>Ctrl+T</b>, <b>Ctrl+W</b>, <b>Ctrl+Tab</b>, <b>Ctrl+L</b>.</p>
        <div class="chips">
          <a class="chip" href="https://github.com/MercuryWorkshop" target="_blank" rel="noreferrer">Mercury Workshop</a>
          <a class="chip" href="credits.html">Credits</a>
        </div>
      </div>
    </div>
    <div class="frame-host" hidden></div>
  `;

  tabsEl.insertBefore(tab, addTabBtn);
  viewsEl.appendChild(view);

  tab.addEventListener('click', (e) => {
    if (e.target?.classList?.contains('close')) {
      e.stopPropagation();
      closeTab(id);
      return;
    }
    setActiveTab(id);
    showFrameForTab(id);
  });

  setActiveTab(id);
  showFrameForTab(id);
  address.focus();
  address.select();
}

// Wire initial tab close & click
(function initExistingTab(){
  const firstTab = tabsEl.querySelector('.tab[data-id="1"]');
  if (firstTab) {
    firstTab.addEventListener('click', (e) => {
      if (e.target?.classList?.contains('close')) {
        e.stopPropagation();
        closeTab(1);
        return;
      }
      setActiveTab(1);
      showFrameForTab(1);
    });
  }
})();

addTabBtn.addEventListener('click', createTab);

// --- Nav buttons ---
navBackBtn?.addEventListener('click', () => { void goBack(); });
navForwardBtn?.addEventListener('click', () => { void goForward(); });
navReloadBtn?.addEventListener('click', () => { void reloadActive(); });

const homeBtn = document.getElementById("navHome");

if (homeBtn) {
  homeBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}


// --- Navigation (Scramjet demo logic, tab-aware) ---
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const raw = address.value.trim();
  if (!raw) return;

  // Ensure a tab exists
  const tabId = getActiveTabId();
  const tabButton = tabsEl.querySelector(`.tab[data-id="${tabId}"]`);
  const tabLabel = tabButton?.querySelector('.label');

  try {
    await registerSW();
  } catch (err) {
    error.textContent = "Failed to register service worker.";
    errorCode.textContent = String(err);
    error.style.display = "block";
    errorCode.style.display = "block";
    throw err;
  }

  const url = search(raw, searchEngine.value);
  // Remember this tab's URL so switching tabs keeps the address bar in sync.
  tabState.set(tabId, { url });
  address.value = url;

  let wispUrl =
    (location.protocol === "https:" ? "wss" : "ws") +
    "://" +
    location.host +
    "/wisp/";

  if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
    await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
  }

  // Create or reuse this tab's frame
  let frame = tabFrames.get(tabId);
  if (!frame) {
    frame = scramjet.createFrame();
    // Give each frame a unique id for debugging
        frame.frame.id = `sj-frame-${tabId}`;
    frame.frame.style.width = '100%';
    frame.frame.style.height = '100%';
    tabFrames.set(tabId, frame);

    const view = viewsEl.querySelector(`.view[data-id="${tabId}"]`);
    const host = ensureViewHasFrameHost(view);
    host.innerHTML = "";
    host.appendChild(frame.frame);
  }

  // Update label to something readable
  if (tabLabel) tabLabel.textContent = safeLabelFromUrl(url);

  // Show iframe host, hide landing
  showFrameForTab(tabId);

  frame.go(url);
});

// --- Keyboard shortcuts ---
document.addEventListener('keydown', (e) => {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const ctrl = isMac ? e.metaKey : e.ctrlKey;

  // Alt+Left / Alt+Right (common browser back/forward)
  if (e.altKey && !ctrl) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); void goBack(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); void goForward(); return; }
  }

  if (!ctrl) return;

  const key = e.key.toLowerCase();

  // Ctrl/Cmd+R: reload
  if (key === 'r') { e.preventDefault(); void reloadActive(); return; }

  // Alt+Left / Alt+Right (common browser back/forward)
  if (e.altKey && !ctrl) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); void goBack(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); void goForward(); return; }
  }
  // Ctrl/Cmd+T: new tab
  if (key === 't') {
    e.preventDefault();
    createTab();
    return;
  }

  // Ctrl/Cmd+W: close tab
  if (key === 'w') {
    e.preventDefault();
    closeTab(getActiveTabId());
    return;
  }

  // Ctrl/Cmd+Tab: next tab
  if (e.key === 'Tab') {
    e.preventDefault();
    const list = [...tabsEl.querySelectorAll('.tab[data-id]')];
    if (!list.length) return;
    const cur = getActiveTabId();
    const idx = list.findIndex(t => Number(t.dataset.id) === cur);
    const next = list[(idx + 1) % list.length];
    if (next) {
      const id = Number(next.dataset.id);
      setActiveTab(id);
      showFrameForTab(id);
    }
    return;
  }

  // Ctrl/Cmd+L: focus address bar
  if (key === 'l') {
    e.preventDefault();
    address.focus();
    address.select();
  }
});

// Ensure first tab view is correctly shown
showFrameForTab(1);


// Auto-open game when coming from play.html
(async () => {
  const params = new URLSearchParams(location.search);
  const gameId = params.get("game");
  if (!gameId) return;

  const res = await fetch("gameList.json");
  const data = await res.json();
  const game = data.games.find(g => g.id === gameId);
  if (!game) return;

  if (typeof openTab === "function") {
    openTab(game.gameURL);
    history.replaceState({}, "", "b.html");
  }
})();