document.addEventListener("DOMContentLoaded", () => {
    const botao = document.querySelector(".sidebar-toggle");
    const nav = document.querySelector(".sidebar-nav");

    if (!botao || !nav) return;

    botao.addEventListener("click", () => {
        nav.classList.toggle("aberto");
    });
});
