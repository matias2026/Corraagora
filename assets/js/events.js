(() => {
  "use strict";
  
  const eventsGrid = document.getElementById("eventsGrid");
  const starterEmpty = document.getElementById("starterEmpty");
  const emptyState = document.getElementById("emptyState");

  const searchInput = document.getElementById("searchInput");
  const cityFilter = document.getElementById("cityFilter");
  const typeFilter = document.getElementById("typeFilter");
  const dateFilter = document.getElementById("dateFilter");
  const searchButton = document.getElementById("searchButton");
  const showAllButton = document.getElementById("showAllButton");

  let todosOsEventos = [];
  async function carregarEventos() {
    mostrarCarregamento();

    try {
      if (typeof supabaseClient === "undefined" || !supabaseClient?.from) {
        throw new Error("Cliente do Supabase não configurado.");
      }

      const { data, error } = await supabaseClient
        .from("eventos")
        .select("*")
        .eq("status", "aprovado")
        .order("data_evento", { ascending: true });

      if (error) throw error;

      todosOsEventos = Array.isArray(data) ? data : [];
      preencherFiltroDeCidades();
      exibirEventosIniciais();
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      mostrarErro();
    }
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

  const nome = escaparHTML(
    evento.nome || "Evento esportivo"
  );

  const cidade = escaparHTML(evento.cidade || "");
  const estado = escaparHTML(evento.estado || "");

  const modalidade = escaparHTML(
    evento.modalidade || "Evento"
  );

  const slug = encodeURIComponent(evento.slug || "");

  const simbolo = obterSimboloModalidade(
    evento.modalidade
  );

  const valor = formatarValor(evento.valor);

  const banner = evento.banner_url
    ? `
      <img
        src="${escaparAtributo(evento.banner_url)}"
        alt="Banner do evento ${nome}"
        loading="lazy"
      >
    `
    : `
      <div class="event-banner-placeholder">
        <span>${simbolo}</span>
        <strong>${nome}</strong>
      </div>
    `;

  return `
    <article
      class="event-card"
      data-name="${nome.toLowerCase()}"
      data-city="${cidade.toLowerCase()}"
      data-type="${modalidade.toLowerCase()}"
    >

      <div class="event-banner">
        ${banner}
      </div>

      <div class="event-card-content">

        <div class="event-info-list">

          <span class="event-category">
            ${simbolo} ${modalidade}
          </span>

          <span class="event-date">
            📅 ${data.dataCompleta}
          </span>

          <span class="event-location">
            📍 ${cidade}${estado ? ` • ${estado}` : ""}
          </span>

        </div>

        <h3 class="event-title">
          ${nome}
        </h3>

        <div class="event-official">
          <span aria-hidden="true">★★★★★</span>
          Evento oficial
        </div>

        <div class="event-card-footer">

          <div class="event-price">
            <small>Inscrição a partir de</small>
            <strong>${valor || "Consulte"}</strong>
          </div>

          <a
            class="event-button"
            href="evento.html?slug=${slug}"
          >
            Inscrever-se
          </a>

        </div>

      </div>

    </article>
  `;
  }

  function aplicarFiltros(comRolagem = true) {
    const pesquisa = normalizarTexto(searchInput?.value || "");
    const cidadeSelecionada = normalizarTexto(
      cityFilter?.value || ""
    );

    const modalidadeSelecionada = normalizarTexto(
      typeFilter?.value || ""
    );

    const filtroData = dateFilter?.value || "";

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

      const correspondeData = avaliarFiltroData(
        evento.data_evento,
        filtroData
      );

      return (
        correspondePesquisa &&
        correspondeCidade &&
        correspondeModalidade &&
        correspondeData
      );
    });

    renderizarEventos(eventosFiltrados);

    if (comRolagem) {
      document
        .getElementById("eventos")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function mostrarTodosOsEventos() {
    if (searchInput) searchInput.value = "";
    if (cityFilter) cityFilter.value = "";
    if (typeFilter) typeFilter.value = "";
    if (dateFilter) dateFilter.value = "";

    renderizarEventos(todosOsEventos);
  }

  function avaliarFiltroData(dataEvento, filtro) {
    if (!filtro) return true;
    if (!dataEvento) return false;

    const partes = String(dataEvento)
      .slice(0, 10)
      .split("-")
      .map(Number);

    if (
      partes.length !== 3 ||
      partes.some((parte) => !Number.isInteger(parte))
    ) {
      return false;
    }

    const [ano, mes, dia] = partes;
    const data = new Date(ano, mes - 1, dia);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diffDias = Math.round(
      (data.getTime() - hoje.getTime()) / 86400000
    );

    switch (filtro) {
      case "proximos-7-dias":
        return diffDias >= 0 && diffDias <= 7;
      case "proximos-30-dias":
        return diffDias >= 0 && diffDias <= 30;
      case "este-mes":
        return (
          data.getFullYear() === hoje.getFullYear() &&
          data.getMonth() === hoje.getMonth()
        );
      case "futuros":
        return diffDias >= 0;
      default:
        return true;
    }
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

    const partes = String(dataEvento).slice(0, 10).split("-").map(Number);
    if (partes.length !== 3 || partes.some((parte) => !Number.isInteger(parte))) {
      return {
        dia: "--",
        mes: "---",
        dataCompleta: "Data a definir"
      };
    }

    const [ano, mes, dia] = partes;
    const data = new Date(ano, mes - 1, dia);

    if (
      data.getFullYear() !== ano ||
      data.getMonth() !== mes - 1 ||
      data.getDate() !== dia
    ) {
      return {
        dia: "--",
        mes: "---",
        dataCompleta: "Data a definir"
      };
    }

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

    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) return "";

    return numero.toLocaleString("pt-BR", {
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
    return escaparHTML(valor);
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

  searchInput?.addEventListener("input", () => aplicarFiltros(false));

  cityFilter?.addEventListener("change", aplicarFiltros);
  typeFilter?.addEventListener("change", aplicarFiltros);
  dateFilter?.addEventListener("change", aplicarFiltros);

  document.addEventListener(
    "DOMContentLoaded",
    carregarEventos
  );
})();
