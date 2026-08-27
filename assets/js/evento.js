(() => {
  "use strict";

  const eventLoading = document.getElementById("eventLoading");
  const eventContent = document.getElementById("eventContent");
  const eventError = document.getElementById("eventError");

  const eventBanner = document.getElementById("eventBanner");
  const eventBannerImg = document.getElementById("eventBannerImg");
  const eventSymbol = document.getElementById("eventSymbol");
  const eventType = document.getElementById("eventType");
  const eventDate = document.getElementById("eventDate");
  const eventName = document.getElementById("eventName");
  const eventLocation = document.getElementById("eventLocation");
  const eventDescription =
    document.getElementById("eventDescription");
  const registrationButton =
    document.getElementById("registrationButton");
  const year = document.getElementById("year");

  const eventCategories = document.getElementById("eventCategories");
  const eventCategoriesGroups = document.getElementById(
    "eventCategoriesGroups"
  );
  const eventCategoriesScrollHint = document.getElementById(
    "eventCategoriesScrollHint"
  );
  const eventLotesInfo = document.getElementById("eventLotesInfo");
  const eventLotesList = document.getElementById("eventLotesList");

  const eventLocationPreview = document.getElementById(
    "eventLocationPreview"
  );
  const eventLocationFrame = document.getElementById("eventLocationFrame");
  const eventLocationLink = document.getElementById("eventLocationLink");
  const eventLocationShortLinkHint = document.getElementById(
    "eventLocationShortLinkHint"
  );
  const eventRegulamentoButton = document.getElementById(
    "eventRegulamentoButton"
  );

  const eventOrganizerInfo = document.getElementById("eventOrganizerInfo");
  const eventOrganizerName = document.getElementById("eventOrganizerName");
  const eventOrganizerContact = document.getElementById(
    "eventOrganizerContact"
  );
  const eventOrganizerInstagram = document.getElementById(
    "eventOrganizerInstagram"
  );

  const eventGallery = document.getElementById("eventGallery");
  const eventGalleryImage = document.getElementById("eventGalleryImage");
  const eventGalleryCounter = document.getElementById(
    "eventGalleryCounter"
  );
  const eventGalleryPrev = document.getElementById("eventGalleryPrev");
  const eventGalleryNext = document.getElementById("eventGalleryNext");

  let galeriaFotos = [];
  let galeriaIndiceAtual = 0;

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
      .eq("status", "aprovado")
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

    const [
      { data: categorias, error: categoriasError },
      { data: lotes, error: lotesError },
      { data: banners, error: bannersError }
    ] = await Promise.all([
      supabaseClient
        .from("categorias")
        .select("*")
        .eq("evento_id", evento.id)
        .order("ordem", { ascending: true }),
      supabaseClient
        .from("lotes")
        .select("*")
        .eq("evento_id", evento.id)
        .order("ordem", { ascending: true }),
      supabaseClient
        .from("evento_banners")
        .select("*")
        .eq("evento_id", evento.id)
        .order("ordem", { ascending: true })
    ]);

    if (categoriasError) {
      console.error("Erro ao carregar categorias:", categoriasError);
    }

    if (lotesError) {
      console.error("Erro ao carregar lotes:", lotesError);
    }

    if (bannersError) {
      console.error("Erro ao carregar galeria:", bannersError);
    }

    const listaCategorias = categorias || [];
    const listaLotes = lotes || [];

    let precos = [];

    if (listaCategorias.length > 0 && listaLotes.length > 0) {
      const { data: precosData, error: precosError } = await supabaseClient
        .from("categoria_precos")
        .select("*")
        .in(
          "categoria_id",
          listaCategorias.map((categoria) => categoria.id)
        );

      if (precosError) {
        console.error("Erro ao carregar preços por lote:", precosError);
      } else {
        precos = precosData || [];
      }
    }

    const loteVigente = obterLoteVigente(listaLotes);

    const categoriasComPreco = listaCategorias.map((categoria) => ({
      ...categoria,
      precoAtual: calcularPrecoCategoria(categoria, loteVigente, precos)
    }));

    let organizador = null;

    if (evento.organizador_id) {
      const { data: perfil, error: perfilError } = await supabaseClient
        .from("profiles")
        .select("full_name, email")
        .eq("id", evento.organizador_id)
        .maybeSingle();

      if (perfilError) {
        console.error("Erro ao carregar organizador:", perfilError);
      } else {
        organizador = perfil;
      }
    }

    window.eventoAtual = evento;
    window.categoriasDoEvento = categoriasComPreco;
    window.loteVigenteDoEvento = loteVigente;

    preencherEvento(evento, categoriasComPreco, loteVigente, organizador, listaLotes);
    configurarGaleria(banners || []);
    mostrarConteudo();
  }

  function obterLoteVigente(lotes) {
    if (!lotes.length) return null;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ordenados = [...lotes].sort((a, b) => a.ordem - b.ordem);

    const vigente = ordenados.find((lote) => {
      const dataLimite = new Date(`${lote.data_limite}T23:59:59`);
      return dataLimite >= hoje;
    });

    return vigente || ordenados[ordenados.length - 1];
  }

  function calcularPrecoCategoria(categoria, loteVigente, precos) {
    if (loteVigente) {
      const preco = precos.find(
        (item) =>
          item.categoria_id === categoria.id &&
          item.lote_id === loteVigente.id
      );

      if (preco) return Number(preco.valor);
    }

    return categoria.valor !== null && categoria.valor !== undefined
      ? Number(categoria.valor)
      : null;
  }

  function obterSlugDaURL() {
    const parametros = new URLSearchParams(
      window.location.search
    );

    return parametros.get("slug")?.trim() || "";
  }

  function preencherEvento(evento, categorias, loteVigente, organizador, lotes) {
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
    eventSymbol.textContent = obterSimboloModalidade(
      modalidade
    );

    document.title = `${nome} | CorraAgora`;

    configurarBanner(evento.banner_url);
    configurarBotaoInscricao(evento);
    configurarCategorias(categorias, loteVigente, lotes);
    configurarLocalizacao(evento);
    configurarRegulamento(evento);
    configurarOrganizador(evento, organizador);
  }

  function configurarCategorias(categorias, loteVigente, lotes) {
    const temCategorias = categorias.length > 0;
    const temLotes = (lotes || []).length > 0;

    if (!temCategorias && !temLotes) {
      eventCategories.classList.add("hidden");
      return;
    }

    eventCategories.classList.remove("hidden");
    configurarListaDeLotes(lotes || [], loteVigente);

    if (!temCategorias) {
      eventCategoriesGroups.innerHTML = "";
      eventCategoriesScrollHint?.classList.add("hidden");
      return;
    }

    eventCategoriesGroups.innerHTML = `
      <div class="event-category-list">
        ${categorias
          .map((categoria) => {
            const percurso = categoria.percurso?.trim();

            const titulo = percurso
              ? `${escaparHTML(categoria.nome)} — ${escaparHTML(percurso)}`
              : escaparHTML(categoria.nome);

            return `
              <div class="event-category-row">
                <div>
                  <strong>${titulo}</strong>
                  ${
                    categoria.sexo || categoria.idade_min || categoria.idade_max
                      ? `<small>${escaparHTML(
                          [
                            categoria.sexo || "",
                            categoria.idade_min || categoria.idade_max
                              ? `${categoria.idade_min || 0}-${categoria.idade_max || "+"} anos`
                              : ""
                          ]
                            .filter(Boolean)
                            .join(" • ")
                        )}</small>`
                      : ""
                  }
                </div>
                <span>${formatarValor(categoria.precoAtual)}</span>
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    requestAnimationFrame(() => {
      const temRolagem =
        eventCategoriesGroups.scrollHeight >
        eventCategoriesGroups.clientHeight + 1;

      eventCategoriesScrollHint?.classList.toggle("hidden", !temRolagem);
    });
  }

  function configurarListaDeLotes(lotes, loteVigente) {
    if (!lotes.length) {
      eventLotesInfo.classList.add("hidden");
      return;
    }

    eventLotesInfo.classList.remove("hidden");

    const ordenados = [...lotes].sort((a, b) => a.ordem - b.ordem);

    eventLotesList.innerHTML = ordenados
      .map((lote, index) => {
        const vigente = loteVigente && lote.id === loteVigente.id;
        const nome = formatarNomeLote(lote.nome, index);

        const periodo = lote.data_inicio
          ? `${formatarData(lote.data_inicio)} até ${formatarData(lote.data_limite)}`
          : `até ${formatarData(lote.data_limite)}`;

        return `
          <div class="event-lote-row${vigente ? " event-lote-row-vigente" : ""}">
            <span>${escaparHTML(nome)}</span>
            <span>${periodo}</span>
          </div>
        `;
      })
      .join("");
  }

  function formatarNomeLote(nome, index) {
    const limpo = nome?.trim();

    if (!limpo) return `Lote ${index + 1}`;

    if (/^[\d.,]+$/.test(limpo)) {
      const numero = Number(limpo.replace(",", "."));

      if (Number.isFinite(numero)) {
        return formatarValor(numero);
      }
    }

    return limpo;
  }

  function configurarLocalizacao(evento) {
    const urlSegura = obterUrlSegura(evento.localizacao_url);

    if (!urlSegura) {
      eventLocationPreview.classList.add("hidden");
      return;
    }

    eventLocationLink.href = urlSegura;
    eventLocationPreview.classList.remove("hidden");

    const embedUrl = obterUrlDeEmbedDoMapa(urlSegura);

    if (embedUrl) {
      eventLocationFrame.src = embedUrl;
      eventLocationFrame.classList.remove("hidden");
      eventLocationShortLinkHint.classList.add("hidden");
    } else {
      eventLocationFrame.classList.add("hidden");
      eventLocationShortLinkHint.classList.remove("hidden");
    }
  }

  function obterUrlSegura(url) {
    try {
      const parsed = new URL(url);

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }

      return parsed.toString();
    } catch {
      return null;
    }
  }

  function extrairCoordenadasDoLink(url) {
    const viewport = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

    if (viewport) {
      return { lat: viewport[1], lng: viewport[2] };
    }

    const pino = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);

    if (pino) {
      return { lat: pino[1], lng: pino[2] };
    }

    return null;
  }

  function obterUrlDeEmbedDoMapa(url) {
    if (!url) return null;

    try {
      const parsed = new URL(url);

      if (!parsed.hostname.includes("google")) {
        return null;
      }

      if (parsed.pathname.includes("/maps/embed")) {
        return url;
      }

      const coordenadas = extrairCoordenadasDoLink(url);

      if (coordenadas) {
        return `https://maps.google.com/maps?q=${coordenadas.lat},${coordenadas.lng}&z=15&output=embed`;
      }

      return null;
    } catch {
      return null;
    }
  }

  function configurarRegulamento(evento) {
    if (!evento.regulamento_url) {
      eventRegulamentoButton.classList.add("hidden");
      return;
    }

    eventRegulamentoButton.href = evento.regulamento_url;
    eventRegulamentoButton.classList.remove("hidden");
  }

  function configurarOrganizador(evento, organizador) {
    const nome =
      organizador?.full_name ||
      organizador?.email ||
      "Organizador não identificado";

    const temContato = Boolean(evento.organizador_contato);
    const temInstagram = Boolean(evento.organizador_instagram);

    if (!organizador && !temContato && !temInstagram) {
      eventOrganizerInfo.classList.add("hidden");
      return;
    }

    eventOrganizerInfo.classList.remove("hidden");
    eventOrganizerName.textContent = nome;

    if (temContato) {
      const apenasDigitos = evento.organizador_contato.replace(/\D/g, "");

      eventOrganizerContact.href = apenasDigitos
        ? `https://wa.me/55${apenasDigitos}`
        : "#";

      eventOrganizerContact.textContent = `📞 ${evento.organizador_contato}`;
      eventOrganizerContact.target = "_blank";
      eventOrganizerContact.rel = "noopener noreferrer";
      eventOrganizerContact.classList.remove("hidden");
    } else {
      eventOrganizerContact.classList.add("hidden");
    }

    if (temInstagram) {
      const handle = evento.organizador_instagram
        .trim()
        .replace(/^@/, "");

      eventOrganizerInstagram.href = handle.startsWith("http")
        ? handle
        : `https://instagram.com/${handle}`;

      eventOrganizerInstagram.textContent = `📷 @${handle.replace(
        /^https?:\/\/(www\.)?instagram\.com\//,
        ""
      )}`;
      eventOrganizerInstagram.classList.remove("hidden");
    } else {
      eventOrganizerInstagram.classList.add("hidden");
    }
  }

  function configurarGaleria(banners) {
    galeriaFotos = banners;
    galeriaIndiceAtual = 0;

    if (!banners.length) {
      eventGallery.classList.add("hidden");
      return;
    }

    eventGallery.classList.remove("hidden");
    atualizarImagemGaleria();
  }

  function atualizarImagemGaleria() {
    const foto = galeriaFotos[galeriaIndiceAtual];
    if (!foto) return;

    eventGalleryImage.src = foto.url;
    eventGalleryCounter.textContent =
      `${galeriaIndiceAtual + 1} / ${galeriaFotos.length}`;
  }

  eventGalleryPrev?.addEventListener("click", () => {
    if (!galeriaFotos.length) return;
    galeriaIndiceAtual =
      (galeriaIndiceAtual - 1 + galeriaFotos.length) % galeriaFotos.length;
    atualizarImagemGaleria();
  });

  eventGalleryNext?.addEventListener("click", () => {
    if (!galeriaFotos.length) return;
    galeriaIndiceAtual = (galeriaIndiceAtual + 1) % galeriaFotos.length;
    atualizarImagemGaleria();
  });

  function configurarBanner(bannerUrl) {
    if (!bannerUrl) {
      eventBannerImg.classList.add("hidden");
      eventBannerImg.src = "";
      eventSymbol.classList.remove("hidden");
      return;
    }

    eventBannerImg.src = bannerUrl;
    eventBannerImg.classList.remove("hidden");
    eventSymbol.classList.add("hidden");
  }

  function configurarBotaoInscricao(evento) {
    const notaEncerrada = document.getElementById(
      "registrationClosedNote"
    );

    if (evento.inscricoes_abertas === false) {
      registrationButton.disabled = true;
      registrationButton.textContent = "Inscrições encerradas";
      notaEncerrada?.classList.remove("hidden");
      return;
    }

    registrationButton.addEventListener("click", () => {
      window.abrirModalInscricao?.();
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
      .replace(/\p{Diacritic}/gu, "")
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
