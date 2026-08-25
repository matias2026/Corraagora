document.addEventListener("DOMContentLoaded", async () => {
    const link = document.getElementById("adminPanelLink");
    if (!link) return;

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) return;

    const { data: perfil } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

    if (perfil?.role === "admin") {
        link.classList.remove("hidden");
    }
});
