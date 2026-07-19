(() => {
  "use strict";

  const SUPABASE_URL = "https://ymaybqujglfajllruqub.supabase.co";

  const SUPABASE_PUBLIC_KEY =
    "sb_publishable_l3qNE9dzBeefjdKpRyzVOg_bkm51ZI4";

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLIC_KEY
  );

  const eventLoading = document.getElementById("eventLoading");
  const eventContent = document.getElementById("eventContent");
  const eventError = document.getElementById("eventError");

  const eventBanner = document.getElementById("eventBanner");
  const eventSymbol = document.getElementById("eventSymbol");
  const eventType = document.getElementById("eventType");
  const eventDate = document.getElementById("eventDate");
  const eventName = document.getElementById("eventName");
  const eventLocation = document.getElementById("eventLocation");
  const eventDescription =
    document.getElementById("eventDescription");
  const eventPrice = document.getElementById("eventPrice");
  const registrationButton =
    document.getElementById("registrationButton");
  const year = document.getElementById("year");

  async function carregarEvento() {
    atualizarAno();

    const slug = obterSlugDaURL();

    if (!slug) {
      mostrarErro();
      return;
    }

    const { data: evento, error } = await supabaseClient
      .from("eventos")
      .select("*")
      .eq("slug", slug)
      .eq("status", "publicado")
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar evento:", error);
      mostrarErro();
      return;
    }

    if (!evento) {
      mostrarErro();
      return;
    }

    preencherEvento(evento);
    mostrarConteudo();
  }

  function obterSlugDaURL() {
    const parametros = new URLSearchParams(
      window.location.search
    );

    return parametros.get("slug")?.trim() || "";
  }

  function preencherEvento(evento) {
    const nome = evento.nome || "Evento esportivo";
    const modalidade = evento.modalidade || "Evento";
    const cidade = evento.cidade || "Cidade não informada";
    const estado = evento.estado || "";
    const descricao =
      evento.descricao ||
      "Ainda não há uma descrição disponível para este evento.";

    eventName.textContent = nome;
    eventType.textContent = modalidade;
    eventDate.textContent = formatarData(evento.data_evento);
    eventLocation.textContent = `⌖ ${cidade}${
      estado ? ` - ${estado}` : ""
    }`;

    eventDescription.textContent = descricao;
    eventPrice.textContent = formatarValor(evento.valor);
    eventSymbol.textContent = obterSimboloModalidade(
      modalidade
    );

    document.title = `${nome} | IngressoTop`;

    configurarBanner(evento.banner_url);
    configurarBotaoInscricao(evento);
  }

  function configurarBanner(bannerUrl) {
    if (!bannerUrl) {
      eventBanner.style.backgroundImage = "";
      eventSymbol.classList.remove("hidden");
      return;
    }

    eventBanner.style.backgroundImage = `
      linear-gradient(
        rgba(5, 18, 34, 0.18),
        rgba(5, 18, 34, 0.42)
      ),
      url("${bannerUrl}")
    `;

    eventBanner.style.backgroundSize = "cover";
    eventBanner.style.backgroundPosition = "center";
    eventBanner.style.backgroundRepeat = "no-repeat";

    eventSymbol.classList.add("hidden");
  }

  function configurarBotaoInscricao(evento) {
    registrationButton.addEventListener("click", () => {
      alert(
        `A inscrição para "${evento.nome}" será conectada na próxima etapa.`
      );
    });
  }

  function formatarData(dataEvento) {
    if (!dataEvento) {
      return "Data a definir";
    }

    const [ano, mes, dia] = dataEvento.split("-").map(Number);

    const data = new Date(
      ano,
      mes - 1,
      dia
    );

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(data);
  }

  function formatarValor(valor) {
    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return "Valor não informado";
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
      return "Valor não informado";
    }

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function obterSimboloModalidade(modalidade) {
    const tipo = normalizarTexto(modalidade);

    if (
      tipo.includes("mtb") ||
      tipo.includes("ciclismo")
    ) {
      return "🚵";
    }

    if (tipo.includes("corrida")) {
      return "🏃";
    }

    if (tipo.includes("trail")) {
      return "🏃‍♂️";
    }

    if (tipo.includes("triathlon")) {
      return "🏊";
    }

    if (tipo.includes("off-road")) {
      return "🏁";
    }

    return "🏆";
  }

  function normalizarTexto(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function mostrarConteudo() {
    eventLoading?.classList.add("hidden");
    eventError?.classList.add("hidden");
    eventContent?.classList.remove("hidden");
  }

  function mostrarErro() {
    eventLoading?.classList.add("hidden");
    eventContent?.classList.add("hidden");
    eventError?.classList.remove("hidden");
  }

  function atualizarAno() {
    if (year) {
      year.textContent = new Date().getFullYear();
    }
  }

  document.addEventListener(
    "DOMContentLoaded",
    carregarEvento
  );
})();