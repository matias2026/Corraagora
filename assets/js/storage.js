window.uploadBanner = async function (file, userId) {
    const nomeArquivo =
        `${userId}/${gerarNomeArquivo(file.name)}`;

    const { error } = await supabaseClient.storage
        .from("eventos-banners")
        .upload(nomeArquivo, file);

    if (error) {
        throw error;
    }

    const { data } = supabaseClient.storage
        .from("eventos-banners")
        .getPublicUrl(nomeArquivo);

    return data.publicUrl;
};


window.uploadComprovante = async function (file, eventoId) {
    const nomeArquivo =
        `${eventoId}/${gerarNomeArquivo(file.name)}`;

    const { error } = await supabaseClient.storage
        .from("inscricoes-comprovantes")
        .upload(nomeArquivo, file);

    if (error) {
        throw error;
    }

    const { data } = supabaseClient.storage
        .from("inscricoes-comprovantes")
        .getPublicUrl(nomeArquivo);

    return data.publicUrl;
};


window.uploadRegulamento = async function (file, userId) {
    const nomeArquivo =
        `${userId}/${gerarNomeArquivo(file.name)}`;

    const { error } = await supabaseClient.storage
        .from("eventos-regulamentos")
        .upload(nomeArquivo, file);

    if (error) {
        throw error;
    }

    return nomeArquivo;
};