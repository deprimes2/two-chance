
'use strict';

/* =========================================
   TWO CHANCE — TELEGRAM MINI APP
   ========================================= */

const tg = window.Telegram?.WebApp;

const themeQuery = window.matchMedia(
  '(prefers-color-scheme: dark)'
);

/* =========================================
   THEME
   ========================================= */

function applyTheme() {
  // Приложение всегда в тёмной теме
  document.documentElement.dataset.theme = 'dark';

  const meta = document.querySelector(
    'meta[name="theme-color"]'
  );

  if (meta) {
    meta.content = '#080809';
  }

  try {
    tg?.setHeaderColor?.('#080809');
    tg?.setBackgroundColor?.('#080809');
  } catch (_) {
    // Не все версии Telegram поддерживают методы
  }
}

applyTheme();

themeQuery.addEventListener?.('change', applyTheme);

tg?.onEvent?.('themeChanged', applyTheme);
tg?.ready?.();
tg?.expand?.();

/* =========================================
   HAPTIC FEEDBACK
   ========================================= */

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

/* =========================================
   PAGE NAVIGATION
   ========================================= */

const pages = [
  ...document.querySelectorAll('.page')
];

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

/* =========================================
   INFORMATION MODAL
   ========================================= */

const modal = document.getElementById('modal');
const helpBtn = document.getElementById('helpBtn');
const modalClose = document.getElementById('modalClose');

function closeModal() {
  if (!modal) return;

  modal.classList.add('hidden');
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

/* =========================================
   TOAST NOTIFICATIONS
   ========================================= */

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

/* =========================================
   PURCHASE SECTION
   ========================================= */

document.getElementById('buyBtn')?.addEventListener(
  'click',
  () => {
    // Здесь позже будет серверная интеграция оплаты.
    // Успешность платежа должна проверяться сервером.

    showToast(
      'Оплата скоро появится. Мы уже работаем над этим!'
    );
  }
);

/* =========================================
   PDF BOOK READER
   ========================================= */

let bookChecked = false;
let bookLoading = false;

async function loadBook() {
  if (bookChecked || bookLoading) return;

  bookLoading = true;

  const skeleton = document.getElementById(
    'pdfSkeleton'
  );

  const missing = document.getElementById(
    'pdfMissing'
  );

  const container = document.getElementById(
    'pdfContainer'
  );

  const link = document.getElementById(
    'pdfLink'
  );

  skeleton?.classList.remove('hidden');
  missing?.classList.add('hidden');

  try {
    const response = await fetch(
      '/static/book.pdf',
      { method: 'HEAD' }
    );

    if (
      !response.ok ||
      !(response.headers.get('content-type') || '')
        .includes('pdf')
    ) {
      throw new Error('PDF unavailable');
    }

    const frame = document.getElementById(
      'pdfFrame'
    );

    if (!frame) {
      throw new Error('PDF frame unavailable');
    }

    frame.addEventListener(
      'load',
      () => {
        skeleton?.classList.add('hidden');
      },
      { once: true }
    );

    frame.src = '/static/book.pdf#toolbar=1';

    container?.classList.remove('hidden');
    link?.classList.remove('hidden');

    bookChecked = true;

    // Резервный таймер для встроенного браузера
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

/* =========================================
   TELEGRAM AUTHENTICATION
   ========================================= */

// Авторизация только через проверенные сервером
// данные Telegram initData.

if (tg?.initData) {
  fetch('/api/auth', {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json'
    },

    body: JSON.stringify({
      init_data: tg.initData
    })
  }).catch(() => {
    // Ошибка авторизации не блокирует интерфейс
  });
}

/* =========================================
   CINEMATIC SPLASH SCREEN
   ========================================= */

// Логотип плавно появляется из темноты.
// Через 2.5 секунды начинается переход в меню.
// Экран загрузки исчезает за 0.9 секунды.

function finishSplash() {
  const splash = document.getElementById('splash');
  const application = document.getElementById(
    'application'
  );

  if (!application) return;

  if (!splash) {
    application.classList.remove('hidden');
    return;
  }

  // Показываем меню под экраном загрузки
  application.classList.remove('hidden');

  // Запускаем плавное исчезновение
  requestAnimationFrame(() => {
    splash.classList.add('out');
  });

  // Удаляем экран после анимации
  setTimeout(() => {
    splash.remove();
  }, 950);
}

// Запуск перехода
setTimeout(finishSplash, 2500);
