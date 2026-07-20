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