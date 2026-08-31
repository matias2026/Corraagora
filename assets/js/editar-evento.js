const logoutButton =
    document.getElementById("logoutButton");

const form =
    document.getElementById("editarEventoForm");

const salvarButton =
    document.getElementById("salvarButton");

const mensagem =
    document.getElementById("mensagem");

const nomeInput =
    document.getElementById("nome");

const modalidadeInput =
    document.getElementById("modalidade");

const cidadeInput =
    document.getElementById("cidade");

const estadoInput =
    document.getElementById("estado");

const dataEventoInput =
    document.getElementById("dataEvento");

const descricaoInput =
    document.getElementById("descricao");

const informacoesPagamentoInput =
    document.getElementById("informacoesPagamento");

const chavePixInput =
    document.getElementById("chavePix");

const linkPagamentoInput =
    document.getElementById("linkPagamento");

const localizacaoUrlInput =
    document.getElementById("localizacaoUrl");

const organizadorContatoInput =
    document.getElementById("organizadorContato");

const organizadorInstagramInput =
    document.getElementById("organizadorInstagram");

const statusAtual =
    document.getElementById("statusAtual");

const bannerAtual =
    document.getElementById("bannerAtual");

const regulamentoAtual =
    document.getElementById("regulamentoAtual");

const bannerNovoInput =
    document.getElementById("bannerNovo");

const removerBannerButton =
    document.getElementById("removerBannerButton");

const regulamentoNovoInput =
    document.getElementById("regulamentoNovo");

const removerRegulamentoButton =
    document.getElementById("removerRegulamentoButton");

const galeriaInput =
    document.getElementById("galeria");

const galeriaAtualInfo =
    document.getElementById("galeriaAtualInfo");

const categoriasContainer =
    document.getElementById("categoriasContainer");

const addCategoriaButton =
    document.getElementById("addCategoriaButton");

const categoriaTemplate =
    document.getElementById("categoriaTemplate");

const lotesContainer =
    document.getElementById("lotesContainer");

const addLoteButton =
    document.getElementById("addLoteButton");

const loteTemplate =
    document.getElementById("loteTemplate");

const cuponsContainer =
    document.getElementById("cuponsContainer");

const parametros =
    new URLSearchParams(window.location.search);

const eventoId =
    parametros.get("id");

let usuario = null;
let eventoAtual = null;
let galeriaAtualCount = 0;
let souAdmin = false;
let bannerRemovido = false;
let regulamentoRemovido = false;

function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = `message ${tipo}`;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function limparMensagem() {
    mensagem.textContent = "";
    mensagem.className = "message";
}

function valorOuNull(valor) {
    if (
        valor === "" ||
        valor === null ||
        valor === undefined
    ) {
        return null;
    }

    const numero = Number(valor);

    return Number.isNaN(numero)
        ? null
        : numero;
}

function escaparHTML(valor) {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ---------------------------------------------------------------
// LOTES
// ---------------------------------------------------------------

function adicionarLote(lote = {}) {
    const fragmento = loteTemplate.content.cloneNode(true);
    const card = fragmento.querySelector(".lote-card");

    fragmento.querySelector(".lote-nome").value = lote.nome || "";
    fragmento.querySelector(".lote-data-inicio").value =
        lote.data_inicio || "";

    fragmento.querySelector(".lote-data-limite").value =
        lote.data_limite || "";

    fragmento.querySelector(".lote-valor").value =
        lote.valor ?? "";

    fragmento
        .querySelector(".lote-nome")
        .addEventListener("blur", sincronizarPrecosCategorias);

    fragmento
        .querySelector(".lote-valor")
        .addEventListener("input", sincronizarPrecosCategorias);

    fragmento
        .querySelector(".removeLoteButton")
        .addEventListener("click", () => {
            card.remove();
            sincronizarPrecosCategorias();
        });

    lotesContainer.appendChild(fragmento);
}

addLoteButton.addEventListener("click", () => {
    adicionarLote();
    sincronizarPrecosCategorias();
});

// ---------------------------------------------------------------
// CATEGORIAS
// ---------------------------------------------------------------

function adicionarCategoria(categoria = {}) {
    const fragmento =
        categoriaTemplate.content.cloneNode(true);

    const card =
        fragmento.querySelector(".categoria-card");

    const nome =
        fragmento.querySelector(".categoria-nome");

    const percurso =
        fragmento.querySelector(".categoria-percurso");

    const idadeMin =
        fragmento.querySelector(".categoria-idade-min");

    const idadeMax =
        fragmento.querySelector(".categoria-idade-max");

    const sexo =
        fragmento.querySelector(".categoria-sexo");

    const removerButton =
        fragmento.querySelector(".remover-categoria");

    nome.value =
        categoria.nome || "";

    percurso.value =
        categoria.percurso || "";

    idadeMin.value =
        categoria.idade_min ?? "";

    idadeMax.value =
        categoria.idade_max ?? "";

    sexo.value =
        categoria.sexo || "";

    removerButton.addEventListener("click", () => {
        card.remove();

        atualizarTitulosCategorias();
    });

    categoriasContainer.appendChild(fragmento);

    renderPrecosParaCategoria(categoriasContainer.lastElementChild);

    atualizarTitulosCategorias();
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function renderPrecosParaCategoria(card) {
    const loteCards = [...lotesContainer.querySelectorAll(".lote-card")];
    const precosContainer = card.querySelector(".categoria-precos-container");

    if (loteCards.length === 0) {
        precosContainer.innerHTML =
            '<p class="status-help">Adicione um lote acima e defina o valor — ele vale para esta e para todas as outras categorias.</p>';
        return;
    }

    precosContainer.innerHTML = loteCards
        .map((loteCard, index) => {
            const nomeLote =
                loteCard.querySelector(".lote-nome").value.trim() ||
                `Lote ${index + 1}`;

            const valorLote = loteCard.querySelector(".lote-valor").value;

            return `
                <div class="form-group">
                    <label>Preço — ${escaparHTML(nomeLote)}</label>
                    <strong>${formatarMoeda(valorLote)}</strong>
                </div>
            `;
        })
        .join("");
}

function sincronizarPrecosCategorias() {
    categoriasContainer
        .querySelectorAll(".categoria-card")
        .forEach(renderPrecosParaCategoria);
}

function atualizarTitulosCategorias() {
    const cards =
        categoriasContainer.querySelectorAll(
            ".categoria-card"
        );

    cards.forEach((card, index) => {
        const titulo =
            card.querySelector(".categoria-header h3");

        titulo.textContent =
            `Categoria ${index + 1}`;
    });
}

function obterCategoriasFormulario() {
    const categorias = [];

    document
        .querySelectorAll(".categoria-card")
        .forEach((card, index) => {
            const nome =
                card
                    .querySelector(".categoria-nome")
                    .value
                    .trim();

            const percurso =
                card
                    .querySelector(".categoria-percurso")
                    .value
                    .trim();

            const idadeMin =
                card
                    .querySelector(".categoria-idade-min")
                    .value;

            const idadeMax =
                card
                    .querySelector(".categoria-idade-max")
                    .value;

            const sexo =
                card
                    .querySelector(".categoria-sexo")
                    .value;

            if (!nome) {
                return;
            }

            categorias.push({
                nome,
                percurso: percurso || null,
                limite_inscritos: null,
                idade_min:
                    valorOuNull(idadeMin),
                idade_max:
                    valorOuNull(idadeMax),
                sexo: sexo || null,
                ordem: index + 1
            });
        });

    return categorias;
}

function obterLotesFormulario() {
    const lotes = [];

    lotesContainer.querySelectorAll(".lote-card").forEach((card, index) => {
        lotes.push({
            nome: card.querySelector(".lote-nome").value.trim(),
            data_inicio: card.querySelector(".lote-data-inicio").value || null,
            data_limite: card.querySelector(".lote-data-limite").value,
            valor: Number(card.querySelector(".lote-valor").value || 0),
            ordem: index + 1
        });
    });

    return lotes.filter(lote => lote.nome && lote.data_limite);
}

async function verificarUsuario() {
    if (!eventoId) {
        mostrarMensagem(
            "O ID do evento não foi informado.",
            "error"
        );

        form.style.display = "none";
        return;
    }

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        console.error(
            "Erro ao verificar sessão:",
            error
        );
    }

    if (!session) {
        window.location.href = "../login.html";
        return;
    }

    usuario = session.user;

    const { data: perfil } = await supabaseClient
        .from("profiles")
        .select("role, status_organizador")
        .eq("id", usuario.id)
        .maybeSingle();

    souAdmin = perfil?.role === "admin";

    if (perfil?.role === "organizador" && perfil?.status_organizador !== "aprovado") {
        window.location.href = "../aguardando-aprovacao.html";
        return;
    }

    if (perfil?.role !== "organizador" && !souAdmin) {
        window.location.href = "../minhas-inscricoes.html";
        return;
    }

    if (souAdmin) {
        document.querySelectorAll("[data-voltar-eventos]").forEach(link => {
            link.href = "../admin/eventos.html";
        });
    }

    await carregarEvento();
}

async function carregarEvento() {
    salvarButton.disabled = true;
    salvarButton.textContent = "Carregando...";

    try {
        let consulta = supabaseClient
            .from("eventos")
            .select("*")
            .eq("id", Number(eventoId));

        if (!souAdmin) {
            consulta = consulta.eq("organizador_id", usuario.id);
        }

        const {
            data: evento,
            error: eventoError
        } = await consulta.single();

        if (eventoError) {
            throw eventoError;
        }

        eventoAtual = evento;

        const [
            { data: categorias, error: categoriasError },
            { data: lotes, error: lotesError },
            { data: banners, error: bannersError }
        ] = await Promise.all([
            supabaseClient
                .from("categorias")
                .select("*")
                .eq("evento_id", Number(eventoId))
                .order("ordem", { ascending: true }),
            supabaseClient
                .from("lotes")
                .select("*")
                .eq("evento_id", Number(eventoId))
                .order("ordem", { ascending: true }),
            supabaseClient
                .from("evento_banners")
                .select("*")
                .eq("evento_id", Number(eventoId))
        ]);

        if (categoriasError) throw categoriasError;
        if (lotesError) throw lotesError;
        if (bannersError) throw bannersError;

        let precos = [];

        if ((categorias || []).length > 0) {
            const { data: precosData, error: precosError } =
                await supabaseClient
                    .from("categoria_precos")
                    .select("*")
                    .in(
                        "categoria_id",
                        categorias.map(categoria => categoria.id)
                    );

            if (precosError) throw precosError;
            precos = precosData || [];
        }

        preencherFormulario(
            evento,
            categorias || [],
            lotes || [],
            precos,
            (banners || []).length
        );

        await carregarCupons();
    } catch (error) {
        console.error(
            "Erro ao carregar evento:",
            error
        );

        mostrarMensagem(
            error.message ||
                "Não foi possível carregar o evento.",
            "error"
        );

        form.style.display = "none";
    } finally {
        salvarButton.disabled = false;
        salvarButton.textContent =
            "Salvar alterações";
    }
}

function preencherFormulario(evento, categorias, lotes, precos, totalBanners) {
    nomeInput.value =
        evento.nome || "";

    modalidadeInput.value =
        evento.modalidade || "";

    cidadeInput.value =
        evento.cidade || "";

    estadoInput.value =
        evento.estado || "";

    dataEventoInput.value =
        evento.data_evento || "";

    descricaoInput.value =
        evento.descricao || "";

    informacoesPagamentoInput.value =
        evento.informacoes_pagamento || "";

    chavePixInput.value =
        evento.chave_pix || "";

    linkPagamentoInput.value =
        evento.link_pagamento || "";

    localizacaoUrlInput.value =
        evento.localizacao_url || "";

    organizadorContatoInput.value =
        evento.organizador_contato || "";

    organizadorInstagramInput.value =
        evento.organizador_instagram || "";

    galeriaAtualCount = totalBanners;

    galeriaAtualInfo.textContent = totalBanners
        ? `${totalBanners} foto(s) na galeria atualmente. Fotos novas selecionadas aqui serão adicionadas às existentes.`
        : "Nenhuma foto na galeria ainda.";

    const status = evento.status || "pendente";

    statusAtual.textContent =
        status.charAt(0).toUpperCase() + status.slice(1);

    statusAtual.className = `status-pill status-${status}`;

    bannerRemovido = false;
    regulamentoRemovido = false;
    bannerNovoInput.value = "";
    regulamentoNovoInput.value = "";

    atualizarBannerAtualTexto();
    atualizarRegulamentoAtualTexto();

    lotesContainer.innerHTML = "";

    lotes.forEach(lote => {
        const precoDoLote = precos.find(item => item.lote_id === lote.id);

        adicionarLote({
            ...lote,
            valor: precoDoLote ? precoDoLote.valor : ""
        });
    });

    if (lotes.length === 0) {
        adicionarLote();
    }

    categoriasContainer.innerHTML = "";

    categorias.forEach(categoria => {
        adicionarCategoria(categoria);
    });

    if (categorias.length === 0) {
        adicionarCategoria();
    }
}

// ---------------------------------------------------------------
// BANNER E REGULAMENTO (trocar ou remover)
// ---------------------------------------------------------------

function atualizarBannerAtualTexto() {
    if (bannerNovoInput.files[0]) {
        bannerAtual.textContent =
            `Novo arquivo selecionado: ${bannerNovoInput.files[0].name}`;
        return;
    }

    if (bannerRemovido) {
        bannerAtual.textContent =
            "Banner será removido ao salvar.";
        return;
    }

    if (eventoAtual?.banner_url) {
        bannerAtual.innerHTML = `
            <a
                href="${eventoAtual.banner_url}"
                target="_blank"
                rel="noopener noreferrer"
            >
                Abrir banner atual
            </a>
        `;
        return;
    }

    bannerAtual.textContent = "Nenhum banner cadastrado.";
}

function atualizarRegulamentoAtualTexto() {
    if (regulamentoNovoInput.files[0]) {
        regulamentoAtual.textContent =
            `Novo arquivo selecionado: ${regulamentoNovoInput.files[0].name}`;
        return;
    }

    if (regulamentoRemovido) {
        regulamentoAtual.textContent =
            "Regulamento será removido ao salvar.";
        return;
    }

    if (eventoAtual?.regulamento_url) {
        regulamentoAtual.innerHTML = `
            <a
                href="${eventoAtual.regulamento_url}"
                target="_blank"
                rel="noopener noreferrer"
            >
                Abrir regulamento atual
            </a>
        `;
        return;
    }

    regulamentoAtual.textContent = "Nenhum regulamento cadastrado.";
}

bannerNovoInput.addEventListener("change", () => {
    if (bannerNovoInput.files[0]) {
        bannerRemovido = false;
    }
    atualizarBannerAtualTexto();
});

removerBannerButton.addEventListener("click", () => {
    bannerRemovido = true;
    bannerNovoInput.value = "";
    atualizarBannerAtualTexto();
});

regulamentoNovoInput.addEventListener("change", () => {
    if (regulamentoNovoInput.files[0]) {
        regulamentoRemovido = false;
    }
    atualizarRegulamentoAtualTexto();
});

removerRegulamentoButton.addEventListener("click", () => {
    regulamentoRemovido = true;
    regulamentoNovoInput.value = "";
    atualizarRegulamentoAtualTexto();
});

// ---------------------------------------------------------------
// CUPONS DE DESCONTO
// ---------------------------------------------------------------

const PERCENTUAIS_CUPOM = [10, 15, 20, 25, 30, 100];

let cuponsPorPercentual = {};

function gerarCodigoCupom(nomeEvento, percentual) {
    const base = (nomeEvento || "evento")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    return `${base}${percentual}`;
}

async function carregarCupons() {
    const { data, error } = await supabaseClient
        .from("cupons")
        .select("*")
        .eq("evento_id", Number(eventoId));

    if (error) {
        console.error("Erro ao carregar cupons:", error);
        return;
    }

    cuponsPorPercentual = {};

    (data || []).forEach(cupom => {
        cuponsPorPercentual[cupom.percentual] = cupom;
    });

    renderizarCupons();
}

function renderizarCupons() {
    cuponsContainer.innerHTML = PERCENTUAIS_CUPOM.map(percentual => {
        const cupom = cuponsPorPercentual[percentual];
        const ativo = cupom?.ativo || false;
        const codigo = cupom?.codigo || gerarCodigoCupom(eventoAtual?.nome, percentual);

        const titulo = percentual === 100
            ? "100% — inscrição gratuita"
            : `${percentual}% de desconto`;

        return `
            <div class="cupom-linha">
                <div class="cupom-info">
                    <strong>${escaparHTML(titulo)}</strong>
                    ${
                        ativo
                            ? `<small>Código: <code>${escaparHTML(codigo)}</code></small>`
                            : `<small>Desativado</small>`
                    }
                </div>

                <div class="cupom-acoes">
                    ${
                        ativo
                            ? `
                                <div class="cupom-codigo">
                                    <input type="text" value="${escaparHTML(codigo)}" readonly>
                                    <button
                                        type="button"
                                        class="secondary-button botao-copiar-cupom"
                                        data-codigo="${escaparHTML(codigo)}"
                                    >
                                        Copiar
                                    </button>
                                </div>

                                <div class="cupom-limite">
                                    <label>Limite de usos</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        class="cupom-limite-input"
                                        data-percentual="${percentual}"
                                        placeholder="Ilimitado"
                                        value="${cupom?.limite_usos ?? ""}"
                                    >
                                    <small>${cupom?.usos_atuais || 0} usado${(cupom?.usos_atuais || 0) === 1 ? "" : "s"}</small>
                                </div>
                            `
                            : ""
                    }

                    <label class="toggle-switch">
                        <input
                            type="checkbox"
                            class="toggle-cupom"
                            data-percentual="${percentual}"
                            ${ativo ? "checked" : ""}
                        >
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
    }).join("");

    cuponsContainer.querySelectorAll(".toggle-cupom").forEach(toggle => {
        toggle.addEventListener("change", () =>
            alternarCupom(Number(toggle.dataset.percentual), toggle)
        );
    });

    cuponsContainer.querySelectorAll(".cupom-limite-input").forEach(input => {
        input.addEventListener("change", () =>
            atualizarLimiteCupom(Number(input.dataset.percentual), input)
        );
    });

    cuponsContainer.querySelectorAll(".botao-copiar-cupom").forEach(botao => {
        botao.addEventListener("click", () => {
            navigator.clipboard.writeText(botao.dataset.codigo).then(() => {
                const textoOriginal = botao.textContent;
                botao.textContent = "Copiado!";
                setTimeout(() => {
                    botao.textContent = textoOriginal;
                }, 1500);
            });
        });
    });
}

async function atualizarLimiteCupom(percentual, inputEl) {
    const cupomExistente = cuponsPorPercentual[percentual];
    if (!cupomExistente) return;

    const valorDigitado = inputEl.value.trim();
    const novoLimite = valorDigitado ? Number(valorDigitado) : null;

    if (novoLimite !== null && (!Number.isInteger(novoLimite) || novoLimite < 1)) {
        alert("O limite de usos precisa ser um número inteiro maior que zero, ou em branco para ilimitado.");
        inputEl.value = cupomExistente.limite_usos ?? "";
        return;
    }

    inputEl.disabled = true;

    try {
        const { data, error } = await supabaseClient
            .from("cupons")
            .update({ limite_usos: novoLimite })
            .eq("id", cupomExistente.id)
            .select()
            .single();

        if (error) throw error;

        cuponsPorPercentual[percentual] = data;
    } catch (error) {
        console.error("Erro ao atualizar limite do cupom:", error);
        alert(error.message || "Não foi possível atualizar o limite do cupom.");
    } finally {
        inputEl.disabled = false;
        renderizarCupons();
    }
}

async function alternarCupom(percentual, toggleEl) {
    const cupomExistente = cuponsPorPercentual[percentual];
    const novoAtivo = toggleEl.checked;

    toggleEl.disabled = true;

    try {
        if (cupomExistente) {
            const { data, error } = await supabaseClient
                .from("cupons")
                .update({ ativo: novoAtivo })
                .eq("id", cupomExistente.id)
                .select()
                .single();

            if (error) throw error;

            cuponsPorPercentual[percentual] = data;
        } else {
            const codigo = gerarCodigoCupom(eventoAtual?.nome, percentual);

            const { data, error } = await supabaseClient
                .from("cupons")
                .insert({
                    evento_id: Number(eventoId),
                    percentual,
                    codigo,
                    ativo: true
                })
                .select()
                .single();

            if (error) throw error;

            cuponsPorPercentual[percentual] = data;
        }
    } catch (error) {
        console.error("Erro ao atualizar cupom:", error);
        alert(error.message || "Não foi possível atualizar o cupom.");
    } finally {
        toggleEl.disabled = false;
        renderizarCupons();
    }
}

addCategoriaButton.addEventListener(
    "click",
    () => adicionarCategoria()
);

form.addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        limparMensagem();

        salvarButton.disabled = true;
        salvarButton.textContent =
            "Salvando...";

        try {
            const nome =
                nomeInput.value.trim();

            const cidade =
                cidadeInput.value.trim();

            const estado =
                estadoInput.value
                    .trim()
                    .toUpperCase();

            const modalidade =
                modalidadeInput.value.trim();

            if (
                !nome ||
                !cidade ||
                !estado ||
                !modalidade ||
                !dataEventoInput.value
            ) {
                throw new Error(
                    "Preencha todos os campos obrigatórios."
                );
            }

            const lotes = obterLotesFormulario();

            if (lotes.length === 0) {
                throw new Error(
                    "Adicione pelo menos um lote (nome e data limite)."
                );
            }

            const categorias = obterCategoriasFormulario();

            if (categorias.length === 0) {
                throw new Error(
                    "Adicione pelo menos uma categoria."
                );
            }

            const galeriaFiles = [...galeriaInput.files];
            const galeriaUrls = [];

            if (galeriaFiles.length > 0) {
                salvarButton.textContent = "Enviando fotos...";

                for (const arquivo of galeriaFiles) {
                    const url = await uploadBanner(
                        arquivo,
                        usuario.id
                    );

                    galeriaUrls.push(url);
                }

                salvarButton.textContent = "Salvando...";
            }

            const eventoAtualizado = {
                nome,
                modalidade,
                cidade,
                estado,
                data_evento: dataEventoInput.value,
                descricao:
                    descricaoInput.value.trim() || null,
                informacoes_pagamento:
                    informacoesPagamentoInput.value.trim() || null,
                chave_pix:
                    chavePixInput.value.trim() || null,
                link_pagamento:
                    linkPagamentoInput.value.trim() || null,
                localizacao_url:
                    localizacaoUrlInput.value.trim() || null,
                organizador_contato:
                    organizadorContatoInput.value.trim() || null,
                organizador_instagram:
                    organizadorInstagramInput.value.trim() || null
            };

            const bannerNovoFile = bannerNovoInput.files[0] || null;

            if (bannerNovoFile) {
                salvarButton.textContent = "Enviando banner...";
                eventoAtualizado.banner_url = await uploadBanner(
                    bannerNovoFile,
                    usuario.id
                );
                salvarButton.textContent = "Salvando...";
            } else if (bannerRemovido) {
                eventoAtualizado.banner_url = null;
            }

            const regulamentoNovoFile = regulamentoNovoInput.files[0] || null;

            if (regulamentoNovoFile) {
                salvarButton.textContent = "Enviando regulamento...";
                eventoAtualizado.regulamento_url = await uploadRegulamento(
                    regulamentoNovoFile,
                    usuario.id
                );
                salvarButton.textContent = "Salvando...";
            } else if (regulamentoRemovido) {
                eventoAtualizado.regulamento_url = null;
            }

            let atualizarConsulta = supabaseClient
                .from("eventos")
                .update(eventoAtualizado)
                .eq("id", Number(eventoId));

            if (!souAdmin) {
                atualizarConsulta = atualizarConsulta.eq(
                    "organizador_id",
                    usuario.id
                );
            }

            const {
                error: atualizarEventoError
            } = await atualizarConsulta;

            if (atualizarEventoError) {
                throw atualizarEventoError;
            }

            const {
                error: excluirCategoriasError
            } = await supabaseClient
                .from("categorias")
                .delete()
                .eq(
                    "evento_id",
                    Number(eventoId)
                );

            if (excluirCategoriasError) {
                throw excluirCategoriasError;
            }

            const {
                error: excluirLotesError
            } = await supabaseClient
                .from("lotes")
                .delete()
                .eq("evento_id", Number(eventoId));

            if (excluirLotesError) {
                throw excluirLotesError;
            }

            const {
                data: lotesCriados,
                error: inserirLotesError
            } = await supabaseClient
                .from("lotes")
                .insert(
                    lotes.map(lote => ({
                        evento_id: Number(eventoId),
                        nome: lote.nome,
                        data_inicio: lote.data_inicio,
                        data_limite: lote.data_limite,
                        ordem: lote.ordem
                    }))
                )
                .select();

            if (inserirLotesError) {
                throw inserirLotesError;
            }

            const lotesOrdenados = [...lotesCriados].sort(
                (a, b) => a.ordem - b.ordem
            );

            const categoriasParaInserir = categorias.map(categoria => ({
                evento_id: Number(eventoId),
                nome: categoria.nome,
                percurso: categoria.percurso,
                valor: lotes[0]?.valor || 0,
                limite_inscritos: categoria.limite_inscritos,
                idade_min: categoria.idade_min,
                idade_max: categoria.idade_max,
                sexo: categoria.sexo,
                ordem: categoria.ordem
            }));

            const {
                data: categoriasCriadas,
                error: inserirCategoriasError
            } = await supabaseClient
                .from("categorias")
                .insert(categoriasParaInserir)
                .select();

            if (inserirCategoriasError) {
                throw inserirCategoriasError;
            }

            const categoriasOrdenadas = [...categoriasCriadas].sort(
                (a, b) => a.ordem - b.ordem
            );

            const precosInsert = [];

            categoriasOrdenadas.forEach(categoriaCriada => {
                lotesOrdenados.forEach((loteCriado, indexLote) => {
                    precosInsert.push({
                        categoria_id: categoriaCriada.id,
                        lote_id: loteCriado.id,
                        valor: lotes[indexLote]?.valor || 0
                    });
                });
            });

            if (precosInsert.length > 0) {
                const { error: precosError } = await supabaseClient
                    .from("categoria_precos")
                    .insert(precosInsert);

                if (precosError) {
                    throw precosError;
                }
            }

            if (galeriaUrls.length > 0) {
                const { error: galeriaError } = await supabaseClient
                    .from("evento_banners")
                    .insert(
                        galeriaUrls.map((url, index) => ({
                            evento_id: Number(eventoId),
                            url,
                            ordem: galeriaAtualCount + index + 1
                        }))
                    );

                if (galeriaError) {
                    throw galeriaError;
                }
            }

            mostrarMensagem(
                "Evento atualizado com sucesso!",
                "success"
            );

            salvarButton.textContent =
                "Alterações salvas!";

            setTimeout(() => {
                window.location.href = souAdmin
                    ? "../admin/eventos.html"
                    : "eventos.html";
            }, 1200);
        } catch (error) {
            console.error(
                "Erro ao atualizar evento:",
                error
            );

            mostrarMensagem(
                error.message ||
                    "Não foi possível atualizar o evento.",
                "error"
            );

            salvarButton.disabled = false;
            salvarButton.textContent =
                "Salvar alterações";
        }
    }
);

logoutButton.addEventListener(
    "click",
    async () => {
        await supabaseClient.auth.signOut();

        window.location.href =
            "../index.html";
    }
);

verificarUsuario();
