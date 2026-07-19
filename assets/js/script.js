const menuToggle=document.querySelector('.menu-toggle');
const mainNav=document.querySelector('.main-nav');
const searchInput=document.getElementById('searchInput');
const cityFilter=document.getElementById('cityFilter');
const typeFilter=document.getElementById('typeFilter');
const cards=[...document.querySelectorAll('.event-card')];
const emptyState=document.getElementById('emptyState');
menuToggle?.addEventListener('click',()=>{const open=mainNav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));document.body.classList.toggle('menu-open',open)});
mainNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mainNav.classList.remove('open');document.body.classList.remove('menu-open')}));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function filterEvents(){const term=norm(searchInput.value),city=norm(cityFilter.value),type=norm(typeFilter.value);let visible=0;cards.forEach(card=>{const text=norm(`${card.dataset.name} ${card.dataset.city} ${card.dataset.type}`);const show=(!term||text.includes(term))&&(!city||norm(card.dataset.city)===city)&&(!type||norm(card.dataset.type)===type);card.classList.toggle('hidden',!show);if(show)visible++});emptyState.classList.toggle('hidden',visible>0)}
document.getElementById('searchButton')?.addEventListener('click',filterEvents);searchInput?.addEventListener('input',filterEvents);cityFilter?.addEventListener('change',filterEvents);typeFilter?.addEventListener('change',filterEvents);
document.getElementById('showAllButton')?.addEventListener('click',()=>{searchInput.value='';cityFilter.value='';typeFilter.value='';filterEvents()});
document.querySelectorAll('.soon').forEach(b=>b.addEventListener('click',()=>{b.textContent='Evento em preparação';setTimeout(()=>b.textContent='Em breve',1600)}));
document.getElementById("loginButton")?.addEventListener("click", async () => {

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session) {
        window.location.href = "organizador/index.html";
    } else {
        window.location.href = "login.html";
    }

});
document.getElementById('year').textContent=new Date().getFullYear();
