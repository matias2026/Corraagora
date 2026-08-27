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

                window.location.href = "../index.html";

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

        const eventoIds = eventos.map(evento => evento.id);

        const { data: inscricoes, error: inscricoesError } =
            await supabaseClient
                .from("inscricoes")
                .select("status")
                .in("evento_id", eventoIds);

        if (inscricoesError) {
            console.error(inscricoesError);
        } else {
            document.getElementById("totalRegistrations").textContent =
                inscricoes.length;

            document.getElementById("confirmedRegistrations").textContent =
                inscricoes.filter(
                    inscricao => inscricao.status === "confirmado"
                ).length;
        }

        lista.innerHTML = "";

        eventos.forEach(evento => {

            lista.innerHTML += `
                <div class="evento-card">

                    <h3>${escaparHTML(evento.nome)}</h3>

                    <p><strong>Data:</strong> ${formatarData(evento.data_evento)}</p>

                    <p><strong>Cidade:</strong> ${escaparHTML(evento.cidade)}/${escaparHTML(evento.estado)}</p>

                    <p>
                        <strong>Status:</strong>
                        <span class="status-pill status-${evento.status}">
                            ${formatarStatus(evento.status)}
                        </span>
                    </p>

                </div>
            `;

        });

    } catch (e) {

        console.error(e);

    }
});

function formatarStatus(status) {
    const rotulos = {
        pendente: "Pendente",
        aprovado: "Aprovado",
        rejeitado: "Rejeitado"
    };

    return rotulos[status] || status || "-";
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
