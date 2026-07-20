const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
const searchInput = document.getElementById('searchInput');
const cityFilter = document.getElementById('cityFilter');
const typeFilter = document.getElementById('typeFilter');
const emptyState = document.getElementById('emptyState');

menuToggle?.addEventListener('click', () => {
  if (!mainNav) return;

  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('menu-open', isOpen);
});

mainNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  });
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 760 && mainNav) {
    mainNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !mainNav) return;

  mainNav.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
});

const normalizeText = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

function filterEvents() {
  if (!searchInput || !cityFilter || !typeFilter) return;

  const term = normalizeText(searchInput.value);
  const city = normalizeText(cityFilter.value);
  const type = normalizeText(typeFilter.value);
  const cards = document.querySelectorAll('.event-card');
  let visibleCount = 0;

  cards.forEach((card) => {
    const cardCity = normalizeText(card.dataset.city);
    const cardType = normalizeText(card.dataset.type);
    const searchableText = normalizeText(
      `${card.dataset.name ?? ''} ${card.dataset.city ?? ''} ${card.dataset.type ?? ''}`,
    );

    const matches = (!term || searchableText.includes(term))
      && (!city || cardCity === city)
      && (!type || cardType === type);

    card.classList.toggle('hidden', !matches);
    if (matches) visibleCount += 1;
  });

  const filtersActive = Boolean(term || city || type);
  emptyState?.classList.toggle('hidden', !filtersActive || visibleCount > 0);
}

document.getElementById('searchButton')?.addEventListener('click', filterEvents);
searchInput?.addEventListener('input', filterEvents);
cityFilter?.addEventListener('change', filterEvents);
typeFilter?.addEventListener('change', filterEvents);

document.getElementById('showAllButton')?.addEventListener('click', () => {
  if (searchInput) searchInput.value = '';
  if (cityFilter) cityFilter.value = '';
  if (typeFilter) typeFilter.value = '';
  filterEvents();
});

document.querySelectorAll('.soon').forEach((button) => {
  button.addEventListener('click', () => {
    const originalText = button.textContent;
    button.textContent = 'Evento em preparação';
    window.setTimeout(() => {
      button.textContent = originalText;
    }, 1600);
  });
});

document.getElementById('loginButton')?.addEventListener('click', async (event) => {
  event.preventDefault();

  try {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) {
      window.location.href = 'login.html';
      return;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    window.location.href = data.session
      ? 'organizador/index.html'
      : 'login.html';
  } catch (error) {
    console.error('Não foi possível verificar a sessão:', error);
    window.location.href = 'login.html';
  }
});

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
