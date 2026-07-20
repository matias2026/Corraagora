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

const statusInput =
    document.getElementById("status");

const bannerAtual =
    document.getElementById("bannerAtual");

const regulamentoAtual =
    document.getElementById("regulamentoAtual");

const categoriasContainer =
    document.getElementById("categoriasContainer");

const addCategoriaButton =
    document.getElementById("addCategoriaButton");

const categoriaTemplate =
    document.getElementById("categoriaTemplate");

const parametros =
    new URLSearchParams(window.location.search);

const eventoId =
    parametros.get("id");

let usuario = null;
let eventoAtual = null;

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
        .replace(/[\u0300-\u036f]/g, "")
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

function adicionarCategoria(categoria = {}) {
    const fragmento =
        categoriaTemplate.content.cloneNode(true);

    const card =
        fragmento.querySelector(".categoria-card");

    const nome =
        fragmento.querySelector(".categoria-nome");

    const valor =
        fragmento.querySelector(".categoria-valor");

    const limite =
        fragmento.querySelector(".categoria-limite");

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

    valor.value =
        categoria.valor ?? "";

    limite.value =
        categoria.limite_inscritos ?? "";

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

    atualizarTitulosCategorias();
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

            const valor =
                card
                    .querySelector(".categoria-valor")
                    .value;

            const limite =
                card
                    .querySelector(".categoria-limite")
                    .value;

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
                evento_id: Number(eventoId),
                nome,
                valor: valorOuNull(valor) ?? 0,
                limite_inscritos:
                    valorOuNull(limite),
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

    await carregarEvento();
}

async function carregarEvento() {
    salvarButton.disabled = true;
    salvarButton.textContent = "Carregando...";

    try {
        const {
            data: evento,
            error: eventoError
        } = await supabaseClient
            .from("eventos")
            .select("*")
            .eq("id", Number(eventoId))
            .eq("organizador_id", usuario.id)
            .single();

        if (eventoError) {
            throw eventoError;
        }

        eventoAtual = evento;

        const {
            data: categorias,
            error: categoriasError
        } = await supabaseClient
            .from("categorias")
            .select("*")
            .eq("evento_id", Number(eventoId))
            .order("ordem", {
                ascending: true
            });

        if (categoriasError) {
            throw categoriasError;
        }

        preencherFormulario(
            evento,
            categorias || []
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

function preencherFormulario(evento, categorias) {
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

    statusInput.value =
        evento.status || "rascunho";

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

    categoriasContainer.innerHTML = "";

    categorias.forEach(categoria => {
        adicionarCategoria(categoria);
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

            const categorias =
    obterCategoriasFormulario();

const eventoAtualizado = {
    nome,
    slug: criarSlug(nome),
    modalidade,
    cidade,
    estado,
    data_evento: dataEventoInput.value,
    descricao:
        descricaoInput.value.trim() || null,
    status: statusInput.value
};
            const {
                error: atualizarEventoError
            } = await supabaseClient
                .from("eventos")
                .update(eventoAtualizado)
                .eq("id", Number(eventoId))
                .eq(
                    "organizador_id",
                    usuario.id
                );

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

            if (categorias.length > 0) {
                const {
                    error: inserirCategoriasError
                } = await supabaseClient
                    .from("categorias")
                    .insert(categorias);

                if (inserirCategoriasError) {
                    throw inserirCategoriasError;
                }
            }

            mostrarMensagem(
                "Evento atualizado com sucesso!",
                "success"
            );

            salvarButton.textContent =
                "Alterações salvas!";

            setTimeout(() => {
                window.location.href =
                    "eventos.html";
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