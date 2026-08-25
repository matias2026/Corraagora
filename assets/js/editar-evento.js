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

const parametros =
    new URLSearchParams(window.location.search);

const eventoId =
    parametros.get("id");

let usuario = null;
let eventoAtual = null;
let galeriaAtualCount = 0;
let souAdmin = false;

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

function criarSlug(texto) {
    return texto
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
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
    fragmento.querySelector(".lote-data-limite").value =
        lote.data_limite || "";

    fragmento
        .querySelector(".lote-nome")
        .addEventListener("blur", sincronizarPrecosCategorias);

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

function adicionarCategoria(categoria = {}, precosPorLote = []) {
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

    const cardAdicionado = categoriasContainer.lastElementChild;

    cardAdicionado.dataset.precosIniciais =
        JSON.stringify(precosPorLote);

    renderPrecosParaCategoria(cardAdicionado);

    atualizarTitulosCategorias();
}

function renderPrecosParaCategoria(card) {
    const loteCards = [...lotesContainer.querySelectorAll(".lote-card")];
    const precosContainer = card.querySelector(".categoria-precos-container");

    const precosIniciais = card.dataset.precosIniciais
        ? JSON.parse(card.dataset.precosIniciais)
        : [];

    const valoresAtuais = [
        ...precosContainer.querySelectorAll(".categoria-preco")
    ].map(input => input.value);

    if (loteCards.length === 0) {
        precosContainer.innerHTML =
            '<p class="status-help">Adicione um lote acima para definir o preço.</p>';
        return;
    }

    precosContainer.innerHTML = loteCards
        .map((loteCard, index) => {
            const nomeLote =
                loteCard.querySelector(".lote-nome").value.trim() ||
                `Lote ${index + 1}`;

            const valor =
                valoresAtuais[index] !== undefined && valoresAtuais[index] !== ""
                    ? valoresAtuais[index]
                    : precosIniciais[index] ?? "";

            return `
                <div class="form-group">
                    <label>Preço — ${escaparHTML(nomeLote)}</label>
                    <input
                        type="number"
                        class="categoria-preco"
                        min="0"
                        step="0.01"
                        value="${valor}">
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

            const precos = [
                ...card.querySelectorAll(".categoria-preco")
            ].map(input => Number(input.value || 0));

            if (!nome) {
                return;
            }

            categorias.push({
                nome,
                percurso: percurso || null,
                valor: precos[0] || 0,
                limite_inscritos: null,
                idade_min:
                    valorOuNull(idadeMin),
                idade_max:
                    valorOuNull(idadeMax),
                sexo: sexo || null,
                ordem: index + 1,
                precos
            });
        });

    return categorias;
}

function obterLotesFormulario() {
    const lotes = [];

    lotesContainer.querySelectorAll(".lote-card").forEach((card, index) => {
        lotes.push({
            nome: card.querySelector(".lote-nome").value.trim(),
            data_limite: card.querySelector(".lote-data-limite").value,
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
        .select("role")
        .eq("id", usuario.id)
        .maybeSingle();

    souAdmin = perfil?.role === "admin";

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

    if (evento.banner_url) {
        bannerAtual.innerHTML = `
            <a
                href="${evento.banner_url}"
                target="_blank"
                rel="noopener noreferrer"
            >
                Abrir banner atual
            </a>
        `;
    } else {
        bannerAtual.textContent =
            "Nenhum banner cadastrado.";
    }

    if (evento.regulamento_url) {
        regulamentoAtual.innerHTML = `
            <a
                href="${evento.regulamento_url}"
                target="_blank"
                rel="noopener noreferrer"
            >
                Abrir regulamento atual
            </a>
        `;
    } else {
        regulamentoAtual.textContent =
            "Nenhum regulamento cadastrado.";
    }

    lotesContainer.innerHTML = "";

    lotes.forEach(lote => adicionarLote(lote));

    if (lotes.length === 0) {
        adicionarLote();
    }

    categoriasContainer.innerHTML = "";

    categorias.forEach(categoria => {
        const precosDaCategoria = lotes.map(lote => {
            const preco = precos.find(
                item =>
                    item.categoria_id === categoria.id &&
                    item.lote_id === lote.id
            );

            return preco ? preco.valor : "";
        });

        adicionarCategoria(categoria, precosDaCategoria);
    });

    if (categorias.length === 0) {
        adicionarCategoria();
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
                slug: criarSlug(nome),
                modalidade,
                cidade,
                estado,
                data_evento: dataEventoInput.value,
                descricao:
                    descricaoInput.value.trim() || null,
                informacoes_pagamento:
                    informacoesPagamentoInput.value.trim() || null,
                localizacao_url:
                    localizacaoUrlInput.value.trim() || null,
                organizador_contato:
                    organizadorContatoInput.value.trim() || null,
                organizador_instagram:
                    organizadorInstagramInput.value.trim() || null
            };

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
                valor: categoria.valor,
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

            categoriasOrdenadas.forEach((categoriaCriada, indexCategoria) => {
                const precosDaCategoria = categorias[indexCategoria].precos;

                lotesOrdenados.forEach((loteCriado, indexLote) => {
                    precosInsert.push({
                        categoria_id: categoriaCriada.id,
                        lote_id: loteCriado.id,
                        valor: precosDaCategoria[indexLote] || 0
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
            "../login.html";
    }
);

verificarUsuario();
