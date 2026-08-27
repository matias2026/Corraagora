document.addEventListener("DOMContentLoaded", async () => {

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../login.html";
        return;
    }

    const { data: perfil } = await supabaseClient
        .from("profiles")
        .select("role, status_organizador")
        .eq("id", session.user.id)
        .maybeSingle();

    if (perfil?.role === "admin" || perfil?.status_organizador === "aprovado") {
        window.location.href = "index.html";
        return;
    }

    if (perfil?.role !== "organizador") {
        window.location.href = "../minhas-inscricoes.html";
        return;
    }

    if (perfil.status_organizador === "rejeitado") {
        document.getElementById("statusTitulo").textContent =
            "Cadastro não aprovado";

        document.getElementById("statusTexto").textContent =
            "Seu pedido pra ser organizador não foi aprovado. Se " +
            "você acha que isso é um engano, entre em contato com a " +
            "gente.";
    }

    document.getElementById("logoutButton").addEventListener(
        "click",
        async () => {
            await supabaseClient.auth.signOut();
            window.location.href = "../index.html";
        }
    );

});
