'use strict';
const tg = window.Telegram?.WebApp;
const themeQuery = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const dark = tg?.colorScheme ? tg.colorScheme === 'dark' : themeQuery.matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0b1526' : '#f5f5f7';
  try {
    tg?.setHeaderColor?.(dark ? '#0b1526' : '#f5f5f7');
    tg?.setBackgroundColor?.(dark ? '#0b1526' : '#f5f5f7');
  } catch (_) { /* Telegram versions may not support these methods. */ }
}
applyTheme();
themeQuery.addEventListener?.('change', applyTheme);
tg?.onEvent?.('themeChanged', applyTheme);
tg?.ready?.();
tg?.expand?.();
function haptic(type = 'light') { try { tg?.HapticFeedback?.impactOccurred(type); } catch (_) {} }
document.addEventListener('click', e => { if (e.target.closest('button, a.link-button')) haptic(); });
const pages = [...document.querySelectorAll('.page')];
let currentPage = 'home';
function navigate(name) {
  if (name === currentPage) return;
  const old = document.getElementById(currentPage);
  const next = document.getElementById(name);
  if (!next) return;
  old?.classList.remove('active');
  next.classList.add('active');
  next.classList.remove('enter');
  void next.offsetWidth;
  next.classList.add('enter');
  currentPage = name;
  window.scrollTo({top: 0, behavior: 'smooth'});
  if (name === 'reader') loadBook();
}
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.go)));
const modal = document.getElementById('modal');
const helpBtn = document.getElementById('helpBtn');
const modalClose = document.getElementById('modalClose');
function closeModal() { modal.classList.add('hidden'); helpBtn.focus(); }
helpBtn.addEventListener('click', () => { modal.classList.remove('hidden'); modalClose.focus(); });
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });
const toast = document.getElementById('toast');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}
document.getElementById('buyBtn').addEventListener('click', () => {
  // PAYMENT INTEGRATION POINT: replace this placeholder with a server-side
  // checkout session (e.g., Telegram Stars invoice) after verifying initData.
  // Never trust client-side payment success; verify provider callbacks server-side.
  showToast('Оплата скоро появится. Мы уже работаем над этим!');
});
let bookChecked = false;
let bookLoading = false;
async function loadBook() {
  if (bookChecked || bookLoading) return;
  bookLoading = true;
  const skeleton = document.getElementById('pdfSkeleton');
  const missing = document.getElementById('pdfMissing');
  const container = document.getElementById('pdfContainer');
  const link = document.getElementById('pdfLink');
  skeleton.classList.remove('hidden');
  missing.classList.add('hidden');
  try {
    const response = await fetch('/static/book.pdf', {method: 'HEAD'});
    if (!response.ok || !(response.headers.get('content-type') || '').includes('pdf')) throw Error('PDF unavailable');
    const frame = document.getElementById('pdfFrame');
    frame.addEventListener('load', () => skeleton.classList.add('hidden'), {once:true});
    frame.src = '/static/book.pdf#toolbar=1';
    container.classList.remove('hidden');
    link.classList.remove('hidden');
    bookChecked = true;
    // Some in-app browsers never fire iframe load; keep the fallback link visible.
    setTimeout(() => skeleton.classList.add('hidden'), 8000);
  } catch (_) {
    skeleton.classList.add('hidden');
    missing.classList.remove('hidden');
  } finally { bookLoading = false; }
}
// Server-verified identity only; initDataUnsafe must never authorize purchases.
if (tg?.initData) {
  fetch('/api/auth', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({init_data: tg.initData})
  }).catch(() => {});
}
setTimeout(() => {
  const splash = document.getElementById('splash');
  document.getElementById('application').classList.remove('hidden');
  splash.classList.add('out');
  setTimeout(() => splash.remove(), 500);
}, 1800);
