(function () {
  const tg = window.Telegram ? window.Telegram.WebApp : null;

  // Инициализация Telegram WebApp
  function initTelegram() {
    if (!tg) return;
    try {
      tg.ready();       // важно для корректной работы в Telegram
      tg.expand();      // растянуть по высоте
      applyTheme(tg.themeParams);
      tg.onEvent('themeChanged', () => applyTheme(tg.themeParams));
    } catch (e) {
      console.warn('Telegram WebApp init warning:', e);
    }
  }

  // Подхватываем цвета из Telegram темы
  function applyTheme(tp = {}) {
    const root = document.documentElement;
    const set = (name, val) => {
      if (!val) return;
      // Телеграм присылает цвета в формате "#RRGGBB"
      root.style.setProperty(name, String(val));
    };

    set('--tg-theme-bg-color', tp.bg_color);
    set('--tg-theme-text-color', tp.text_color);
    set('--tg-theme-hint-color', tp.hint_color);
    set('--tg-theme-link-color', tp.link_color);
    set('--tg-theme-button-color', tp.button_color);
    set('--tg-theme-button-text-color', tp.button_text_color);
    set('--tg-theme-secondary-bg-color', tp.secondary_bg_color);
  }

  // Роутинг вкладок (через хэш и загрузку partials)
  const content = document.getElementById('content');
  const tabbar = document.querySelector('.tabbar');

  async function loadPage(page) {
    const url = `pages/${page}.html`;

    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Не удалось загрузить ${url}: ${res.status}`);
      const html = await res.text();
      content.innerHTML = html;
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) {
      console.error(err);
      content.innerHTML = `
        <section class="page">
          <h1>Ошибка загрузки</h1>
          <p>Страница <code>${page}</code> недоступна. Проверь файл <code>${url}</code>.</p>
        </section>
      `;
    }
  }

  function setActiveTab(page) {
    document.querySelectorAll('.tabbar .tab').forEach(btn => {
      const isActive = btn.dataset.page === page;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
  }

  function go(page, pushHash = true) {
    setActiveTab(page);
    if (pushHash) location.hash = page;
    loadPage(page);
  }

  // Клики по нижним кнопкам
  tabbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    const page = btn.dataset.page;
    if (!page) return;
    go(page);
  });

  // Поддержка навигации по истории браузера
  window.addEventListener('hashchange', () => {
    const page = (location.hash || '#cases').replace('#', '');
    go(page, false);
  });

  // Старт
  window.addEventListener('DOMContentLoaded', () => {
    initTelegram();
    const startPage = (location.hash || '#cases').replace('#', '');
    setActiveTab(startPage);
    loadPage(startPage);
  });
})();
function disableZoom() {
  // 1) iOS Safari/Telegram WebView: жесты масштабирования
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(evt => {
    document.addEventListener(evt, e => e.preventDefault(), { passive: false });
  });

  // 2) Мультитач (pinch) — на всякий случай
  document.addEventListener('touchstart', e => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  // 3) Дабл-тап зум
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // 4) Двойной клик мышью (десктоп)
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });

  // 5) Ctrl/Cmd + колесо мыши
  document.addEventListener('wheel', e => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  // 6) Горячие клавиши масштабирования (Ctrl/Cmd +/-/0)
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
      e.preventDefault();
    }
  });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  disableZoom();
  // ... твой текущий код инициализации
});
// === Отступ внизу размером "одной плитки" ===
window.adjustBottomSpacer = function adjustBottomSpacer() {
  const lists = ['#cases-list', '#hearings-list', '#tasks-list'];

  lists.forEach(sel => {
    const list = document.querySelector(sel);
    if (!list) return;

    // найдём/создадим спейсер сразу после списка
    let spacer = list.nextElementSibling;
    if (!spacer || !spacer.classList || !spacer.classList.contains('list-spacer')) {
      spacer = document.createElement('div');
      spacer.className = 'list-spacer';
      list.insertAdjacentElement('afterend', spacer);
    }

    // высота одной карточки + небольшой зазор
    const card = list.querySelector('.case-card');
    const tileH = card ? card.offsetHeight : 160; // дефолт, если карточек нет
    spacer.style.height = (tileH + 16) + 'px';
  });
};

// пересчитываем на старте и при изменениях размеров/ориентации
window.addEventListener('resize', () => window.adjustBottomSpacer && window.adjustBottomSpacer());
document.addEventListener('DOMContentLoaded', () => window.adjustBottomSpacer && window.adjustBottomSpacer());
