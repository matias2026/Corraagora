document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("eventForm");
    const organizerName = document.getElementById("organizerName");
    const logoutButton = document.getElementById("logoutButton");

    const bannerInput = document.getElementById("banner");
    const bannerPreview = document.getElementById("bannerPreview");
    const bannerPreviewContainer = document.getElementById(
        "bannerPreviewContainer"
    );

    const regulamentoInput = document.getElementById("regulamento");
    const regulamentoNome = document.getElementById("regulamentoNome");

    const galeriaInput = document.getElementById("galeria");
    const galeriaNomes = document.getElementById("galeriaNomes");

    const formMessage = document.getElementById("formMessage");
    const saveButton = document.getElementById("saveButton");

    let session = null;
    let bannerPreviewUrl = null;

    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        session = data.session;

        if (!session) {
            window.location.replace("../login.html");
            return;
        }

        organizerName.textContent =
            session.user.user_metadata?.nome ||
            session.user.email ||
            "Organizador";
    } catch (error) {
        console.error("Erro ao verificar autenticação:", error);

        window.location.replace("../login.html");
        return;
    }

    logoutButton.addEventListener("click", async () => {
        try {
            await supabaseClient.auth.signOut();
        } catch (error) {
            console.error("Erro ao sair:", error);
        } finally {
            window.location.replace("../index.html");
        }
    });

    bannerInput.addEventListener("change", () => {
        limparMensagem();

        const arquivo = bannerInput.files[0];

        if (bannerPreviewUrl) {
            URL.revokeObjectURL(bannerPreviewUrl);
            bannerPreviewUrl = null;
        }

        if (!arquivo) {
            bannerPreview.removeAttribute("src");
            bannerPreviewContainer.classList.add("hidden");
            return;
        }

        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!tiposPermitidos.includes(arquivo.type)) {
            mostrarMensagem(
                "Selecione um banner em JPG, PNG ou WEBP.",
                "error"
            );

            bannerInput.value = "";
            bannerPreview.removeAttribute("src");
            bannerPreviewContainer.classList.add("hidden");
            return;
        }

        const limiteBanner = 10 * 1024 * 1024;

        if (arquivo.size > limiteBanner) {
            mostrarMensagem(
                "O banner deve ter no máximo 10 MB.",
                "error"
            );

            bannerInput.value = "";
            bannerPreview.removeAttribute("src");
            bannerPreviewContainer.classList.add("hidden");
            return;
        }

        bannerPreviewUrl = URL.createObjectURL(arquivo);

        bannerPreview.src = bannerPreviewUrl;
        bannerPreviewContainer.classList.remove("hidden");
    });

    regulamentoInput.addEventListener("change", () => {
        limparMensagem();

        const arquivo = regulamentoInput.files[0];

        if (!arquivo) {
            regulamentoNome.textContent = "";
            return;
        }

        if (arquivo.type !== "application/pdf") {
            mostrarMensagem(
                "O regulamento precisa estar em formato PDF.",
                "error"
            );

            regulamentoInput.value = "";
            regulamentoNome.textContent = "";
            return;
        }

        const limiteRegulamento = 20 * 1024 * 1024;

        if (arquivo.size > limiteRegulamento) {
            mostrarMensagem(
                "O regulamento deve ter no máximo 20 MB.",
                "error"
            );

            regulamentoInput.value = "";
            regulamentoNome.textContent = "";
            return;
        }

        regulamentoNome.textContent =
            `Arquivo selecionado: ${arquivo.name}`;
    });

    galeriaInput.addEventListener("change", () => {
        const arquivos = [...galeriaInput.files];

        galeriaNomes.textContent = arquivos.length
            ? `${arquivos.length} foto(s) selecionada(s): ${arquivos.map(a => a.name).join(", ")}`
            : "";
    });

    // ---------------------------------------------------------------
    // LOTES
    // ---------------------------------------------------------------

    const lotesContainer = document.getElementById("lotesContainer");
    const addLoteButton = document.getElementById("addLoteButton");
    const loteTemplate = document.getElementById("loteTemplate");

    function adicionarLote() {
        const clone = loteTemplate.content.cloneNode(true);

        clone
            .querySelector(".removeLoteButton")
            .addEventListener("click", function () {
                this.closest(".lote-card").remove();
                sincronizarPrecosCategorias();
            });

        clone
            .querySelector(".lote-nome")
            .addEventListener("blur", sincronizarPrecosCategorias);

        lotesContainer.appendChild(clone);
        sincronizarPrecosCategorias();
    }

    addLoteButton.addEventListener("click", adicionarLote);

    // ---------------------------------------------------------------
    // CATEGORIAS
    // ---------------------------------------------------------------

    const categoriasContainer =
        document.getElementById("categoriasContainer");

    const addCategoriaButton =
        document.getElementById("addCategoriaButton");

    const categoriaTemplate =
        document.getElementById("categoriaTemplate");

    function adicionarCategoria(dadosPreenchidos) {
        const clone =
            categoriaTemplate.content.cloneNode(true);

        clone
            .querySelector(".removeCategoriaButton")
            .addEventListener("click", function () {
                this.closest(".categoria-card").remove();
            });

        if (dadosPreenchidos) {
            clone.querySelector(".categoria-nome").value =
                dadosPreenchidos.nome || "";
            clone.querySelector(".categoria-percurso").value =
                dadosPreenchidos.percurso || "";
            clone.querySelector(".categoria-idade-min").value =
                dadosPreenchidos.idade_min || "";
            clone.querySelector(".categoria-idade-max").value =
                dadosPreenchidos.idade_max || "";
            clone.querySelector(".categoria-sexo").value =
                dadosPreenchidos.sexo || "";
        }

        categoriasContainer.appendChild(clone);

        renderPrecosParaCategoria(
            categoriasContainer.lastElementChild
        );
    }

    // -----------------------------------------------------------
    // CATEGORIAS SUGERIDAS (por modalidade)
    // -----------------------------------------------------------

    // Faixas etárias das categorias oficiais de Ciclismo Cross Country
    // (MTB) da CBC — Confederação Brasileira de Ciclismo, tabela
    // "Categorias Oficiais". "Iniciante" não é categoria oficial da
    // CBC, por isso fica sem faixa de idade definida.
    const SUGESTOES_CATEGORIAS = {
        MTB: [
            { nome: "Elite Masculino", idade_min: 23, idade_max: 29, sexo: "Masculino" },
            { nome: "Sub-30 Masculino", idade_min: 23, idade_max: 29, sexo: "Masculino" },
            { nome: "Sub-23 Masculino", idade_min: 19, idade_max: 22, sexo: "Masculino" },
            { nome: "Júnior Masculino", idade_min: 17, idade_max: 18, sexo: "Masculino" },
            { nome: "Juvenil Masculino", idade_min: 15, idade_max: 16, sexo: "Masculino" },
            { nome: "Infantojuvenil Masculino", idade_min: 12, idade_max: 14, sexo: "Masculino" },
            { nome: "Master A1 Masculino", idade_min: 30, idade_max: 34, sexo: "Masculino" },
            { nome: "Master A2 Masculino", idade_min: 35, idade_max: 39, sexo: "Masculino" },
            { nome: "Master B1 Masculino", idade_min: 40, idade_max: 44, sexo: "Masculino" },
            { nome: "Master B2 Masculino", idade_min: 45, idade_max: 49, sexo: "Masculino" },
            { nome: "Master C1 Masculino", idade_min: 50, idade_max: 54, sexo: "Masculino" },
            { nome: "Master C2 Masculino", idade_min: 55, idade_max: 59, sexo: "Masculino" },
            { nome: "Master D1 Masculino", idade_min: 60, idade_max: 64, sexo: "Masculino" },
            { nome: "Master D2 Masculino", idade_min: 65, idade_max: null, sexo: "Masculino" },
            { nome: "Elite Feminino", idade_min: 23, idade_max: null, sexo: "Feminino" },
            { nome: "Sub-23 Feminino", idade_min: 19, idade_max: 22, sexo: "Feminino" },
            { nome: "Júnior Feminino", idade_min: 17, idade_max: 18, sexo: "Feminino" },
            { nome: "Juvenil Feminino", idade_min: 15, idade_max: 16, sexo: "Feminino" },
            { nome: "Infantojuvenil Feminino", idade_min: 12, idade_max: 14, sexo: "Feminino" },
            { nome: "Master A Feminino", idade_min: 30, idade_max: 39, sexo: "Feminino" },
            { nome: "Master B Feminino", idade_min: 40, idade_max: 49, sexo: "Feminino" },
            { nome: "Master C Feminino", idade_min: 50, idade_max: null, sexo: "Feminino" },
            { nome: "Iniciante Masculino", idade_min: null, idade_max: null, sexo: "Masculino" },
            { nome: "Iniciante Feminino", idade_min: null, idade_max: null, sexo: "Feminino" }
        ]
    };

    const modalidadeSelect = document.getElementById("modalidade");
    const categoriasSugeridas = document.getElementById("categoriasSugeridas");
    const listaCategoriasSugeridas = document.getElementById(
        "listaCategoriasSugeridas"
    );
    const addCategoriasSugeridasButton = document.getElementById(
        "addCategoriasSugeridasButton"
    );

    function formatarFaixaSugestao(sugestao) {
        if (!sugestao.idade_min && !sugestao.idade_max) {
            return "Todas as idades";
        }

        return `${sugestao.idade_min || 0}–${sugestao.idade_max || "+"} anos`;
    }

    function renderCategoriasSugeridas() {
        const sugestoes = SUGESTOES_CATEGORIAS[modalidadeSelect.value];

        if (!sugestoes) {
            categoriasSugeridas.classList.add("hidden");
            listaCategoriasSugeridas.innerHTML = "";
            return;
        }

        listaCategoriasSugeridas.innerHTML = sugestoes
            .map(
                (sugestao, index) => `
                    <label class="checkbox-card categoria-sugerida-item">
                        <input
                            type="checkbox"
                            class="categoria-sugerida-checkbox"
                            data-index="${index}">
                        <span>
                            <strong>${escaparHTML(sugestao.nome)}</strong>
                            <small>${formatarFaixaSugestao(sugestao)}</small>
                        </span>
                    </label>
                `
            )
            .join("");

        categoriasSugeridas.classList.remove("hidden");
    }

    modalidadeSelect.addEventListener("change", renderCategoriasSugeridas);

    addCategoriasSugeridasButton.addEventListener("click", () => {
        const sugestoes = SUGESTOES_CATEGORIAS[modalidadeSelect.value] || [];

        const checkboxesMarcados = [
            ...listaCategoriasSugeridas.querySelectorAll(
                ".categoria-sugerida-checkbox:checked"
            )
        ];

        checkboxesMarcados.forEach(checkbox => {
            adicionarCategoria(sugestoes[Number(checkbox.dataset.index)]);
        });

        renderCategoriasSugeridas();
    });

    function renderPrecosParaCategoria(card) {
        const loteCards = [
            ...lotesContainer.querySelectorAll(".lote-card")
        ];

        const precosContainer = card.querySelector(
            ".categoria-precos-container"
        );

        const valoresAntigos = [
            ...precosContainer.querySelectorAll(".categoria-preco")
        ].map(input => input.value);

        if (loteCards.length === 0) {
            precosContainer.innerHTML =
                '<p class="section-description">Adicione um lote acima para definir o preço.</p>';
            return;
        }

        precosContainer.innerHTML = loteCards
            .map((loteCard, index) => {
                const nomeLote =
                    loteCard.querySelector(".lote-nome").value.trim() ||
                    `Lote ${index + 1}`;

                const valorAnterior = valoresAntigos[index] || "";

                return `
                    <div class="form-group">
                        <label>Preço — ${escaparHTML(nomeLote)}</label>
                        <input
                            type="number"
                            class="categoria-preco"
                            min="0"
                            step="0.01"
                            value="${valorAnterior}">
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

    addCategoriaButton.addEventListener(
        "click",
        () => adicionarCategoria()
    );

    adicionarLote();
    adicionarCategoria();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        limparMensagem();

        const nome = document.getElementById("nome").value.trim();
        const modalidade =
            document.getElementById("modalidade").value;
        const descricao =
            document.getElementById("descricao").value.trim();

        const dataEvento =
            document.getElementById("dataEvento").value;
        const horarioEvento =
            document.getElementById("horarioEvento").value;

        const endereco =
            document.getElementById("endereco").value.trim();
        const cidade =
            document.getElementById("cidade").value.trim();
        const estado =
            document.getElementById("estado").value;
        const localizacaoUrl =
            document.getElementById("localizacaoUrl").value.trim();

        const organizadorContato =
            document.getElementById("organizadorContato").value.trim();
        const organizadorInstagram =
            document.getElementById("organizadorInstagram").value.trim();

        const valorTexto =
            document.getElementById("valor").value;
        const vagasTexto =
            document.getElementById("vagas").value;

        const informacoesPagamento =
            document.getElementById("informacoesPagamento").value.trim();

        const inscricoesAbertas =
            document.getElementById("inscricoesAbertas").checked;

        const destaque =
            document.getElementById("destaque").checked;

        const bannerFile = bannerInput.files[0] || null;
        const regulamentoFile =
            regulamentoInput.files[0] || null;
        const galeriaFiles = [...galeriaInput.files];

        const lotes = [];

        lotesContainer.querySelectorAll(".lote-card").forEach(card => {
            lotes.push({
                nome: card.querySelector(".lote-nome").value.trim(),
                data_inicio: card.querySelector(".lote-data-inicio").value || null,
                data_limite: card.querySelector(".lote-data-limite").value
            });
        });

        const lotesValidos = lotes.filter(
            lote => lote.nome && lote.data_limite
        );

        const categorias = [];

        document
            .querySelectorAll(".categoria-card")
            .forEach(card => {
                const precos = [
                    ...card.querySelectorAll(".categoria-preco")
                ].map(input => Number(input.value || 0));

                categorias.push({
                    nome: card.querySelector(".categoria-nome").value.trim(),
                    percurso: card.querySelector(".categoria-percurso").value.trim(),
                    idade_min: Number(
                        card.querySelector(".categoria-idade-min").value || 0
                    ),
                    idade_max: Number(
                        card.querySelector(".categoria-idade-max").value || 0
                    ),
                    sexo: card.querySelector(".categoria-sexo").value,
                    precos
                });
            });

        if (
            !nome ||
            !modalidade ||
            !dataEvento ||
            !endereco ||
            !cidade ||
            !estado ||
            valorTexto === "" ||
            vagasTexto === "" ||
            !informacoesPagamento
        ) {
            mostrarMensagem(
                "Preencha todos os campos obrigatórios.",
                "error"
            );
            return;
        }

        const valor = Number(valorTexto);
        const vagas = Number(vagasTexto);

        if (!Number.isFinite(valor) || valor < 0) {
            mostrarMensagem(
                "Informe um valor de inscrição válido.",
                "error"
            );
            return;
        }

        if (!Number.isInteger(vagas) || vagas < 0) {
            mostrarMensagem(
                "Informe um número de vagas válido.",
                "error"
            );
            return;
        }

        if (lotesValidos.length === 0) {
            mostrarMensagem(
                "Adicione pelo menos um lote (nome e data limite).",
                "error"
            );
            return;
        }

        const categoriasValidas = categorias.filter(categoria =>
            categoria.nome !== ""
        );

        if (categoriasValidas.length === 0) {
            mostrarMensagem(
                "Adicione pelo menos uma categoria.",
                "error"
            );
            return;
        }

        if (!bannerFile) {
            mostrarMensagem(
                "Selecione um banner para o evento.",
                "error"
            );
            return;
        }

        ativarCarregamento(true);

        let bannerUrl = null;
        let regulamentoUrl = null;

        try {
            atualizarBotao("Enviando banner...");

            bannerUrl = await uploadBanner(
                bannerFile,
                session.user.id
            );

            if (regulamentoFile) {
                atualizarBotao("Enviando regulamento...");

                regulamentoUrl = await uploadRegulamento(
                    regulamentoFile,
                    session.user.id
                );
            }

            const galeriaUrls = [];

            if (galeriaFiles.length > 0) {
                atualizarBotao("Enviando fotos...");

                for (const arquivo of galeriaFiles) {
                    const url = await uploadBanner(
                        arquivo,
                        session.user.id
                    );

                    galeriaUrls.push(url);
                }
            }

            atualizarBotao("Salvando evento...");

            const slugBase = gerarSlug(nome);
            const slug = `${slugBase}-${Date.now()}`;

            const novoEvento = {
                nome,
                slug,
                modalidade,
                cidade,
                estado,
                data_evento: dataEvento,
                descricao: descricao || null,
                banner_url: bannerUrl,
                valor,
                destaque,
                status: "pendente",
                organizador_id: session.user.id,
                endereco,
                horario_evento: horarioEvento || null,
                regulamento_url: regulamentoUrl,
                vagas,
                inscricoes_abertas: inscricoesAbertas,
                informacoes_pagamento: informacoesPagamento,
                localizacao_url: localizacaoUrl || null,
                organizador_contato: organizadorContato || null,
                organizador_instagram: organizadorInstagram || null
            };

            const { data: eventoCriado, error } =
                await supabaseClient
                    .from("eventos")
                    .insert(novoEvento)
                    .select()
                    .single();

            if (error) {
                throw error;
            }

            const lotesInsert = lotesValidos.map((lote, index) => ({
                evento_id: eventoCriado.id,
                nome: lote.nome,
                data_inicio: lote.data_inicio,
                data_limite: lote.data_limite,
                ordem: index + 1
            }));

            const { data: lotesCriados, error: lotesError } =
                await supabaseClient
                    .from("lotes")
                    .insert(lotesInsert)
                    .select();

            if (lotesError) {
                throw lotesError;
            }

            const lotesOrdenados = [...lotesCriados].sort(
                (a, b) => a.ordem - b.ordem
            );

            const categoriasInsert = categoriasValidas.map((categoria, index) => ({
                evento_id: eventoCriado.id,
                nome: categoria.nome,
                percurso: categoria.percurso || null,
                valor: categoria.precos[0] || 0,
                limite_inscritos: null,
                idade_min: categoria.idade_min,
                idade_max: categoria.idade_max,
                sexo: categoria.sexo || null,
                ordem: index + 1
            }));

            const { data: categoriasCriadas, error: categoriaError } =
                await supabaseClient
                    .from("categorias")
                    .insert(categoriasInsert)
                    .select();

            if (categoriaError) {
                throw categoriaError;
            }

            const categoriasOrdenadas = [...categoriasCriadas].sort(
                (a, b) => a.ordem - b.ordem
            );

            const precosInsert = [];

            categoriasOrdenadas.forEach((categoriaCriada, indexCategoria) => {
                const precosDaCategoria =
                    categoriasValidas[indexCategoria].precos;

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
                const galeriaInsert = galeriaUrls.map((url, index) => ({
                    evento_id: eventoCriado.id,
                    url,
                    ordem: index + 1
                }));

                const { error: galeriaError } = await supabaseClient
                    .from("evento_banners")
                    .insert(galeriaInsert);

                if (galeriaError) {
                    throw galeriaError;
                }
            }

            mostrarMensagem(
                "Seu evento foi enviado para aprovação e ficará " +
                    "visível assim que for aprovado pelo administrador.",
                "success"
            );

            form.reset();
            regulamentoNome.textContent = "";
            galeriaNomes.textContent = "";
            bannerPreview.removeAttribute("src");
            bannerPreviewContainer.classList.add("hidden");

            if (bannerPreviewUrl) {
                URL.revokeObjectURL(bannerPreviewUrl);
                bannerPreviewUrl = null;
            }

            atualizarBotao("Enviado para aprovação!");

            setTimeout(() => {
                window.location.href = "eventos.html";
            }, 2400);
        } catch (error) {
            console.error("Erro ao criar evento:", error);

            mostrarMensagem(
                error.message ||
                    "Não foi possível criar o evento.",
                "error"
            );

            ativarCarregamento(false);
        }
    });

    function mostrarMensagem(texto, tipo) {
        formMessage.textContent = texto;
        formMessage.className = `form-message ${tipo}`;
    }

    function limparMensagem() {
        formMessage.textContent = "";
        formMessage.className = "form-message";
    }

    function atualizarBotao(texto) {
        saveButton.textContent = texto;
    }

    function ativarCarregamento(ativo) {
        saveButton.disabled = ativo;

        if (ativo) {
            atualizarBotao("Salvando...");
            saveButton.setAttribute("aria-busy", "true");
        } else {
            atualizarBotao("Salvar evento");
            saveButton.removeAttribute("aria-busy");
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
});
