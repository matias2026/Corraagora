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

    window.aplicarMascaraData(document.getElementById("dataEvento"));
    window.aplicarMascaraHora(document.getElementById("horarioEvento"));

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

        const { data: perfil } = await supabaseClient
            .from("profiles")
            .select("role, status_organizador")
            .eq("id", session.user.id)
            .maybeSingle();

        if (
            perfil?.role === "organizador" &&
            perfil?.status_organizador !== "aprovado"
        ) {
            window.location.replace("../aguardando-aprovacao.html");
            return;
        }

        if (perfil?.role !== "organizador" && perfil?.role !== "admin") {
            window.location.replace("../minhas-inscricoes.html");
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

        clone
            .querySelector(".lote-valor")
            .addEventListener("input", sincronizarPrecosCategorias);

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

    // Categorias não oficiais comuns em provas amadoras populares no
    // Brasil (Iniciante, Open, PCD), sem faixa de idade definida por
    // nenhuma confederação — usadas em toda modalidade.
    const CATEGORIAS_NAO_OFICIAIS = [
        { nome: "Iniciante Masculino", idade_min: null, idade_max: null, sexo: "Masculino", oficial: false },
        { nome: "Iniciante Feminino", idade_min: null, idade_max: null, sexo: "Feminino", oficial: false },
        { nome: "Open Masculino", idade_min: null, idade_max: null, sexo: "Masculino", oficial: false },
        { nome: "Open Feminino", idade_min: null, idade_max: null, sexo: "Feminino", oficial: false },
        { nome: "PCD", idade_min: null, idade_max: null, sexo: "", oficial: false }
    ];

    // Faixas etárias das categorias oficiais de Ciclismo Estrada e
    // Ciclismo Cross Country (MTB) da CBC — Confederação Brasileira
    // de Ciclismo, tabela "Categorias Oficiais". A CBC usa a mesma
    // tabela para as duas modalidades, com uma exceção: aqui o Elite
    // é 19+ no Ciclismo de estrada e livre (sem restrição de idade)
    // no MTB, em vez do "23 anos acima" oficial da CBC.
    //
    // Categoria oficial -> Percurso Pro. Não oficial -> Percurso Sport.
    const CATEGORIAS_CICLISMO_BASE = [
        { nome: "Sub-30 Masculino", idade_min: 23, idade_max: 29, sexo: "Masculino", oficial: true },
        { nome: "Sub-23 Masculino", idade_min: 19, idade_max: 22, sexo: "Masculino", oficial: true },
        { nome: "Júnior Masculino", idade_min: 17, idade_max: 18, sexo: "Masculino", oficial: true },
        { nome: "Juvenil Masculino", idade_min: 15, idade_max: 16, sexo: "Masculino", oficial: true },
        { nome: "Infantojuvenil Masculino", idade_min: 12, idade_max: 14, sexo: "Masculino", oficial: true },
        { nome: "Master A1 Masculino", idade_min: 30, idade_max: 34, sexo: "Masculino", oficial: true },
        { nome: "Master A2 Masculino", idade_min: 35, idade_max: 39, sexo: "Masculino", oficial: true },
        { nome: "Master B1 Masculino", idade_min: 40, idade_max: 44, sexo: "Masculino", oficial: true },
        { nome: "Master B2 Masculino", idade_min: 45, idade_max: 49, sexo: "Masculino", oficial: true },
        { nome: "Master C1 Masculino", idade_min: 50, idade_max: 54, sexo: "Masculino", oficial: true },
        { nome: "Master C2 Masculino", idade_min: 55, idade_max: 59, sexo: "Masculino", oficial: true },
        { nome: "Master D1 Masculino", idade_min: 60, idade_max: 64, sexo: "Masculino", oficial: true },
        { nome: "Master D2 Masculino", idade_min: 65, idade_max: null, sexo: "Masculino", oficial: true },
        { nome: "Sub-23 Feminino", idade_min: 19, idade_max: 22, sexo: "Feminino", oficial: true },
        { nome: "Júnior Feminino", idade_min: 17, idade_max: 18, sexo: "Feminino", oficial: true },
        { nome: "Juvenil Feminino", idade_min: 15, idade_max: 16, sexo: "Feminino", oficial: true },
        { nome: "Infantojuvenil Feminino", idade_min: 12, idade_max: 14, sexo: "Feminino", oficial: true },
        { nome: "Master A Feminino", idade_min: 30, idade_max: 39, sexo: "Feminino", oficial: true },
        { nome: "Master B Feminino", idade_min: 40, idade_max: 49, sexo: "Feminino", oficial: true },
        { nome: "Master C Feminino", idade_min: 50, idade_max: null, sexo: "Feminino", oficial: true },
        ...CATEGORIAS_NAO_OFICIAIS
    ];

    const CATEGORIAS_MTB = [
        { nome: "Elite Masculino", idade_min: null, idade_max: null, sexo: "Masculino", oficial: true },
        { nome: "Elite Feminino", idade_min: null, idade_max: null, sexo: "Feminino", oficial: true },
        ...CATEGORIAS_CICLISMO_BASE,
        { nome: "Turismo A", idade_min: 19, idade_max: 39, sexo: "", oficial: false },
        { nome: "Turismo B", idade_min: 39, idade_max: null, sexo: "", oficial: false }
    ];

    const CATEGORIAS_ESTRADA = [
        { nome: "Elite Masculino", idade_min: 19, idade_max: null, sexo: "Masculino", oficial: true },
        { nome: "Elite Feminino", idade_min: 19, idade_max: null, sexo: "Feminino", oficial: true },
        ...CATEGORIAS_CICLISMO_BASE
    ];

    // Atletismo (Corrida, Trail Run): aqui não usamos categoria por
    // idade — essa segmentação (Adulto, Master etc.) é da norma da
    // CBAt e vale para provas federadas. Nas provas deste site o
    // atleta escolhe direto a distância que vai correr, por isso a
    // "categoria sugerida" é a própria distância.
    const CATEGORIAS_ATLETISMO = [
        { nome: "5km" },
        { nome: "10km" },
        { nome: "21km" }
    ];

    const GRUPO_CICLISMO = ["MTB", "Speed"];

    const SUGESTOES_CATEGORIAS = {
        MTB: CATEGORIAS_MTB,
        Speed: CATEGORIAS_ESTRADA,
        Corrida: CATEGORIAS_ATLETISMO,
        "Trail Run": CATEGORIAS_ATLETISMO
    };

    const modalidadeSelect = document.getElementById("modalidade");
    const categoriasSugeridas = document.getElementById("categoriasSugeridas");
    const percursoCiclismo = document.getElementById("percursoCiclismo");
    const distanciaPersonalizadaWrapper = document.getElementById(
        "distanciaPersonalizadaWrapper"
    );
    const distanciaPersonalizadaInput = document.getElementById(
        "distanciaPersonalizada"
    );
    const distanciaPersonalizadaNivel = document.getElementById(
        "distanciaPersonalizadaNivel"
    );
    const addDistanciaPersonalizadaButton = document.getElementById(
        "addDistanciaPersonalizadaButton"
    );
    const listaCategoriasSugeridas = document.getElementById(
        "listaCategoriasSugeridas"
    );
    const addCategoriasSugeridasButton = document.getElementById(
        "addCategoriasSugeridasButton"
    );

    function formatarFaixaSugestao(sugestao) {
        const percurso = sugestao.oficial ? "Percurso Pro" : "Percurso Sport";

        if (!sugestao.idade_min && !sugestao.idade_max) {
            return `${percurso} · Todas as idades`;
        }

        return `${percurso} · ${sugestao.idade_min || 0}–${sugestao.idade_max || "+"} anos`;
    }

    function calcularPercurso(sugestao) {
        const nomePercurso = sugestao.oficial ? "Pro" : "Sport";

        const distancia = document.getElementById(
            sugestao.oficial ? "distanciaPro" : "distanciaSport"
        ).value;

        return distancia
            ? `${nomePercurso} (${distancia} km)`
            : nomePercurso;
    }

    function renderCategoriasSugeridas() {
        const modalidade = modalidadeSelect.value;
        const sugestoes = SUGESTOES_CATEGORIAS[modalidade];

        if (!sugestoes) {
            categoriasSugeridas.classList.add("hidden");
            listaCategoriasSugeridas.innerHTML = "";
            return;
        }

        const ehCiclismo = GRUPO_CICLISMO.includes(modalidade);

        percursoCiclismo.classList.toggle("hidden", !ehCiclismo);
        distanciaPersonalizadaWrapper.classList.toggle("hidden", ehCiclismo);
        listaCategoriasSugeridas.classList.toggle(
            "categorias-sugeridas-lista--atletismo",
            !ehCiclismo
        );

        listaCategoriasSugeridas.innerHTML = sugestoes
            .map((sugestao, index) => {
                if (ehCiclismo) {
                    return `
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
                    `;
                }

                return `
                    <div class="categoria-sugerida-item-atletismo">
                        <label class="checkbox-inline">
                            <input
                                type="checkbox"
                                class="categoria-sugerida-checkbox"
                                data-index="${index}">
                            <strong>${escaparHTML(sugestao.nome)}</strong>
                        </label>

                        <select
                            class="categoria-sugerida-nivel"
                            data-index="${index}">
                            <option value="">Sem nível</option>
                            <option value="Iniciante">Iniciante</option>
                            <option value="Intermediário">Intermediário</option>
                            <option value="Avançado">Avançado</option>
                        </select>
                    </div>
                `;
            })
            .join("");

        categoriasSugeridas.classList.remove("hidden");
    }

    modalidadeSelect.addEventListener("change", renderCategoriasSugeridas);

    addCategoriasSugeridasButton.addEventListener("click", () => {
        const modalidade = modalidadeSelect.value;
        const sugestoes = SUGESTOES_CATEGORIAS[modalidade] || [];
        const ehCiclismo = GRUPO_CICLISMO.includes(modalidade);

        const checkboxesMarcados = [
            ...listaCategoriasSugeridas.querySelectorAll(
                ".categoria-sugerida-checkbox:checked"
            )
        ];

        checkboxesMarcados.forEach(checkbox => {
            const sugestao = sugestoes[Number(checkbox.dataset.index)];

            if (ehCiclismo) {
                adicionarCategoria({
                    ...sugestao,
                    percurso: calcularPercurso(sugestao)
                });
                return;
            }

            const nivelSelect = listaCategoriasSugeridas.querySelector(
                `.categoria-sugerida-nivel[data-index="${checkbox.dataset.index}"]`
            );

            adicionarCategoria({
                ...sugestao,
                percurso: nivelSelect?.value || undefined
            });
        });

        renderCategoriasSugeridas();
    });

    addDistanciaPersonalizadaButton.addEventListener("click", () => {
        const distancia = distanciaPersonalizadaInput.value.trim();

        if (!distancia) return;

        adicionarCategoria({
            nome: distancia,
            percurso: distanciaPersonalizadaNivel.value || undefined
        });

        distanciaPersonalizadaInput.value = "";
        distanciaPersonalizadaNivel.value = "";
    });

    function renderPrecosParaCategoria(card) {
        const loteCards = [
            ...lotesContainer.querySelectorAll(".lote-card")
        ];

        const precosContainer = card.querySelector(
            ".categoria-precos-container"
        );

        if (loteCards.length === 0) {
            precosContainer.innerHTML =
                '<p class="section-description">Adicione um lote acima e defina o valor — ele vale para esta e para todas as outras categorias.</p>';
            return;
        }

        precosContainer.innerHTML = loteCards
            .map((loteCard, index) => {
                const nomeLote =
                    loteCard.querySelector(".lote-nome").value.trim() ||
                    `Lote ${index + 1}`;

                const valorLote = Number(
                    loteCard.querySelector(".lote-valor").value || 0
                );

                return `
                    <div class="form-group">
                        <label>Preço — ${escaparHTML(nomeLote)}</label>
                        <strong>${formatarMoeda(valorLote)}</strong>
                    </div>
                `;
            })
            .join("");
    }

    function formatarMoeda(valor) {
        return valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
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

        const chavePix =
            document.getElementById("chavePix").value.trim();

        const informacoesPagamento =
            document.getElementById("informacoesPagamento").value.trim();

        const linkPagamento =
            document.getElementById("linkPagamento").value.trim();

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
                data_limite: card.querySelector(".lote-data-limite").value,
                valor: Number(card.querySelector(".lote-valor").value || 0)
            });
        });

        const lotesValidos = lotes.filter(
            lote => lote.nome && lote.data_limite
        );

        const categorias = [];

        document
            .querySelectorAll(".categoria-card")
            .forEach(card => {
                categorias.push({
                    nome: card.querySelector(".categoria-nome").value.trim(),
                    percurso: card.querySelector(".categoria-percurso").value.trim(),
                    idade_min: Number(
                        card.querySelector(".categoria-idade-min").value || 0
                    ),
                    idade_max: Number(
                        card.querySelector(".categoria-idade-max").value || 0
                    ),
                    sexo: card.querySelector(".categoria-sexo").value
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
            vagasTexto === ""
        ) {
            mostrarMensagem(
                "Preencha todos os campos obrigatórios.",
                "error"
            );
            return;
        }

        if (!window.validarData(dataEvento)) {
            mostrarMensagem(
                "Digite uma data válida no formato DD/MM/AAAA.",
                "error"
            );
            return;
        }

        if (horarioEvento && !window.validarHora(horarioEvento)) {
            mostrarMensagem(
                "Digite um horário válido no formato HH:MM.",
                "error"
            );
            return;
        }

        if (!chavePix && !informacoesPagamento && !linkPagamento) {
            mostrarMensagem(
                "Informe pelo menos uma forma de pagamento: chave PIX, " +
                    "instruções de pagamento ou link de pagamento.",
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
                data_evento: window.converterDataBRparaISO(dataEvento),
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
                informacoes_pagamento: informacoesPagamento || null,
                chave_pix: chavePix || null,
                link_pagamento: linkPagamento || null,
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
                valor: lotesValidos[0]?.valor || 0,
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

            categoriasOrdenadas.forEach(categoriaCriada => {
                lotesOrdenados.forEach((loteCriado, indexLote) => {
                    precosInsert.push({
                        categoria_id: categoriaCriada.id,
                        lote_id: loteCriado.id,
                        valor: lotesValidos[indexLote]?.valor || 0
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

    // ==========================================================================
    // WIZARD (etapas do formulário)
    // ==========================================================================

    const wizardSteps = Array.from(
        form.querySelectorAll(".wizard-step")
    );
    const totalEtapas = wizardSteps.length;

    const wizardBackButton = document.getElementById("wizardBackButton");
    const wizardNextButton = document.getElementById("wizardNextButton");
    const wizardCancelLink = document.getElementById("wizardCancelLink");
    const wizardProgressLabel = document.getElementById(
        "wizardProgressLabel"
    );
    const wizardProgressFill = document.getElementById(
        "wizardProgressFill"
    );

    let etapaAtual = 1;

    function irParaEtapa(numero) {
        etapaAtual = Math.min(Math.max(numero, 1), totalEtapas);

        wizardSteps.forEach((step) => {
            step.classList.toggle(
                "active",
                Number(step.dataset.step) === etapaAtual
            );
        });

        const primeiraEtapa = etapaAtual === 1;
        const ultimaEtapa = etapaAtual === totalEtapas;

        wizardBackButton.classList.toggle("hidden", primeiraEtapa);
        wizardCancelLink.classList.toggle("hidden", !primeiraEtapa);
        wizardNextButton.classList.toggle("hidden", ultimaEtapa);
        saveButton.classList.toggle("hidden", !ultimaEtapa);

        wizardProgressLabel.textContent = `Passo ${etapaAtual} de ${totalEtapas}`;
        wizardProgressFill.style.width = `${
            (etapaAtual / totalEtapas) * 100
        }%`;

        form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function validarEtapaAtual() {
        const etapaEl = wizardSteps[etapaAtual - 1];
        const invalido = etapaEl.querySelector(":invalid");

        if (invalido) {
            invalido.reportValidity();
            invalido.focus();
            return false;
        }

        return true;
    }

    wizardNextButton.addEventListener("click", () => {
        if (!validarEtapaAtual()) return;
        irParaEtapa(etapaAtual + 1);
    });

    wizardBackButton.addEventListener("click", () => {
        irParaEtapa(etapaAtual - 1);
    });

    irParaEtapa(1);

    // Corrige o teclado virtual do celular encobrindo o campo em foco.
    // Só rola se o campo estiver de fato escondido atrás do teclado, e
    // calcula a distância exata em vez de um "chute". Confere assim que
    // foca (com um pequeno delay) e de novo quando o teclado terminar
    // de abrir/redimensionar o viewport (o "resize" cobre o caso do
    // teclado demorar mais que o delay inicial pra abrir).
    form.addEventListener("focusin", (evento) => {
        const alvo = evento.target;

        if (!alvo.matches("input, select, textarea")) return;

        if (!window.visualViewport) {
            setTimeout(() => {
                alvo.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
            return;
        }

        const ajustarScroll = () => {
            setTimeout(() => {
                const rect = alvo.getBoundingClientRect();
                const alturaVisivel = window.visualViewport.height;

                // Margem de tolerância de 30px: no Chrome mobile o
                // teclado às vezes reporta a altura do viewport um
                // pouco antes de estabilizar de vez, deixando o campo
                // colado bem na borda mesmo sem "rect.bottom >
                // alturaVisivel" estritamente. Disparando um pouco
                // antes evita esse coladinho.
                if (rect.bottom > alturaVisivel - 30) {
                    window.scrollBy({
                        top: rect.bottom - alturaVisivel + 140,
                        behavior: "smooth"
                    });
                }
            }, 200);
        };

        ajustarScroll();
        window.visualViewport.addEventListener("resize", ajustarScroll, {
            once: true
        });
    });
});
