(() => {
  "use strict";

  const carousel = document.getElementById("heroCarousel");
  const fallback = document.getElementById("heroTicketFallback");

  if (!carousel || !fallback) return;

  const track = carousel.querySelector(".hero-carousel-track");
  const dotsContainer = carousel.querySelector(".hero-carousel-dots");

  const INTERVALO_MS = 4500;

  let indiceAtual = 0;
  let temporizador = null;

  async function iniciar() {
    if (typeof supabaseClient === "undefined" || !supabaseClient?.from) {
      return;
    }

    const { data, error } = await supabaseClient
      .from("eventos")
      .select("nome, slug, banner_url")
      .eq("status", "aprovado")
      .not("banner_url", "is", null)
      .order("data_evento", { ascending: true })
      .limit(8);

    if (error || !Array.isArray(data) || data.length === 0) return;

    montarSlides(data);

    fallback.classList.add("hidden");
    carousel.classList.remove("hidden");

    if (data.length > 1) {
      iniciarAutoplay(data.length);
    }
  }

  function montarSlides(eventos) {
    track.innerHTML = eventos
      .map(
        (evento, index) => `
          <div class="hero-carousel-slide${index === 0 ? " active" : ""}">
            <a href="evento.html?slug=${encodeURIComponent(evento.slug || "")}">
              <img
                src="${escaparAtributo(evento.banner_url)}"
                alt="Banner do evento ${escaparHTML(evento.nome || "Evento esportivo")}"
                loading="lazy"
              >
            </a>
          </div>
        `
      )
      .join("");

    dotsContainer.innerHTML =
      eventos.length > 1
        ? eventos
            .map(
              (_, index) => `
                <button
                  type="button"
                  class="hero-carousel-dot${index === 0 ? " active" : ""}"
                  data-index="${index}"
                  aria-label="Ver evento ${index + 1} de ${eventos.length}"
                ></button>
              `
            )
            .join("")
        : "";

    dotsContainer.querySelectorAll(".hero-carousel-dot").forEach((botao) => {
      botao.addEventListener("click", () => {
        pararAutoplay();
        irPara(Number(botao.dataset.index));
        iniciarAutoplay(eventos.length);
      });
    });
  }

  function irPara(indice) {
    const slides = track.querySelectorAll(".hero-carousel-slide");
    const dots = dotsContainer.querySelectorAll(".hero-carousel-dot");

    slides[indiceAtual]?.classList.remove("active");
    dots[indiceAtual]?.classList.remove("active");

    indiceAtual = indice;

    slides[indiceAtual]?.classList.add("active");
    dots[indiceAtual]?.classList.add("active");
  }

  function iniciarAutoplay(totalSlides) {
    pararAutoplay();

    temporizador = setInterval(() => {
      irPara((indiceAtual + 1) % totalSlides);
    }, INTERVALO_MS);
  }

  function pararAutoplay() {
    if (temporizador) {
      clearInterval(temporizador);
      temporizador = null;
    }
  }

  function escaparHTML(valor) {
    return String(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escaparAtributo(valor) {
    return escaparHTML(valor);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
