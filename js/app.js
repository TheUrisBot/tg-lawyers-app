// ===== Инициализация Telegram и темы =====
function initTelegram(){
  const tg = window.Telegram?.WebApp ?? { themeParams:{}, ready:()=>{}, onEvent:()=>{} };
  applyTheme(tg.themeParams || {});
  try { tg.ready(); } catch {}
  tg.onEvent?.('themeChanged', () => {
    applyTheme(window.Telegram.WebApp.themeParams || {});
  });
}

// Переносим цвета темы в CSS-переменные. Всегда оставляем ПЛОТНЫЕ цвета.
function applyTheme(tp = {}){
  const pick = (k, fb) => tp[k] ? `#${tp[k]}` : fb;

  const bg  = pick('bg_color', '#0f1012');
  const fg  = pick('text_color', '#f2f2f2');
  const acc = pick('link_color', '#4da3ff');
  const mut = pick('hint_color', '#a9b0b7');
  const sec = tp['secondary_bg_color'] ? `#${tp['secondary_bg_color']}` : null;

  // простая подсветка/затемнение без альфы
  const toRGB = (h)=>[0,2,4].map(i=>parseInt(h.slice(1).padStart(6,'0').slice(i,i+2),16));
  const clamp = n=>Math.max(0,Math.min(255,n));
  const shade = (hex, p)=>{ // p -100..+100
    const [r,g,b] = toRGB(hex);
    const k = p/100, t = k>0?255:0;
    const rr = clamp(Math.round((t-r)*Math.abs(k)+r));
    const gg = clamp(Math.round((t-g)*Math.abs(k)+g));
    const bb = clamp(Math.round((t-b)*Math.abs(k)+b));
    return `#${[rr,gg,bb].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
  };
  const isDark = (hex)=>{ const [r,g,b]=toRGB(hex).map(v=>v/255); return (0.2126*r+0.7152*g+0.0722*b)<0.5; };

  // НИКОГДА не делаем прозрачностей — только плотные оттенки
  const surface  = sec || (isDark(bg) ? shade(bg, +6)  : shade(bg, -6));
  const control  = sec || (isDark(bg) ? shade(bg, +10) : shade(bg, -10));
  const divider  = isDark(bg) ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  const root = document.documentElement.style;
  root.setProperty('--bg',      bg);
  root.setProperty('--fg',      fg);
  root.setProperty('--muted',   mut);
  root.setProperty('--accent',  acc);
  root.setProperty('--surface', surface);
  root.setProperty('--control', control);
  root.setProperty('--divider', divider);

  // страховка от «чёрного экрана»: фикс-дефолты поверх, если вдруг пришли странные цвета
  if (!/^#([0-9a-f]{6})$/i.test(surface)) root.setProperty('--surface', '#1b1d20');
  if (!/^#([0-9a-f]{6})$/i.test(control)) root.setProperty('--control', '#212428');
}

// ===== Навигация и загрузка страниц =====
const PAGES = {
  cases:    'pages/cases.html',
  hearings: 'pages/hearings.html',
  tasks:    'pages/tasks.html',
  profile:  'pages/profile.html',
};

function setActiveTab(key){
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    const ok = btn.getAttribute('data-page') === key;
    btn.classList.toggle('active', ok);
    btn.setAttribute('aria-selected', String(ok));
  });
}

async function loadPage(key){
  const url = PAGES[key] || PAGES.cases;
  const content = document.getElementById('content');
  if (!content) return;
  try{
    content.innerHTML = '<div style="padding:16px; color:var(--muted);">Загрузка…</div>';
    const res = await fetch(url, { cache: 'no-store' });
    const html = await res.text();
    content.innerHTML = html;
    runPageScripts(content);
    setActiveTab(key);
  }catch(e){
    console.error(e);
    content.innerHTML = '<div style="padding:16px; color:tomato;">Ошибка загрузки страницы.</div>';
  }
}

function runPageScripts(root){
  const scripts = Array.from(root.querySelectorAll('script'));
  scripts.forEach(old=>{
    const s = document.createElement('script');
    if (old.src) { s.src = old.src; s.async = false; }
    if (old.type) s.type = old.type;
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
}

function currentKeyFromHash(){
  const k = (location.hash || '').replace(/^#/,'');
  return PAGES[k] ? k : 'cases';
}

function initTabs(){
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const key = btn.getAttribute('data-page');
      if (!key) return;
      if (currentKeyFromHash() !== key) location.hash = `#${key}`;
      else loadPage(key);
    });
  });
  window.addEventListener('hashchange', ()=>loadPage(currentKeyFromHash()));
}

// ===== Запрет зума, без ломания ввода в полях =====
function enforceNoZoom(){
  let lastTouch = 0;

  ['gesturestart','gesturechange','gestureend'].forEach(type=>{
    document.addEventListener(type, e=>e.preventDefault(), { passive:false });
  });
  document.addEventListener('touchstart', e=>{
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive:false });
  document.addEventListener('touchmove', e=>{
    if ((e.touches && e.touches.length > 1) || (typeof e.scale==='number' && e.scale!==1)) {
      e.preventDefault();
    }
  }, { passive:false });
  document.addEventListener('dblclick', e=>e.preventDefault(), { passive:false });
  document.addEventListener('wheel', e=>{ if (e.ctrlKey) e.preventDefault(); }, { passive:false });
  document.addEventListener('touchend', e=>{
    const now = Date.now();
    if (now - lastTouch <= 300) e.preventDefault();
    lastTouch = now;
  }, { passive:false });
}

// ===== Boot =====
(function boot(){
  initTelegram();
  initTabs();
  enforceNoZoom();
  loadPage(currentKeyFromHash());
})();
