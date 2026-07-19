(() => {
  "use strict";
  
  const eventsGrid = document.getElementById("eventsGrid");
  const starterEmpty = document.getElementById("starterEmpty");
  const emptyState = document.getElementById("emptyState");

  const searchInput = document.getElementById("searchInput");
  const cityFilter = document.getElementById("cityFilter");
  const typeFilter = document.getElementById("typeFilter");
  const searchButton = document.getElementById("searchButton");
  const showAllButton = document.getElementById("showAllButton");

  let todosOsEventos = [];
  let mostrarTodos = false;

  async function carregarEventos() {
    mostrarCarregamento();

    const { data, error } = await supabaseClient
      .from("eventos")
      .select("*")
      .eq("status", "publicado")
      .order("data_evento", { ascending: true });

    if (error) {
      console.error("Erro ao carregar eventos:", error);
      mostrarErro();
      return;
    }

    todosOsEventos = data || [];

    preencherFiltroDeCidades();
    exibirEventosIniciais();
  }

  function exibirEventosIniciais() {
    if (todosOsEventos.length === 0) {
      mostrarSemEventosCadastrados();
      return;
    }

    esconderMensagens();

    const eventosEmDestaque = todosOsEventos.filter(
      (evento) => evento.destaque === true
    );

    const eventosParaExibir =
      eventosEmDestaque.length > 0
        ? eventosEmDestaque
        : todosOsEventos;

    renderizarEventos(eventosParaExibir);
  }

  function renderizarEventos(eventos) {
    if (!eventsGrid) return;

    if (!eventos.length) {
      eventsGrid.innerHTML = "";

      if (starterEmpty) {
        starterEmpty.classList.add("hidden");
      }

      if (emptyState) {
        emptyState.classList.remove("hidden");
      }

      return;
    }

    esconderMensagens();

    eventsGrid.innerHTML = eventos
      .map((evento) => criarCardEvento(evento))
      .join("");
  }

  function criarCardEvento(evento) {
    const data = obterDadosDaData(evento.data_evento);
    const nome = escaparHTML(evento.nome || "Evento esportivo");
    const cidade = escaparHTML(evento.cidade || "");
    const estado = escaparHTML(evento.estado || "");
    const modalidade = escaparHTML(
      evento.modalidade || "Evento"
    );

    const descricao = escaparHTML(
      evento.descricao || "Confira os detalhes deste evento."
    );

    const slug = encodeURIComponent(evento.slug || "");
    const simbolo = obterSimboloModalidade(evento.modalidade);

    const estiloBanner = evento.banner_url
      ? `style="background-image: linear-gradient(
          rgba(4, 18, 35, 0.18),
          rgba(4, 18, 35, 0.35)
        ), url('${escaparAtributo(evento.banner_url)}');
        background-size: cover;
        background-position: center;"`
      : "";

    const valor = formatarValor(evento.valor);

    return `
      <article
        class="event-card"
        data-name="${nome.toLowerCase()}"
        data-city="${cidade.toLowerCase()}"
        data-type="${modalidade.toLowerCase()}"
      >
        <div class="event-cover cover-mtb" ${estiloBanner}>
          <span class="date-badge">
            <strong>${data.dia}</strong>
            ${data.mes}
          </span>

          ${
            evento.banner_url
              ? ""
              : `<span class="cover-symbol">${simbolo}</span>`
          }
        </div>

        <div class="event-body">
          <div class="event-meta">
            <span class="pill">${modalidade}</span>
            <span>📅 ${data.dataCompleta}</span>
          </div>

          <span class="location">
            ⌖ ${cidade} - ${estado}
          </span>

          <h3>${nome}</h3>

          <p>${descricao}</p>

          ${
            valor
              ? `<strong class="event-price">${valor}</strong>`
              : ""
          }

          <a
            class="event-link active"
            href="evento.html?slug=${slug}"
          >
            Ver evento
          </a>
        </div>
      </article>
    `;
  }

  function aplicarFiltros() {
    mostrarTodos = true;

    const pesquisa = normalizarTexto(searchInput?.value || "");
    const cidadeSelecionada = normalizarTexto(
      cityFilter?.value || ""
    );

    const modalidadeSelecionada = normalizarTexto(
      typeFilter?.value || ""
    );

    const eventosFiltrados = todosOsEventos.filter((evento) => {
      const nome = normalizarTexto(evento.nome || "");
      const cidade = normalizarTexto(evento.cidade || "");
      const estado = normalizarTexto(evento.estado || "");
      const modalidade = normalizarTexto(
        evento.modalidade || ""
      );

      const descricao = normalizarTexto(
        evento.descricao || ""
      );

      const correspondePesquisa =
        !pesquisa ||
        nome.includes(pesquisa) ||
        cidade.includes(pesquisa) ||
        estado.includes(pesquisa) ||
        modalidade.includes(pesquisa) ||
        descricao.includes(pesquisa);

      const correspondeCidade =
        !cidadeSelecionada ||
        cidade === cidadeSelecionada;

      const correspondeModalidade =
        !modalidadeSelecionada ||
        modalidade === modalidadeSelecionada;

      return (
        correspondePesquisa &&
        correspondeCidade &&
        correspondeModalidade
      );
    });

    renderizarEventos(eventosFiltrados);

    document
      .getElementById("eventos")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  function mostrarTodosOsEventos() {
    mostrarTodos = true;

    if (searchInput) searchInput.value = "";
    if (cityFilter) cityFilter.value = "";
    if (typeFilter) typeFilter.value = "";

    renderizarEventos(todosOsEventos);
  }

  function preencherFiltroDeCidades() {
    if (!cityFilter) return;

    const cidadesExistentes = new Set(
      Array.from(cityFilter.options)
        .map((option) => option.value)
        .filter(Boolean)
    );

    const cidadesDoBanco = [
      ...new Set(
        todosOsEventos
          .map((evento) => evento.cidade)
          .filter(Boolean)
      )
    ].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );

    cidadesDoBanco.forEach((cidade) => {
      if (cidadesExistentes.has(cidade)) return;

      const option = document.createElement("option");
      option.value = cidade;
      option.textContent = cidade;

      cityFilter.appendChild(option);
    });
  }

  function obterDadosDaData(dataEvento) {
    if (!dataEvento) {
      return {
        dia: "--",
        mes: "---",
        dataCompleta: "Data a definir"
      };
    }

    const [ano, mes, dia] = dataEvento.split("-").map(Number);
    const data = new Date(ano, mes - 1, dia);

    const mesCurto = new Intl.DateTimeFormat("pt-BR", {
      month: "short"
    })
      .format(data)
      .replace(".", "")
      .toUpperCase();

    const dataCompleta = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
      .format(data)
      .replace(".", "");

    return {
      dia: String(dia).padStart(2, "0"),
      mes: mesCurto,
      dataCompleta
    };
  }

  function formatarValor(valor) {
    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return "";
    }

    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function obterSimboloModalidade(modalidade) {
    const tipo = normalizarTexto(modalidade || "");

    if (tipo.includes("mtb") || tipo.includes("ciclismo")) {
      return "🚵";
    }

    if (tipo.includes("triathlon")) {
      return "🏊";
    }

    if (tipo.includes("corrida") || tipo.includes("trail")) {
      return "🏃";
    }

    return "🏆";
  }

  function mostrarCarregamento() {
    if (!eventsGrid) return;

    eventsGrid.innerHTML = `
      <div class="starter-empty">
        <div class="starter-icon">⌛</div>
        <h3>Carregando eventos...</h3>
        <p>Aguarde enquanto buscamos os eventos publicados.</p>
      </div>
    `;

    if (starterEmpty) {
      starterEmpty.classList.add("hidden");
    }

    if (emptyState) {
      emptyState.classList.add("hidden");
    }
  }

  function mostrarSemEventosCadastrados() {
    if (eventsGrid) {
      eventsGrid.innerHTML = "";
    }

    if (starterEmpty) {
      starterEmpty.classList.remove("hidden");
    }

    if (emptyState) {
      emptyState.classList.add("hidden");
    }
  }

  function mostrarErro() {
    if (!eventsGrid) return;

    eventsGrid.innerHTML = `
      <div class="starter-empty">
        <div class="starter-icon">!</div>
        <h3>Não foi possível carregar os eventos</h3>
        <p>Verifique a conexão com o Supabase e tente novamente.</p>
      </div>
    `;

    if (starterEmpty) {
      starterEmpty.classList.add("hidden");
    }
  }

  function esconderMensagens() {
    if (starterEmpty) {
      starterEmpty.classList.add("hidden");
    }

    if (emptyState) {
      emptyState.classList.add("hidden");
    }
  }

  function normalizarTexto(texto) {
    return String(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
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
    return String(valor)
      .replaceAll("\\", "\\\\")
      .replaceAll("'", "\\'");
  }

  searchButton?.addEventListener("click", aplicarFiltros);

  showAllButton?.addEventListener(
    "click",
    mostrarTodosOsEventos
  );

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      aplicarFiltros();
    }
  });

  cityFilter?.addEventListener("change", aplicarFiltros);
  typeFilter?.addEventListener("change", aplicarFiltros);

  document.addEventListener(
    "DOMContentLoaded",
    carregarEventos
  );
})();