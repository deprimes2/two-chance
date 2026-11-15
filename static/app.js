'use strict';

/* TWO CHANCE — MINI APP */

const tg = window.Telegram?.WebApp;

/* ТЁМНАЯ ТЕМА */

function applyTheme() {
  document.documentElement.dataset.theme = 'dark';

  const meta = document.querySelector('meta[name="theme-color"]');

  if (meta) {
    meta.content = '#09080a';
  }

  try {
    tg?.setHeaderColor?.('#09080a');
    tg?.setBackgroundColor?.('#09080a');
  } catch (_) {}
}

applyTheme();

tg?.onEvent?.('themeChanged', applyTheme);
tg?.ready?.();
tg?.expand?.();

/* ВИБРАЦИЯ */

function haptic(type = 'light') {
  try {
    tg?.HapticFeedback?.impactOccurred(type);
  } catch (_) {}
}

document.addEventListener('click', event => {
  if (event.target.closest('button, a.link-button')) {
    haptic();
  }
});

/* НАВИГАЦИЯ */

let currentPage = 'home';

function navigate(name) {
  if (name === currentPage) return;

  const oldPage = document.getElementById(currentPage);
  const nextPage = document.getElementById(name);

  if (!nextPage) return;

  oldPage?.classList.remove('active');

  nextPage.classList.add('active');
  nextPage.classList.remove('enter');

  void nextPage.offsetWidth;

  nextPage.classList.add('enter');

  currentPage = name;

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  if (name === 'reader') {
    loadBook();
  }
}

document.querySelectorAll('[data-go]').forEach(button => {
  button.addEventListener('click', () => {
    navigate(button.dataset.go);
  });
});

/* МОДАЛЬНОЕ ОКНО */

const modal = document.getElementById('modal');
const helpBtn = document.getElementById('helpBtn');
const modalClose = document.getElementById('modalClose');

function closeModal() {
  modal?.classList.add('hidden');
  helpBtn?.focus();
}

helpBtn?.addEventListener('click', () => {
  modal?.classList.remove('hidden');
  modalClose?.focus();
});

modalClose?.addEventListener('click', closeModal);

modal?.addEventListener('click', event => {
  if (event.target === modal) {
    closeModal();
  }
});

document.addEventListener('keydown', event => {
  if (
    event.key === 'Escape' &&
    modal &&
    !modal.classList.contains('hidden')
  ) {
    closeModal();
  }
});

/* УВЕДОМЛЕНИЯ */

const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('visible');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3500);
}

/* ПОКУПКА */

document.getElementById('buyBtn')?.addEventListener('click', () => {
  showToast('Оплата скоро появится. Мы уже работаем над этим!');
});

/* КНИГА */

let bookChecked = false;
let bookLoading = false;

async function loadBook() {
  if (bookChecked || bookLoading) return;

  bookLoading = true;

  const skeleton = document.getElementById('pdfSkeleton');
  const missing = document.getElementById('pdfMissing');
  const container = document.getElementById('pdfContainer');
  const link = document.getElementById('pdfLink');

  skeleton?.classList.remove('hidden');
  missing?.classList.add('hidden');

  try {
    const response = await fetch('/static/book.pdf', {
      method: 'HEAD'
    });

    if (
      !response.ok ||
      !(response.headers.get('content-type') || '').includes('pdf')
    ) {
      throw new Error('PDF unavailable');
    }

    const frame = document.getElementById('pdfFrame');

    if (!frame) {
      throw new Error('PDF frame unavailable');
    }

    frame.addEventListener('load', () => {
      skeleton?.classList.add('hidden');
    }, { once: true });

    frame.src = '/static/book.pdf#toolbar=1';

    container?.classList.remove('hidden');
    link?.classList.remove('hidden');

    bookChecked = true;

    setTimeout(() => {
      skeleton?.classList.add('hidden');
    }, 8000);

  } catch (_) {
    skeleton?.classList.add('hidden');
    missing?.classList.remove('hidden');

  } finally {
    bookLoading = false;
  }
}

/* TELEGRAM AUTH */

if (tg?.initData) {
  fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      init_data: tg.initData
    })
  }).catch(() => {});
}

/* ПЛАВНАЯ ЗАГРУЗКА */

function finishSplash() {
  const splash = document.getElementById('splash');
  const application = document.getElementById('application');

  if (!application) return;

  application.classList.remove('hidden');

  if (!splash) return;

  requestAnimationFrame(() => {
    splash.classList.add('out');
  });

  setTimeout(() => {
    splash.remove();
  }, 950);
}

setTimeout(finishSplash, 2500);
