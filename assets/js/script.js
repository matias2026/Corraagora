const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

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

document.querySelectorAll('.soon').forEach((button) => {
  button.addEventListener('click', () => {
    const originalText = button.textContent;
    button.textContent = 'Evento em preparação';
    window.setTimeout(() => {
      button.textContent = originalText;
    }, 1600);
  });
});

async function irParaAreaDoOrganizador(event) {
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
}

document.getElementById('loginButton')?.addEventListener('click', irParaAreaDoOrganizador);
document.getElementById('loginButtonMobile')?.addEventListener('click', irParaAreaDoOrganizador);
document.getElementById('organizadoresLink')?.addEventListener('click', irParaAreaDoOrganizador);

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
