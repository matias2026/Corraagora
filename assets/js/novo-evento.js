document.addEventListener("DOMContentLoaded", async () => {

    // Elementos da página
    const organizerName = document.getElementById("organizerName");
    const logoutButton = document.getElementById("logoutButton");

    let session = null;

    // Verifica se o usuário está logado
    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();

        if (error) throw error;

        session = data.session;

        if (!session) {
            window.location.replace("../login.html");
            return;
        }

        organizerName.textContent =
            session.user.user_metadata?.nome ||
            session.user.email;

    } catch (error) {

        console.error("Erro ao verificar autenticação:", error);

        window.location.replace("../login.html");
        return;

    }

    // Logout
    logoutButton.addEventListener("click", async () => {

        await supabaseClient.auth.signOut();

        window.location.replace("../login.html");

    });

});