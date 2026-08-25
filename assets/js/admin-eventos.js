const adminLayout = document.getElementById("adminLayout");
const adminName = document.getElementById("adminName");
const logoutButton = document.getElementById("logoutButton");
const corpoTabelaEventos = document.getElementById("corpoTabelaEventos");
const tabelaEventos = document.getElementById("tabelaEventos");
const semEventos = document.getElementById("semEventos");
const totalEventosLabel = document.getElementById("totalEventosLabel");
const buscarEvento = document.getElementById("buscarEvento");
const statusFiltro = document.getElementById("statusFiltro");

let todosOsEventos = [];
let organizadoresPorId = {};

async function iniciar() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../login.html";
        return;
    }

    const { data: perfil, error: perfilError } = await supabaseClient
        .from("profiles")
        .select("role, full_name, email")
        .eq("id", session.user.id)
        .maybeSingle();

    if (perfilError || !perfil || perfil.role !== "admin") {
        window.location.href = "../index.html";
        return;
    }

    adminName.textContent = perfil.full_name || perfil.email || session.user.email;
    adminLayout.classList.remove("hidden");

    logoutButton.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "../login.html";
    });

    buscarEvento.addEventListener("input", renderizarEventos);
    statusFiltro.addEventListener("change", renderizarEventos);

    await carregarEventos();
}

async function carregarEventos() {
    const { data: eventos, error } = await supabaseClient
        .from("eventos")
        .select("*")
        .order("data_evento", { ascending: false });

    if (error) {
        console.error("Erro ao carregar eventos:", error);
        corpoTabelaEventos.innerHTML = "";
        tabelaEventos.classList.add("hidden");
        semEventos.classList.remove("hidden");
        semEventos.querySelector("h3").textContent =
            "Não foi possível carregar os eventos";
        return;
    }

    todosOsEventos = eventos || [];
    organizadoresPorId = await carregarOrganizadores(todosOsEventos);

    renderizarEventos();
}

async function carregarOrganizadores(eventos) {
    const ids = [...new Set(eventos.map(evento => evento.organizador_id).filter(Boolean))];

    if (ids.length === 0) return {};

    const { data: perfis, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);

    if (error) {
        console.error("Erro ao carregar organizadores:", error);
        return {};
    }

    const mapa = {};
    (perfis || []).forEach(perfil => {
        mapa[perfil.id] = perfil.full_name || perfil.email || "Organizador";
    });

    return mapa;
}

function renderizarEventos() {
    const termo = (buscarEvento.value || "").toLowerCase().trim();
    const status = statusFiltro.value;

    let lista = [...todosOsEventos];

    if (termo) {
        lista = lista.filter(evento => {
            const organizador = (organizadoresPorId[evento.organizador_id] || "").toLowerCase();

            return (
                (evento.nome || "").toLowerCase().includes(termo) ||
                (evento.cidade || "").toLowerCase().includes(termo) ||
                organizador.includes(termo)
            );
        });
    }

    if (status) {
        lista = lista.filter(evento => evento.status === status);
    }

    totalEventosLabel.textContent =
        lista.length === 1 ? "1 evento" : `${lista.length} eventos`;

    if (lista.length === 0) {
        corpoTabelaEventos.innerHTML = "";
        tabelaEventos.classList.add("hidden");
        semEventos.classList.remove("hidden");
        return;
    }

    tabelaEventos.classList.remove("hidden");
    semEventos.classList.add("hidden");

    corpoTabelaEventos.innerHTML = lista.map(criarLinha).join("");

    corpoTabelaEventos.querySelectorAll("[data-status-botao]").forEach(botao => {
        botao.addEventListener("click", () =>
            atualizarStatus(
                Number(botao.dataset.eventoId),
                botao.dataset.statusBotao
            )
        );
    });
}

function criarLinha(evento) {
    const organizador = organizadoresPorId[evento.organizador_id] || "Organizador";
    const status = evento.status || "pendente";

    const statusRotulos = {
        pendente: "Pendente",
        aprovado: "Aprovado",
        rejeitado: "Rejeitado"
    };

    return `
        <tr>
            <td>${escaparHTML(evento.nome || "-")}</td>
            <td>${escaparHTML(organizador)}</td>
            <td>${escaparHTML(evento.cidade || "-")}${
                evento.estado ? `/${escaparHTML(evento.estado)}` : ""
            }</td>
            <td>${formatarData(evento.data_evento)}</td>
            <td><span class="status-pill status-${status}">${escaparHTML(statusRotulos[status] || status)}</span></td>
            <td>
                <div class="tabela-acoes">
                    <a
                        class="btn-edit"
                        href="../organizador/editar-evento.html?id=${evento.id}"
                    >
                        ✏️ Editar
                    </a>

                    ${
                        status !== "aprovado"
                            ? `<button type="button" class="btn-approve" data-evento-id="${evento.id}" data-status-botao="aprovado">✓ Aprovar</button>`
                            : ""
                    }

                    ${
                        status !== "rejeitado"
                            ? `<button type="button" class="btn-reject" data-evento-id="${evento.id}" data-status-botao="rejeitado">✕ Rejeitar</button>`
                            : ""
                    }
                </div>
            </td>
        </tr>
    `;
}

async function atualizarStatus(eventoId, novoStatus) {
    const { error } = await supabaseClient
        .from("eventos")
        .update({ status: novoStatus })
        .eq("id", eventoId);

    if (error) {
        console.error("Erro ao atualizar status do evento:", error);
        alert(error.message || "Não foi possível atualizar o evento.");
        return;
    }

    const evento = todosOsEventos.find(e => e.id === eventoId);
    if (evento) evento.status = novoStatus;

    renderizarEventos();
}

function formatarData(data) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR");
}

function escaparHTML(valor) {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

iniciar();
