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
            window.location.replace("../login.html");
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

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        limparMensagem();

        const nome = document.getElementById("nome").value.trim();
        const modalidade =
            document.getElementById("modalidade").value;
        const status =
            document.getElementById("status").value;
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

        const valorTexto =
            document.getElementById("valor").value;
        const vagasTexto =
            document.getElementById("vagas").value;

        const inscricoesAbertas =
            document.getElementById("inscricoesAbertas").checked;

        const destaque =
            document.getElementById("destaque").checked;

        const bannerFile = bannerInput.files[0] || null;
        const regulamentoFile =
            regulamentoInput.files[0] || null;

        if (
            !nome ||
            !modalidade ||
            !status ||
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
                status,
                organizador_id: session.user.id,
                endereco,
                horario_evento: horarioEvento || null,
                regulamento_url: regulamentoUrl,
                vagas,
                inscricoes_abertas: inscricoesAbertas
            };

            const { error } = await supabaseClient
                .from("eventos")
                .insert(novoEvento);

            if (error) {
                throw error;
            }

            mostrarMensagem(
                "Evento criado com sucesso!",
                "success"
            );

            form.reset();
            regulamentoNome.textContent = "";
            bannerPreview.removeAttribute("src");
            bannerPreviewContainer.classList.add("hidden");

            if (bannerPreviewUrl) {
                URL.revokeObjectURL(bannerPreviewUrl);
                bannerPreviewUrl = null;
            }

            atualizarBotao("Evento criado!");

            setTimeout(() => {
                window.location.href = "eventos.html";
            }, 1200);
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
});