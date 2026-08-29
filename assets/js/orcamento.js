const WHATSAPP_NUMERO = "5584994419499";

// Preencha com os valores da sua conta em emailjs.com:
// Email Services > seu serviço  |  Email Templates > seu template  |  Account > General
const EMAILJS_SERVICE_ID = "service_r5tgeeg";
const EMAILJS_TEMPLATE_ID = "template_m3k0jh4";
const EMAILJS_PUBLIC_KEY = "qBdjLquGDY1c09t_-";

if (window.emailjs && EMAILJS_PUBLIC_KEY !== "COLE_AQUI_A_PUBLIC_KEY") {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

function ehDispositivoMovel() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

const quoteForm = document.getElementById("quoteForm");
const quoteSubmitButton = document.getElementById("quoteSubmitButton");
const quoteMessage = document.getElementById("quoteMessage");

const quoteNomeInput = document.getElementById("quoteNome");
const quoteEmailInput = document.getElementById("quoteEmail");
const quoteTelefoneInput = document.getElementById("quoteTelefone");

window.ativarRevalidacaoAoDigitar?.(quoteNomeInput, (input) =>
    window.validarCampoObrigatorio(input, "Digite seu nome completo.")
);

window.ativarRevalidacaoAoDigitar?.(quoteEmailInput, (input) =>
    window.validarCampoEmail(input)
);

window.ativarRevalidacaoAoDigitar?.(quoteTelefoneInput, (input) =>
    window.validarCampoObrigatorio(input, "Digite um telefone para contato.")
);

quoteForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    limparMensagem();

    const nomeValido = window.validarCampoObrigatorio(
        quoteNomeInput,
        "Digite seu nome completo."
    );
    const emailValido = window.validarCampoEmail(quoteEmailInput);
    const telefoneValido = window.validarCampoObrigatorio(
        quoteTelefoneInput,
        "Digite um telefone para contato."
    );

    if (!nomeValido || !emailValido || !telefoneValido) {
        window.mostrarToast(
            "Preencha todos os campos obrigatórios antes de enviar.",
            "erro"
        );
        return;
    }

    const dados = {
        nome: quoteNomeInput.value.trim(),
        email: quoteEmailInput.value.trim(),
        telefone: quoteTelefoneInput.value.trim(),
        tipo: document.getElementById("quoteTipo").value,
        cidade: document.getElementById("quoteCidade").value.trim(),
        participantes: document.getElementById("quoteParticipantes").value.trim(),
        mensagem: document.getElementById("quoteMensagem").value.trim()
    };

    if (ehDispositivoMovel()) {
        enviarPeloWhatsapp(dados);
        return;
    }

    await enviarPorEmail(dados);
});

function enviarPeloWhatsapp(dados) {
    const linhas = [
        "Olá! Gostaria de pedir um orçamento para um evento na CorraAgora.",
        "",
        `Nome: ${dados.nome}`,
        `E-mail: ${dados.email}`
    ];

    if (dados.telefone) linhas.push(`Telefone: ${dados.telefone}`);
    linhas.push(`Tipo de evento: ${dados.tipo}`);
    if (dados.cidade) linhas.push(`Cidade prevista: ${dados.cidade}`);
    if (dados.participantes) linhas.push(`Participantes estimados: ${dados.participantes}`);
    if (dados.mensagem) linhas.push("", `Detalhes: ${dados.mensagem}`);

    const texto = encodeURIComponent(linhas.join("\n"));

    window.open(
        `https://wa.me/${WHATSAPP_NUMERO}?text=${texto}`,
        "_blank",
        "noopener,noreferrer"
    );

    window.mostrarToast?.(
        "Abrindo o WhatsApp com sua mensagem pronta!",
        "sucesso"
    );

    quoteForm.reset();
}

async function enviarPorEmail(dados) {
    if (
        !window.emailjs ||
        EMAILJS_SERVICE_ID === "COLE_AQUI_O_SERVICE_ID" ||
        EMAILJS_TEMPLATE_ID === "COLE_AQUI_O_TEMPLATE_ID" ||
        EMAILJS_PUBLIC_KEY === "COLE_AQUI_A_PUBLIC_KEY"
    ) {
        mostrarMensagem(
            "O envio por e-mail ainda não foi configurado. " +
                `Fale com a gente pelo WhatsApp: ${formatarTelefoneExibicao()}.`,
            "error"
        );
        return;
    }

    ativarCarregamento(true);

    try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            from_name: dados.nome,
            from_email: dados.email,
            phone: dados.telefone || "Não informado",
            event_type: dados.tipo,
            city: dados.cidade || "Não informada",
            participants: dados.participantes || "Não informado",
            message: dados.mensagem || "Sem detalhes adicionais."
        });

        mostrarMensagem(
            "Pedido enviado! Vamos entrar em contato em breve.",
            "success"
        );

        quoteForm.reset();
    } catch (error) {
        console.error("Erro ao enviar orçamento por e-mail:", error);

        mostrarMensagem(
            "Não foi possível enviar agora. Tente de novo ou fale " +
                `pelo WhatsApp: ${formatarTelefoneExibicao()}.`,
            "error"
        );
    } finally {
        ativarCarregamento(false);
    }
}

function formatarTelefoneExibicao() {
    return "(84) 99441-9499";
}

function mostrarMensagem(texto, tipo) {
    quoteMessage.textContent = texto;
    quoteMessage.className = `quote-form-message ${tipo}`;

    window.mostrarToast?.(
        texto,
        tipo === "success" ? "sucesso" : "erro"
    );
}

function limparMensagem() {
    quoteMessage.textContent = "";
    quoteMessage.className = "quote-form-message";
}

function ativarCarregamento(ativo) {
    quoteSubmitButton.disabled = ativo;
    quoteSubmitButton.textContent = ativo
        ? "Enviando..."
        : "Enviar pedido de orçamento";
}
