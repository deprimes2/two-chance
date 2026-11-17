(() => {

'use strict';

const tg = window.Telegram?.WebApp;
const preferenceKey = `two-chance:preferences:${tg?.initDataUnsafe?.user?.id || 'guest'}`;
let preferences = { motion: true, haptic: true };
try {
  const stored = JSON.parse(localStorage.getItem(preferenceKey));
  if (typeof stored?.motion === 'boolean') preferences.motion = stored.motion;
  if (typeof stored?.haptic === 'boolean') preferences.haptic = stored.haptic;
} catch (_) {}
document.documentElement.dataset.motion = preferences.motion ? 'on' : 'off';
const themeQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme() {
  const dark = true;
  document.documentElement.dataset.theme = 'dark';

  document.querySelector('meta[name="theme-color"]').content =
    dark ? '#0a0a0a' : '#0a0a0a';

  try {
    tg?.setHeaderColor?.('#0a0a0a');
    tg?.setBackgroundColor?.('#0a0a0a');
  } catch (_) {}
}

applyTheme();
themeQuery.addEventListener?.('change', applyTheme);
tg?.onEvent?.('themeChanged', applyTheme);
tg?.ready?.();
tg?.expand?.();

function haptic(type = 'light') {
  if (!preferences.haptic) return;
  try {
    tg?.HapticFeedback?.impactOccurred(type);
  } catch (_) {}
}

document.addEventListener('click', e => {
  if (e.target.closest('button, a.link-button')) {
    haptic();
  }
});

/* НАВИГАЦИЯ */

let currentPage = 'home';

function navigate(name) {
  if (name === currentPage || !['home','knowledge','profile'].includes(name)) return;

  const old = document.getElementById(currentPage);
  const next = document.getElementById(name);

  if (!next) return;

  old?.classList.remove('active');
  next.classList.add('active');

  next.classList.remove('enter');
  void next.offsetWidth;
  next.classList.add('enter');

  currentPage = name;
  document.querySelectorAll('.bottom-nav [data-go]').forEach(button => {
    const selected = button.dataset.go === (name === 'profile' ? 'profile' : 'home');
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('.page').forEach(page => { page.inert = page.id !== name; });
  if (tg?.initData) { if (name === 'home') tg.BackButton?.hide(); else tg.BackButton?.show(); }

  window.scrollTo({
    top: 0,
    behavior: !preferences.motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  });

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

let modalOpener;
function openInfo(title, text) {
  modalOpener = document.activeElement;
  document.getElementById('modalTitle').textContent = title;
  modal.querySelector('p').textContent = text;
  modal.classList.remove('hidden');
  document.getElementById('application').inert = true;
  modalClose.focus();
}
function closeModal() {
  modal.classList.add('hidden');
  document.getElementById('application').inert = false;
  modalOpener?.focus();
}
helpBtn.addEventListener('click', () => openInfo('О разделе', 'Здесь будут доступны расширенные материалы для личного развития.'));
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', event => {
  if (modal.classList.contains('hidden')) return;
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Tab') { event.preventDefault(); modalClose.focus(); }
});

/* УВЕДОМЛЕНИЯ */

const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3500);
}

/* ОПЛАТА */

document.getElementById('buyBtn').addEventListener('click', () => {
  showToast(
    'Оплата скоро появится. Мы уже работаем над этим!'
  );
});

/* ПРОФИЛЬ: декоративная карта, без финансовых данных. */
const memberCard = document.getElementById('memberCard');
const cardDialog = document.getElementById('cardDialog');
const cardClose = document.getElementById('cardClose');
const profileUser = tg?.initDataUnsafe?.user;
// initDataUnsafe is used only for presentation, never for payment authorization.
const displayName = [profileUser?.first_name, profileUser?.last_name].filter(Boolean).join(' ') || 'Участник Two Chance';
document.getElementById('profileName').textContent = displayName;
document.getElementById('profileAvatar').textContent = profileUser ? Array.from(displayName).slice(0, 2).join('').toUpperCase() : 'TC';
const focusKey = `two-chance:daily-focus:${profileUser?.id || 'guest'}`;
const dailyFocus = document.getElementById('dailyFocus');
try { dailyFocus.value = localStorage.getItem(focusKey) || ''; } catch (_) {}
dailyFocus.addEventListener('input', () => {
  try {
    localStorage.setItem(focusKey, dailyFocus.value);
    document.getElementById('focusStatus').textContent = 'Сохранено на этом устройстве';
  } catch (_) {
    document.getElementById('focusStatus').textContent = 'Не удалось сохранить заметку на устройстве';
  }
});
for (const [id, key] of [['motionSetting', 'motion'], ['hapticSetting', 'haptic']]) {
  const input = document.getElementById(id);
  input.checked = preferences[key];
  input.addEventListener('change', () => {
    preferences[key] = input.checked;
    document.documentElement.dataset.motion = preferences.motion ? 'on' : 'off';
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); } catch (_) {
      showToast('Настройка действует до закрытия приложения');
    }
  });
}
memberCard.querySelector('.member-card-owner').textContent = displayName;
const cardKey = `two-chance:decorative-card:v1:${profileUser?.id || 'guest'}`;
let cardNumber;
try { cardNumber = localStorage.getItem(cardKey); } catch (_) {}
if (!/^2222(?: \d{4}){3}$/.test(cardNumber || '')) {
  const digits = crypto.getRandomValues(new Uint32Array(3));
  cardNumber = '2222 ' + Array.from(digits, n => String(n % 10000).padStart(4, '0')).join(' ');
  try { localStorage.setItem(cardKey, cardNumber); } catch (_) {}
}
memberCard.querySelector('.member-card-number').textContent = cardNumber;
const expandedCard = memberCard.cloneNode(true);
expandedCard.removeAttribute('id');
['aria-haspopup', 'aria-controls', 'aria-expanded'].forEach(attr => expandedCard.removeAttribute(attr));
expandedCard.setAttribute('aria-label', 'Свернуть карту профиля');
document.getElementById('expandedCardSlot').append(expandedCard);
let cardClosing = false;
let cardMotion;
const reducedMotion = () => !preferences.motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function cardOriginTransform() {
  const origin = memberCard.getBoundingClientRect();
  const target = expandedCard.getBoundingClientRect();
  return `translate(${origin.left - target.left}px, ${origin.top - target.top}px) scale(${origin.width / target.width}, ${origin.height / target.height})`;
}
async function closeCard() {
  if (!cardDialog.open || cardClosing) return;
  cardClosing = true;
  // Reverse from the current frame, even when closing during the reveal.
  const currentTransform = getComputedStyle(expandedCard).transform;
  cardMotion?.cancel();
  cardDialog.classList.add('closing');
  if (!reducedMotion()) {
    cardMotion = expandedCard.animate([
      { transform: currentTransform, borderRadius: '30px' },
      { transform: cardOriginTransform(), borderRadius: '25px' }
    ], { duration: 420, easing: 'cubic-bezier(.32,0,.2,1)', fill: 'forwards' });
    try { await cardMotion.finished; } catch (_) {}
  }
  cardDialog.close();
  cardMotion?.cancel();
  cardDialog.classList.remove('closing');
  cardClosing = false;
}
memberCard.addEventListener('click', () => {
  cardDialog.showModal();
  memberCard.setAttribute('aria-expanded', 'true');
  document.body.classList.add('card-open');
  if (!reducedMotion()) {
    cardMotion = expandedCard.animate([
      { transform: cardOriginTransform(), borderRadius: '25px' },
      { transform: 'translateY(-3px) scale(1.008)', borderRadius: '30px', offset: .78 },
      { transform: 'none', borderRadius: '30px' }
    ], { duration: 680, easing: 'cubic-bezier(.2,.85,.25,1)' });
  }
});
cardDialog.addEventListener('close', () => {
  memberCard.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('card-open');
  memberCard.focus();
});
cardDialog.addEventListener('cancel', event => { event.preventDefault(); closeCard(); });
cardDialog.addEventListener('click', event => {
  if (event.target === cardDialog || event.target.classList.contains('card-dialog-content')) closeCard();
});
cardClose.addEventListener('click', closeCard);
expandedCard.addEventListener('click', closeCard);
for (const card of [memberCard, expandedCard]) {
  card.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reducedMotion()) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--light-x', `${(event.clientX - rect.left) / rect.width * 100}%`);
    card.style.setProperty('--light-y', `${(event.clientY - rect.top) / rect.height * 100}%`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.removeProperty('--light-x');
    card.style.removeProperty('--light-y');
  });
}

function requestTopUp() {
  // Future integration point: call an authenticated server endpoint to create
  // a provider checkout. Credit balance/subscription only from a verified webhook.
  // The decorative card number must never be sent as payment credentials.
  openInfo('Пополнение скоро появится', 'Приём платежей ещё не подключён. Когда он появится, здесь можно будет пополнить баланс и оплатить подписку. Сейчас деньги не списываются.');
}
document.getElementById('topUpBtn').addEventListener('click', requestTopUp);

/* TELEGRAM АВТОРИЗАЦИЯ */

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

/* ОБОЛОЧКА И ЗАСТАВКА */
// Одинаковая рубиновая двойка на главной и на экране загрузки.
const app = document.getElementById('application');
const splash = document.getElementById('splash');
let splashTimer;
let splashRunning = false;
function showSplash() {
  clearTimeout(splashTimer);
  splashRunning = true;
  app.inert = true;
  splash.classList.remove('out');
  splash.removeAttribute('aria-hidden');
  const content = splash.querySelector('.splash-content');
  content.style.animation = 'none'; void content.offsetWidth; content.style.animation = '';
  const loader = splash.querySelector('.loader'); loader.replaceWith(loader.cloneNode(true));
  splashTimer = setTimeout(() => {
    splash.classList.add('out');
    splash.setAttribute('aria-hidden', 'true');
    app.classList.remove('hidden');
    app.inert = false;
    splashRunning = false;
  }, 1800);
}
tg?.BackButton?.onClick(() => { if (splashRunning) return; if (cardDialog.open) closeCard(); else if (!modal.classList.contains('hidden')) closeModal(); else navigate('home'); });
if (tg?.initData) tg.BackButton?.hide();
document.querySelectorAll('.page').forEach(page => { page.inert = !page.classList.contains('active'); });
showSplash();

})();
