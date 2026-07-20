async function uploadBanner(file, userId) {

    const nomeArquivo =
        `${userId}/${gerarNomeArquivo(file.name)}`;

    const { error } =
        await supabaseClient.storage
            .from("eventos-banners")
            .upload(nomeArquivo, file);

    if (error) throw error;

    const { data } =
        supabaseClient.storage
            .from("eventos-banners")
            .getPublicUrl(nomeArquivo);

    return data.publicUrl;

}



async function uploadRegulamento(file, userId) {

    const nomeArquivo =
        `${userId}/${gerarNomeArquivo(file.name)}`;

    const { error } =
        await supabaseClient.storage
            .from("eventos-regulamentos")
            .upload(nomeArquivo, file);

    if (error) throw error;

    return nomeArquivo;

}