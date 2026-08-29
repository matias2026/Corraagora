document.addEventListener("DOMContentLoaded", () => {
    const botao = document.querySelector(".sidebar-toggle");
    const nav = document.querySelector(".sidebar-nav");

    if (!botao || !nav) return;

    const ICONE_ABRIR =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';

    const ICONE_FECHAR =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    botao.innerHTML = ICONE_ABRIR;
    botao.setAttribute("aria-expanded", "false");
    botao.setAttribute("aria-label", "Abrir menu");

    let backdrop = document.querySelector(".sidebar-backdrop");
    if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "sidebar-backdrop";
        document.body.appendChild(backdrop);
    }

    function abrirMenu() {
        nav.classList.add("aberto");
        backdrop.classList.add("aberto");
        botao.innerHTML = ICONE_FECHAR;
        botao.setAttribute("aria-expanded", "true");
        botao.setAttribute("aria-label", "Fechar menu");
        document.body.style.overflow = "hidden";
    }

    function fecharMenu() {
        nav.classList.remove("aberto");
        backdrop.classList.remove("aberto");
        botao.innerHTML = ICONE_ABRIR;
        botao.setAttribute("aria-expanded", "false");
        botao.setAttribute("aria-label", "Abrir menu");
        document.body.style.overflow = "";
    }

    botao.addEventListener("click", () => {
        if (nav.classList.contains("aberto")) {
            fecharMenu();
        } else {
            abrirMenu();
        }
    });

    backdrop.addEventListener("click", fecharMenu);

    nav.querySelectorAll("a, button").forEach((item) => {
        item.addEventListener("click", fecharMenu);
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape") fecharMenu();
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) fecharMenu();
    });
});
