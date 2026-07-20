// Gera um slug amigável
function gerarSlug(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

// Formata dinheiro
function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// Formata data
function formatarData(data) {

    return new Date(data).toLocaleDateString("pt-BR");

}

// Gera nome único para arquivos
function gerarNomeArquivo(nome) {

    const extensao = nome.split(".").pop();

    return `${Date.now()}-${crypto.randomUUID()}.${extensao}`;

}