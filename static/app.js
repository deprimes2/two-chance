(() => {

'use strict';

const tg = window.Telegram?.WebApp;
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
  if (name === currentPage || !['home','knowledge','reader','profile'].includes(name)) return;

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
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  });

  if (name === 'reader') {
    renderChapter();
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
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function cardOriginTransform() {
  const origin = memberCard.getBoundingClientRect();
  const target = expandedCard.getBoundingClientRect();
  return `translate(${origin.left - target.left}px, ${origin.top - target.top}px) scale(${origin.width / target.width}, ${origin.height / target.height})`;
}
async function closeCard() {
  if (!cardDialog.open || cardClosing) return;
  cardClosing = true;
  cardMotion?.cancel();
  cardDialog.classList.add('closing');
  if (!reducedMotion()) {
    cardMotion = expandedCard.animate([
      { transform: 'none', borderRadius: '30px' },
      { transform: cardOriginTransform(), borderRadius: '25px' }
    ], { duration: 340, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
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
      { transform: 'none', borderRadius: '30px' }
    ], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
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

function requestTopUp() {
  // Future integration point: call an authenticated server endpoint to create
  // a provider checkout. Credit balance/subscription only from a verified webhook.
  // The decorative card number must never be sent as payment credentials.
  openInfo('Пополнение скоро появится', 'Приём платежей ещё не подключён. Когда он появится, здесь можно будет пополнить баланс и оплатить подписку. Сейчас деньги не списываются.');
}
document.getElementById('topUpBtn').addEventListener('click', requestTopUp);

/* КНИГА TWO CHANCE */

const bookChapters = [
  {
    title: 'От Two Chance',
    paragraphs: [
      'Эта книга — оригинальный вводный материал Two Chance. Здесь нет волшебных рецептов и обещаний мгновенного успеха. Есть идеи и упражнения, которые помогут выстроить собственный путь.',
      'Читай по одной главе и пробуй задания. Не нужно выполнять всё сразу.'
    ]
  },

  {
    title: '01 / Начни с честной точки отсчёта',
    paragraphs: [
      'Стать лучше — не значит превратиться в другого человека за неделю. Это значит научиться замечать свои решения и постепенно выбирать те, которые приближают к важному. Начинать полезнее не с обещания «с понедельника всё изменю», а с наблюдения за сегодняшним днём.',

      'Возьми лист бумаги и раздели его на три части: «Что у меня получается», «Что мешает» и «Что хочу изменить». В первой колонке отметь даже небольшие достижения. Во второй записывай конкретные действия, а не ярлыки вроде «я ленивый». В третьей выбери одно изменение, которое действительно зависит от тебя.',

      'Пример: вместо «хочу быть дисциплинированным» запиши «после завтрака 15 минут читаю или учусь». Чем точнее действие, тем проще понять, сделал ли ты его.',

      'Практика: выпиши три сильные стороны, две привычки, которые отнимают время, и одно действие на завтра. Не оценивай себя — собирай информацию, которая поможет тебе двигаться дальше.'
    ]
  },

  {
    title: '02 / Маленькие привычки сильнее порывов',
    paragraphs: [
      'Мотивация меняется от дня к дню. Поэтому полезная привычка должна быть настолько простой, чтобы выполнить её даже без особого настроения. Пять минут чтения каждый день часто устойчивее, чем редкий многочасовой рывок.',

      'Привяжи новое действие к тому, что уже делаешь. После чистки зубов — стакан воды. После ужина — десять минут прогулки. После включения ноутбука — сначала одна важная задача, потом сообщения.',

      'Не требуй идеальной серии. Пропуск одного дня — событие, а не приговор. Вернись к привычке при первой возможности и, если нужно, уменьши объём.',

      'Практика: выбери одну привычку на семь дней. Запиши формулу: «После [существующее действие] я делаю [новое действие] в течение [небольшое время]».'
    ]
  },

  {
    title: '03 / Управляй вниманием, а не каждой минутой',
    paragraphs: [
      'Часто день заканчивается ощущением занятости, хотя важное так и не сделано. Причина может быть не в недостатке времени, а в постоянных переключениях. Уведомления, короткие видео и бесконечные вкладки дробят внимание.',

      'Попробуй работать короткими отрезками: 25 минут на одно дело и 5 минут отдыха. Перед началом запиши конкретный результат, например «прочитать пять страниц и выписать три мысли». Телефон убери из поля зрения.',

      'Не обязательно заполнять продуктивностью каждую минуту. Отдых — часть устойчивого ритма. Важно различать восстановление и привычное избегание задачи.',

      'Практика: завтра проведи два отрезка по 25 минут без уведомлений. После каждого отметь, что реально удалось закончить.'
    ]
  },

  {
    title: '04 / Учись думать яснее',
    paragraphs: [
      'Мы не всегда можем выбирать обстоятельства, но можем проверять свои выводы о них. Мысль «у меня ничего не получится» звучит как факт, хотя чаще это предположение. Полезно спросить себя: какие есть доказательства и какие другие объяснения возможны?',

      'Когда возникает трудная ситуация, раздели её на три строки: «Что произошло», «Что я об этом подумал» и «Что могу сделать». Такой приём помогает отделить событие от интерпретации.',

      'Ошибки не делают человека бесполезным. Они показывают, что текущий способ не сработал. Это повод изменить стратегию, попросить обратную связь или потренировать навык.',

      'Практика: вспомни одну неприятную ситуацию и запиши два альтернативных объяснения, не обвиняя себя и других.'
    ]
  },

  {
    title: '05 / Заботься об энергии',
    paragraphs: [
      'Планы становятся труднее, когда не хватает сна, движения и пауз. Поэтому саморазвитие — не только книги и цели, но и базовая забота о себе. Регулярный сон, посильная активность и питание помогают поддерживать внимание и настроение.',

      'Не нужно начинать с жёсткого режима. Лучше выбрать выполнимый шаг: ложиться примерно в одно время, выходить на короткую прогулку или делать перерыв после длительной работы.',

      'Сравнивай себя не с чужими идеальными фотографиями, а со своими реальными возможностями. Если постоянно чувствуешь истощение, разумно обратиться за профессиональной помощью, а не пытаться «перетерпеть» всё дисциплиной.',

      'Практика: выбери один способ поддержать энергию на этой неделе и запланируй его в календаре.'
    ]
  },

  {
    title: '06 / Отношения и личные границы',
    paragraphs: [
      'Развитие заметно и в том, как мы общаемся. Слушать без перебивания, признавать ошибку и говорить о своих потребностях спокойно — навыки, которые улучшаются с практикой.',

      'Граница — это не попытка управлять другим человеком, а ясное сообщение о том, что ты готов делать. Например: «Я могу обсудить это вечером, сейчас занят». Необязательно оправдываться за каждое решение.',

      'Когда возникает спор, попробуй сначала пересказать позицию собеседника своими словами. Это не означает согласия, но снижает риск разговаривать о разных вещах.',

      'Практика: в одном разговоре задай уточняющий вопрос прежде, чем давать совет. Отметь, что изменилось.'
    ]
  },

  {
    title: '07 / Твой план на следующие 14 дней',
    paragraphs: [
      'Большие цели становятся реальнее, когда у них есть ближайший шаг. Выбери одну область: знания, здоровье, работа, отношения или организация времени. Сформулируй результат так, чтобы его можно было проверить.',

      'Дни 1–3: наблюдай за привычками и подготовь среду. Дни 4–7: выполняй одно маленькое действие ежедневно. День 8: проверь, что мешало, и упрости план. Дни 9–13: продолжай без гонки за идеальностью. День 14: подведи итог и выбери следующий шаг.',

      'В конце спроси себя: что получилось, что оказалось сложнее ожидаемого, что я узнал о себе и что стоит продолжить? Необязательно меняться быстро. Важно оставаться в движении.',

      'Практика: запиши одну цель, ежедневное действие длительностью 5–20 минут и дату, когда проверишь результат.'
    ]
  },

  {
    title: 'Твой второй шанс начинается здесь.',
    paragraphs: [
      'Одна маленькая перемена сегодня важнее идеального плана, который так и не начался.',

      '© Two Chance · Оригинальный образовательный материал. Не является медицинской или психологической консультацией.'
    ]
  }
];

/* СОХРАНЕНИЕ ПРОГРЕССА */

const READER_KEY = 'two_chance_reader_chapter_v1';

let readerIndex = 0;

try {
  const saved = Number(localStorage.getItem(READER_KEY));
  if (Number.isFinite(saved)) readerIndex = Math.max(0, Math.min(bookChapters.length - 1, Math.trunc(saved)));
} catch (_) {}

/* ОТОБРАЖЕНИЕ ГЛАВ */

const readerContent = document.getElementById('readerContent');
const readerSheet = document.getElementById('readerSheet');

function renderChapter() {
  const chapter = bookChapters[readerIndex];

  readerContent.replaceChildren();

  const heading = document.createElement('h2');
  heading.textContent = chapter.title;
  readerContent.append(heading);

  for (const paragraph of chapter.paragraphs) {
    const p = document.createElement('p');

    p.textContent = paragraph;

    if (paragraph.startsWith('Практика:')) {
      p.className = 'practice';
    }

    readerContent.append(p);
  }

  readerSheet.scrollTop = 0;
  document.querySelector('.reader-progress').setAttribute('aria-valuenow', String(readerIndex + 1));

  document.getElementById('readerCount').textContent =
    `${readerIndex + 1} / ${bookChapters.length}`;

  document.getElementById('readerPosition').textContent =
    `Глава ${readerIndex + 1} из ${bookChapters.length}`;

  document.getElementById('readerProgressBar').style.width =
    `${(readerIndex + 1) / bookChapters.length * 100}%`;

  document.getElementById('readerPrev').disabled =
    readerIndex === 0;

  document.getElementById('readerNext').disabled =
    readerIndex === bookChapters.length - 1;

  try {
    localStorage.setItem(READER_KEY, String(readerIndex));
  } catch (_) {}
}

/* ПЕРЕКЛЮЧЕНИЕ ГЛАВ */

function changeChapter(delta) {
  const target = readerIndex + delta;

  if (target < 0 || target >= bookChapters.length) {
    return;
  }

  readerIndex = target;
  renderChapter();
}


document.getElementById('readerPrev').addEventListener(
  'click',
  () => changeChapter(-1)
);

document.getElementById('readerNext').addEventListener(
  'click',
  () => changeChapter(1)
);

/* СВАЙПЫ */

let touchStartX = null;
let touchStartY = null;

readerSheet.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) { touchStartX = touchStartY = null; return; }

  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

readerSheet.addEventListener('touchcancel', () => { touchStartX = touchStartY = null; }, { passive: true });

readerSheet.addEventListener('touchend', e => {
  if (e.changedTouches.length !== 1 || touchStartX === null || e.touches.length) { touchStartX = touchStartY = null; return; }

  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  touchStartX = touchStartY = null;

  if (
    Math.abs(dx) > 55 &&
    Math.abs(dx) > Math.abs(dy) * 1.4
  ) {
    changeChapter(dx < 0 ? 1 : -1);
    haptic();
  }
}, { passive: true });

/* УПРАВЛЕНИЕ КЛАВИАТУРОЙ */

readerSheet.addEventListener('keydown', e => {
  if (
    e.key === 'ArrowRight' ||
    e.key === 'ArrowLeft'
  ) {
    e.preventDefault();

    changeChapter(
      e.key === 'ArrowRight' ? 1 : -1
    );
    haptic();
  }
});

renderChapter();

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
