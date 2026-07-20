const logoutButton = document.getElementById("logoutButton");
const listaEventos = document.getElementById("listaEventos");
const totalEventos = document.getElementById("totalEventos");
const totalInscritos = document.getElementById("totalInscritos");
const totalConfirmados = document.getElementById("totalConfirmados");
const receitaTotal = document.getElementById("receitaTotal");
const searchEvento = document.getElementById("searchEvento");
const statusFiltro = document.getElementById("statusFiltro");

let eventos = [];
let usuario = null;

async function verificarUsuario() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../login.html";
        return;
    }

    usuario = session.user;

    carregarEventos();
}

async function carregarEventos() {

    const { data, error } = await supabaseClient
        .from("eventos")
        .select("*")
        .eq("organizador_id", usuario.id)
        .order("data_evento", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    eventos = data || [];

    atualizarResumo();
    renderizarEventos();
}

function atualizarResumo() {

    totalEventos.textContent = eventos.length;

    totalInscritos.textContent = "0";
    totalConfirmados.textContent = "0";
    receitaTotal.textContent = "R$ 0,00";
}

function renderizarEventos() {

    let lista = [...eventos];

    const busca = searchEvento.value.toLowerCase().trim();

    if (busca) {
        lista = lista.filter(evento =>
            evento.nome.toLowerCase().includes(busca)
        );
    }

    if (statusFiltro.value) {
        lista = lista.filter(evento =>
            evento.status === statusFiltro.value
        );
    }

    if (lista.length === 0) {

        listaEventos.innerHTML = `
            <div class="empty-state">
                <h3>Nenhum evento encontrado</h3>
            </div>
        `;

        return;
    }

    listaEventos.innerHTML = "";

    lista.forEach(evento => {

        listaEventos.innerHTML += `

        <div class="evento-card">

            <div class="evento-banner">

                ${
                    evento.banner_url
                        ? `<img src="${evento.banner_url}" alt="${evento.nome}" style="width:100%;height:170px;object-fit:cover;border-radius:12px;">`
                        : "🏁"
                }

            </div>

            <div class="evento-content">

                <h3>${evento.nome}</h3>

                <div class="evento-info">

                    <span>📅 ${formatarData(evento.data_evento)}</span>

                    <span>📍 ${evento.cidade}/${evento.estado}</span>

                    <span>🚴 ${evento.modalidade}</span>

                    <span>💰 R$ ${Number(evento.valor_inscricao || 0).toFixed(2)}</span>

                    <span>Status: ${evento.status}</span>

                </div>

                <div class="evento-actions">

                    <a
                        href="editar-evento.html?id=${evento.id}"
                        class="btn-edit"
                    >
                        ✏️ Editar
                    </a>

                    <a
                        href="inscritos.html?evento=${evento.id}"
                        class="btn-users"
                    >
                        👥 Inscritos
                    </a>

                </div>

            </div>

        </div>

        `;

    });

}

function formatarData(data) {

    if (!data) return "-";

    return new Date(data)
        .toLocaleDateString("pt-BR");
}

searchEvento.addEventListener("input", renderizarEventos);

statusFiltro.addEventListener("change", renderizarEventos);

logoutButton.addEventListener("click", async () => {

    await supabaseClient.auth.signOut();

    window.location.href = "../login.html";

});

verificarUsuario();