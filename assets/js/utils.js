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

    if (!data) return "-";

    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        const [ano, mes, dia] = data.split("-").map(Number);
        return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
    }

    return new Date(data).toLocaleDateString("pt-BR");

}

// Gera nome único para arquivos
function gerarNomeArquivo(nome) {

    const extensao = nome.split(".").pop();

    return `${Date.now()}-${crypto.randomUUID()}.${extensao}`;

}