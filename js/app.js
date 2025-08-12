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
