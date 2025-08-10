// ===== Telegram init + тема =====
function initTelegram() {
  const tg = window.Telegram?.WebApp ?? {
    themeParams: {},
    colorScheme: "dark",
    ready: () => {},
    onEvent: () => {},
  };

  applyTheme(tg.themeParams || {});

  try {
    tg.ready();
    // Подгоняем нативную шапку/фон Telegram под нашу тему (сглаживает «пленку» наверху)
    tg.setHeaderColor('secondary_bg_color');   // можно заменить на 'bg_color', если визуально лучше
    tg.setBackgroundColor('secondary_bg_color');
  } catch (e) {
    // В браузере вне Telegram эти методы недоступны — просто игнорируем.
  }

  tg.onEvent?.('themeChanged', () => {
    applyTheme(window.Telegram.WebApp.themeParams || {});
  });
}

// Выставляем CSS-переменные из themeParams + контраст для контролов
function applyTheme(themeParams = {}) {
  const pick = (k, fb) => (themeParams[k] ? `#${themeParams[k]}` : fb);

  const bg  = pick("bg_color", "#0f1012");
  const fg  = pick("text_color", "#f2f2f2");
  const link= pick("link_color", "#4da3ff");
  const hint= pick("hint_color", "#a8acb3");
  const secondary = themeParams["secondary_bg_color"] ? `#${themeParams["secondary_bg_color"]}` : null;

  // helpers
  const hex = (x) => x.replace("#","").padStart(6,"0");
  const toRGB = (h) => [0,2,4].map(i => parseInt(hex(h).slice(i,i+2),16));
  const clamp = (n) => Math.max(0, Math.min(255, n));
  const shade = (h, p) => { // p: -100..+100
    const [r,g,b] = toRGB(h);
    const k = p/100;
    const t = k > 0 ? 255 : 0;
    const rr = clamp(Math.round((t - r)*Math.abs(k) + r));
    const gg = clamp(Math.round((t - g)*Math.abs(k) + g));
    const bb = clamp(Math.round((t - b)*Math.abs(k) + b));
    return `#${[rr,gg,bb].map(v=>v.toString(16).padStart(2,"0")).join("")}`;
  };
  const isDark = (h) => {
    const [r,g,b] = toRGB(h).map(v=>v/255);
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    return lum < 0.5;
  };

  const surface   = secondary || (isDark(bg) ? shade(bg, +6)  : shade(bg, -6));
  const divider   = isDark(bg) ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const controlBg = secondary || (isDark(bg) ? shade(bg, +10) : shade(bg, -10));

  const root = document.documentElement.style;
  root.setProperty("--bg", bg);
  root.setProperty("--fg", fg);
  root.setProperty("--muted", hint);
  root.setProperty("--accent", link);
  root.setProperty("--surface", surface);
  root.setProperty("--divider", divider);
  root.setProperty("--control-bg", controlBg);
}

// ===== Навигация по вкладкам / загрузка страниц =====
const PAGES = {
  cases: "pages/cases.html",
  hearings: "pages/hearings.html",
  tasks: "pages/tasks.html",
  profile: "pages/profile.html",
};

function setActiveTab(key) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    const isActive = btn.getAttribute("data-page") === key;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
}

async function loadPage(key) {
  const url = PAGES[key] || PAGES.cases;
  const content = document.getElementById("content");
  if (!content) return;

  try {
    content.innerHTML = `<div style="padding:16px; color:var(--muted);">Загрузка…</div>`;
    const res = await fetch(url, { cache: "no-store" });
    const html = await res.text();
    content.innerHTML = html;
    runPageScripts(content);
    setActiveTab(key);
  } catch (e) {
    content.innerHTML = `<div style="padding:16px; color:tomato;">Ошибка загрузки страницы.</div>`;
    console.error(e);
  }
}

function runPageScripts(root) {
  const scripts = Array.from(root.querySelectorAll("script"));
  scripts.forEach(old => {
    const s = document.createElement("script");
    if (old.src) { s.src = old.src; s.async = false; }
    if (old.type) s.type = old.type;
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
}

function currentKeyFromHash() {
  const h = (location.hash || "").replace(/^#/, "");
  return PAGES[h] ? h : "cases";
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-page");
      if (!key) return;
      if (currentKeyFromHash() !== key) {
        location.hash = `#${key}`;
      } else {
        loadPage(key);
      }
    });
  });
  window.addEventListener("hashchange", () => loadPage(currentKeyFromHash()));
}

// ===== Полный запрет зума и выделения (жёстко) =====
function enforceNoZoomNoSelect() {
  let lastTouch = 0;

  // Блок pinch-zoom (iOS WebView)
  ["gesturestart","gesturechange","gestureend"].forEach(type => {
    document.addEventListener(type, (e) => e.preventDefault(), { passive:false });
  });

  // Блок мультитача и pinch через touchmove (Telegram iOS)
  document.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive:false });

  document.addEventListener("touchmove", (e) => {
    if ((e.touches && e.touches.length > 1) || (typeof e.scale === "number" && e.scale !== 1)) {
      e.preventDefault();
    }
  }, { passive:false });

  // Двойной тап и Ctrl+wheel зум (Desktop)
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive:false });
  document.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive:false });

  // Быстрый повторный тап
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouch <= 300) e.preventDefault();
    lastTouch = now;
  }, { passive:false });

  // Запрет выделения и контекстного меню везде
  document.addEventListener("selectstart", (e) => { e.preventDefault(); }, { passive:false });
  document.addEventListener("contextmenu", (e) => { e.preventDefault(); });

  // Если выделение всё же появилось — сразу снимаем
  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection && window.getSelection();
    if (sel && sel.rangeCount) sel.removeAllRanges?.();
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      try { el.selectionStart = el.selectionEnd = (el.value?.length ?? 0); } catch {}
    }
  });

  // Горячие клавиши зума (Desktop)
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "-" || e.key === "=")) {
      e.preventDefault();
    }
  });
}

// ===== Boot =====
(function boot(){
  initTelegram();
  initTabs();
  enforceNoZoomNoSelect();
  loadPage(currentKeyFromHash());
})();
