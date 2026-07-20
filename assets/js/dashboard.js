document.addEventListener("DOMContentLoaded", async () => {
    try {

        const {
            data: { session }
        } = await supabaseClient.auth.getSession();

        if (!session) {
            window.location.href = "../login.html";
            return;
        }

        document.getElementById("organizerName").textContent =
            session.user.email;

        document
            .getElementById("logoutButton")
            .addEventListener("click", async () => {

                await supabaseClient.auth.signOut();

                window.location.href = "../login.html";

            });

        const { data: eventos, error } = await supabaseClient
            .from("eventos")
            .select("*")
            .eq("organizador_id", session.user.id)
            .order("data_evento", { ascending: true });

        if (error) {
            console.error(error);
            return;
        }

        document.getElementById("totalEvents").textContent =
            eventos.length;

        const lista = document.getElementById("eventsList");

        if (eventos.length === 0) {

            lista.innerHTML = `
                <p>Nenhum evento cadastrado.</p>
            `;

            return;

        }

        document.getElementById("nextEvent").textContent =
            eventos[0].nome;

        lista.innerHTML = "";

        eventos.forEach(evento => {

            lista.innerHTML += `
                <div class="evento-card">

                    <h3>${evento.nome}</h3>

                    <p><strong>Data:</strong> ${evento.data_evento}</p>

                    <p><strong>Cidade:</strong> ${evento.cidade}/${evento.estado}</p>

                    <p><strong>Status:</strong> ${evento.status}</p>

                </div>
            `;

        });

    } catch (e) {

        console.error(e);

    }
});