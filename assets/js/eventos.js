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
let inscricoesDosEventos = [];

async function verificarUsuario() {
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

    if (
        perfil?.role === "organizador" &&
        perfil?.status_organizador !== "aprovado"
    ) {
        window.location.href = "../aguardando-aprovacao.html";
        return;
    }

    if (perfil?.role !== "organizador" && perfil?.role !== "admin") {
        window.location.href = "../minhas-inscricoes.html";
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

    await carregarInscricoes();

    atualizarResumo();
    renderizarEventos();
}

async function carregarInscricoes() {
    inscricoesDosEventos = [];

    if (eventos.length === 0) return;

    const { data, error } = await supabaseClient
        .from("inscricoes")
        .select("evento_id, status, valor_pago")
        .in("evento_id", eventos.map(evento => evento.id));

    if (error) {
        console.error("Erro ao carregar inscritos:", error);
        return;
    }

    inscricoesDosEventos = data || [];
}

function atualizarResumo() {

    totalEventos.textContent = eventos.length;

    totalInscritos.textContent = inscricoesDosEventos.length;

    const confirmadas = inscricoesDosEventos.filter(
        i => (i.status || "").toLowerCase() === "confirmado"
    );

    totalConfirmados.textContent = confirmadas.length;

    const receita = confirmadas.reduce(
        (soma, i) => soma + Number(i.valor_pago || 0),
        0
    );

    receitaTotal.textContent = receita.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
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

        const totalInscritosEvento = inscricoesDosEventos.filter(
            inscricao => inscricao.evento_id === evento.id
        ).length;

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

                <div class="evento-stats">
                    <span class="badge-inscritos">
                        👥 ${totalInscritosEvento} ${totalInscritosEvento === 1 ? "inscrito" : "inscritos"}
                    </span>
                </div>

                <div class="evento-info">

                    <span>📅 ${formatarData(evento.data_evento)}</span>

                    <span>📍 ${evento.cidade}/${evento.estado}</span>

                    <span>🚴 ${evento.modalidade}</span>

                    <span>💰 Valor por categoria</span>

                    <span>
                        Status:
                        <span class="status-pill status-${evento.status}">
                            ${formatarStatus(evento.status)}
                        </span>
                    </span>

                </div>

                <div class="evento-actions">

    <a
        href="editar-evento.html?id=${evento.id}"
        class="btn-edit"
    >
        ✏️ Editar
    </a>

    <a
        href="inscritos.html?evento_id=${evento.id}"
        class="btn-users"
    >
        👥 Inscritos
    </a>

    <button
        type="button"
        class="btn-delete"
        onclick="excluirEvento(${evento.id})"
    >
        🗑️ Excluir
    </button>

</div>

        </div>

        `;

    });

}

function formatarData(data) {

    if (!data) return "-";

    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        const [ano, mes, dia] = data.split("-").map(Number);
        return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
    }

    return new Date(data)
        .toLocaleDateString("pt-BR");
}

function formatarStatus(status) {
    const rotulos = {
        pendente: "Pendente",
        aprovado: "Aprovado",
        rejeitado: "Rejeitado"
    };

    return rotulos[status] || status || "-";
}

searchEvento.addEventListener("input", renderizarEventos);

statusFiltro.addEventListener("change", renderizarEventos);

logoutButton.addEventListener("click", async () => {

    await supabaseClient.auth.signOut();

    window.location.href = "../index.html";

});
async function excluirEvento(eventoId) {

    const confirmar = window.confirm(
        "Tem certeza de que deseja excluir este evento? Essa ação não poderá ser desfeita."
    );

    if (!confirmar) {
        return;
    }

    try {

        const { error: categoriasError } = await supabaseClient
            .from("categorias")
            .delete()
            .eq("evento_id", eventoId);

        if (categoriasError) {
            throw categoriasError;
        }

        const { error: eventoError } = await supabaseClient
            .from("eventos")
            .delete()
            .eq("id", eventoId)
            .eq("organizador_id", usuario.id);

        if (eventoError) {
            throw eventoError;
        }

        eventos = eventos.filter(evento =>
            evento.id !== eventoId
        );

        atualizarResumo();
        renderizarEventos();

        alert("Evento excluído com sucesso.");

    } catch (error) {

        console.error("Erro ao excluir evento:", error);

        alert(
            error.message ||
            "Não foi possível excluir o evento."
        );
    }
}

verificarUsuario();