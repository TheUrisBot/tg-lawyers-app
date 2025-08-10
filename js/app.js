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

applyTheme(Telegram.WebApp?.themeParams || {});
Telegram.WebApp?.onEvent?.("themeChanged", () => {
  applyTheme(Telegram.WebApp.themeParams || {});
});

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
