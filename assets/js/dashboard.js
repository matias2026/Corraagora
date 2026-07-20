document.addEventListener("DOMContentLoaded", async () => {
    const organizerName = document.getElementById("organizerName");
    const logoutButton = document.getElementById("logoutButton");

    try {
        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        if (!session) {
            window.location.replace("../login.html");
            return;
        }

        organizerName.textContent =
            session.user.user_metadata?.nome ||
            session.user.email ||
            "Organizador";

        logoutButton.addEventListener("click", async () => {
            const { error: logoutError } =
                await supabaseClient.auth.signOut();

            if (logoutError) {
                alert("Não foi possível sair da conta.");
                console.error(logoutError);
                return;
            }

            window.location.replace("../login.html");
        });

    } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        window.location.replace("../login.html");
    }
});