document.addEventListener("DOMContentLoaded", async () => {

    const organizerName = document.getElementById("organizerName");
    const logoutButton = document.getElementById("logoutButton");

    const bannerInput = document.getElementById("banner");
    const bannerPreview = document.getElementById("bannerPreview");
    const bannerPreviewContainer = document.getElementById(
        "bannerPreviewContainer"
    );

    const regulamentoInput = document.getElementById("regulamento");
    const regulamentoNome = document.getElementById("regulamentoNome");

    let session = null;

    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

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
        await supabaseClient.auth.signOut();
        window.location.replace("../login.html");
    });

    // Pré-visualização do banner
    bannerInput.addEventListener("change", () => {
        const arquivo = bannerInput.files[0];

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
            alert("Selecione uma imagem PNG, JPG ou WEBP.");
            bannerInput.value = "";
            bannerPreview.removeAttribute("src");
            bannerPreviewContainer.classList.add("hidden");
            return;
        }

        const urlTemporaria = URL.createObjectURL(arquivo);

        bannerPreview.src = urlTemporaria;
        bannerPreviewContainer.classList.remove("hidden");
    });

    // Exibe o nome do regulamento
    regulamentoInput.addEventListener("change", () => {
        const arquivo = regulamentoInput.files[0];

        if (!arquivo) {
            regulamentoNome.textContent = "";
            return;
        }

        if (arquivo.type !== "application/pdf") {
            alert("Selecione um arquivo em PDF.");
            regulamentoInput.value = "";
            regulamentoNome.textContent = "";
            return;
        }

        regulamentoNome.textContent =
            `Arquivo selecionado: ${arquivo.name}`;
    });
const form = document.getElementById("eventForm");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    console.log("Formulário interceptado");

    alert("O botão está funcionando. Agora falta salvar no Supabase.");
});
});