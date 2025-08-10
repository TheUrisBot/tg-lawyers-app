// --- Безопасная инициализация Telegram WebApp ---
(function initTelegram() {
  if (typeof window.Telegram === "undefined") {
    window.Telegram = {
      WebApp: {
        ready: () => {},
        expand: () => {},
        colorScheme: "dark",
        themeParams: {},
        onEvent: () => {},
        MainButton: { hide: () => {}, show: () => {}, setText: () => {} },
        BackButton: { hide: () => {}, show: () => {}, onClick: () => {} },
      },
    };
    console.log("[dev] Running outside Telegram. Using a minimal mock.");
  }

  try {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand?.();
  } catch (e) {
    console.warn("Telegram WebApp init warning:", e);
  }
})();

// --- ТЕМА TELEGRAM: применяем цвета и слушаем изменения ---
function applyTheme(themeParams = {}) {
  // themeParams.* — шестнадцатеричные цвета без '#', например '1c1c1d'
  const get = (k, fallback) => {
    const v = themeParams[k];
    return v ? `#${v}` : fallback;
  };

  const bg = get("bg_color", "#0f0f0f");
  const text = get("text_color", "#f2f2f2");
  const hint = get("hint_color", "#b5b5b5");
  const link = get("link_color", "#4da3ff");
  const secondaryBg = get("secondary_bg_color", "rgba(255,255,255,0.03)");

  document.documentElement.style.setProperty("--bg", bg);
  document.documentElement.style.setProperty("--fg", text);
  document.documentElement.style.setProperty("--muted", hint);
  document.documentElement.style.setProperty("--accent", link);
  document.documentElement.style.setProperty("--surface", secondaryBg);
  document.documentElement.style.setProperty("--divider", "rgba(255,255,255,0.08)");
}

function applyTheme(themeParams = {}) {
  const get = (k, fallback) => themeParams[k] ? `#${themeParams[k]}` : fallback;

  const bg  = get("bg_color", "#0f0f0f");
  const fg  = get("text_color", "#f2f2f2");
  const link = get("link_color", "#4da3ff");
  const hint = get("hint_color", "#b5b5b5");
  const secondaryBg = themeParams["secondary_bg_color"] ? `#${themeParams["secondary_bg_color"]}` : null;

  // helpers
  const hex = (x) => x.replace("#","").padStart(6,"0");
  const toRGB = (h) => [0,2,4].map(i => parseInt(hex(h).slice(i,i+2),16));
  const clamp = (n) => Math.max(0, Math.min(255, n));
  const shade = (h, p) => { // p в процентах: +8 = светлее, -6 = темнее
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

  // Контрастный фон для инпутов:
  const controlBg = secondaryBg
    ? secondaryBg
    : (isDark(bg) ? shade(bg, +10) : shade(bg, -10));

  document.documentElement.style.setProperty("--bg", bg);
  document.documentElement.style.setProperty("--fg", fg);
  document.documentElement.style.setProperty("--muted", hint);
  document.documentElement.style.setProperty("--accent", link);
  document.documentElement.style.setProperty("--surface", secondaryBg || "rgba(255,255,255,0.04)");
  document.documentElement.style.setProperty("--divider", "rgba(255,255,255,0.08)");
  document.documentElement.style.setProperty("--control-bg", controlBg); // ← ВАЖНО
}


// --- Небольшой роутер для 4 вкладок ---
const content = document.getElementById("content");
const buttons = Array.from(document.querySelectorAll(".tab-btn"));

const routes = {
  cases: "./pages/cases.html",
  hearings: "./pages/hearings.html",
  tasks: "./pages/tasks.html",
  profile: "./pages/profile.html",
};

async function loadPage(pageKey) {
  const url = routes[pageKey];
  if (!url) return;

  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const html = await res.text();
    content.innerHTML = html;
(function runPageScripts(root) {
  const scripts = Array.from(root.querySelectorAll("script"));
  scripts.forEach(old => {
    const s = document.createElement("script");
    if (old.src) { s.src = old.src; s.async = false; }
    if (old.type) s.type = old.type;
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
})(content);


    // активная кнопка
    buttons.forEach((b) => {
      const isActive = b.dataset.page === pageKey;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    // hash в URL (перезагрузка сохраняет вкладку)
    if (location.hash !== `#${pageKey}`) {
      history.replaceState(null, "", `#${pageKey}`);
    }

    // подключаем автосохранение для всех полей с data-store-key
    setupAutoPersist(pageKey);
  } catch (err) {
    content.innerHTML = `
      <div class="page">
        <h1>Ошибка</h1>
        <div class="card">Не удалось загрузить страницу <code>${pageKey}</code>: ${err.message}</div>
      </div>
    `;
  }
}

function handleTabClick(e) {
  const btn = e.currentTarget;
  const pageKey = btn.dataset.page;
  loadPage(pageKey);
}

buttons.forEach((btn) => btn.addEventListener("click", handleTabClick));

// Загрузка страницы по хэшу или дефолтной "cases"
const initial = (location.hash || "#cases").replace("#", "");
loadPage(initial);

// --- Универсальное автосохранение значений полей ---
function setupAutoPersist(pageKey) {
  const fields = content.querySelectorAll("[data-store-key]");
  fields.forEach((el) => {
    const key = `page:${pageKey}:${el.getAttribute("data-store-key")}`;

    // восстановим сохранённое
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.value = saved;
      } else {
        el.textContent = saved;
      }
    }

    // слушатели на изменение
    const save = () => {
      const val = (el.tagName === "INPUT" || el.tagName === "TEXTAREA") ? el.value : el.textContent;
      localStorage.setItem(key, val);
    };

    el.addEventListener("input", save);
    el.addEventListener("change", save);
  });
}
