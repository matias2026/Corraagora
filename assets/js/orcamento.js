const WHATSAPP_NUMERO = "5584994419499";

const quoteForm = document.getElementById("quoteForm");

quoteForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const nome = document.getElementById("quoteNome").value.trim();
    const email = document.getElementById("quoteEmail").value.trim();
    const telefone = document.getElementById("quoteTelefone").value.trim();
    const tipo = document.getElementById("quoteTipo").value;
    const cidade = document.getElementById("quoteCidade").value.trim();
    const participantes = document.getElementById("quoteParticipantes").value.trim();
    const mensagem = document.getElementById("quoteMensagem").value.trim();

    const linhas = [
        "Olá! Gostaria de pedir um orçamento para um evento na CorraAgora.",
        "",
        `Nome: ${nome}`,
        `E-mail: ${email}`
    ];

    if (telefone) linhas.push(`Telefone: ${telefone}`);
    linhas.push(`Tipo de evento: ${tipo}`);
    if (cidade) linhas.push(`Cidade prevista: ${cidade}`);
    if (participantes) linhas.push(`Participantes estimados: ${participantes}`);
    if (mensagem) linhas.push("", `Detalhes: ${mensagem}`);

    const texto = encodeURIComponent(linhas.join("\n"));

    window.open(
        `https://wa.me/${WHATSAPP_NUMERO}?text=${texto}`,
        "_blank",
        "noopener,noreferrer"
    );
});
