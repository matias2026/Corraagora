const adminLayout = document.getElementById("adminLayout");
const adminName = document.getElementById("adminName");
const logoutButton = document.getElementById("logoutButton");
const corpoTabelaPendentes = document.getElementById("corpoTabelaPendentes");
const tabelaPendentes = document.getElementById("tabelaPendentes");
const semPendentes = document.getElementById("semPendentes");
const totalPendentesLabel = document.getElementById("totalPendentesLabel");

let usuario = null;

async function iniciar() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "../login.html";
        return;
    }

    usuario = session.user;

    const { data: perfil, error: perfilError } = await supabaseClient
        .from("profiles")
        .select("role, full_name, email")
        .eq("id", usuario.id)
        .maybeSingle();

    if (perfilError || !perfil || perfil.role !== "admin") {
        window.location.href = "../index.html";
        return;
    }

    adminName.textContent = perfil.full_name || perfil.email || usuario.email;
    adminLayout.classList.remove("hidden");

    logoutButton.addEventListener("click", async () => {
        await supabaseClient.auth.signOut();
        window.location.href = "../login.html";
    });

    await carregarPendentes();
}

async function carregarPendentes() {
    const { data: eventos, error } = await supabaseClient
        .from("eventos")
        .select("*")
        .eq("status", "pendente")
        .order("data_evento", { ascending: true });

    if (error) {
        console.error("Erro ao carregar eventos pendentes:", error);
        corpoTabelaPendentes.innerHTML = "";
        tabelaPendentes.classList.add("hidden");
        semPendentes.classList.remove("hidden");
        semPendentes.querySelector("h3").textContent =
            "Não foi possível carregar os eventos pendentes";
        totalPendentesLabel.textContent = "0 eventos pendentes";
        return;
    }

    const organizadoresPorId = await carregarOrganizadores(eventos || []);

    renderizarPendentes(eventos || [], organizadoresPorId);
}

async function carregarOrganizadores(eventos) {
    const ids = [...new Set(eventos.map((evento) => evento.organizador_id).filter(Boolean))];

    if (ids.length === 0) {
        return {};
    }

    const { data: perfis, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);

    if (error) {
        console.error("Erro ao carregar organizadores:", error);
        return {};
    }

    const mapa = {};
    (perfis || []).forEach((perfil) => {
        mapa[perfil.id] = perfil.full_name || perfil.email || "Organizador";
    });

    return mapa;
}

function renderizarPendentes(eventos, organizadoresPorId) {
    totalPendentesLabel.textContent =
        eventos.length === 1
            ? "1 evento pendente"
            : `${eventos.length} eventos pendentes`;

    if (eventos.length === 0) {
        corpoTabelaPendentes.innerHTML = "";
        tabelaPendentes.classList.add("hidden");
        semPendentes.classList.remove("hidden");
        return;
    }

    tabelaPendentes.classList.remove("hidden");
    semPendentes.classList.add("hidden");

    corpoTabelaPendentes.innerHTML = eventos
        .map((evento) => criarLinha(evento, organizadoresPorId))
        .join("");

    corpoTabelaPendentes
        .querySelectorAll("[data-aprovar]")
        .forEach((botao) =>
            botao.addEventListener("click", () =>
                atualizarStatus(botao, Number(botao.dataset.aprovar), "aprovado")
            )
        );

    corpoTabelaPendentes
        .querySelectorAll("[data-rejeitar]")
        .forEach((botao) =>
            botao.addEventListener("click", () =>
                atualizarStatus(botao, Number(botao.dataset.rejeitar), "rejeitado")
            )
        );
}

function criarLinha(evento, organizadoresPorId) {
    const organizador =
        organizadoresPorId[evento.organizador_id] || "Organizador";

    return `
        <tr data-linha-evento="${evento.id}">
            <td>${escaparHTML(evento.nome || "-")}</td>
            <td>${escaparHTML(organizador)}</td>
            <td>${escaparHTML(evento.cidade || "-")}${
                evento.estado ? `/${escaparHTML(evento.estado)}` : ""
            }</td>
            <td>${formatarData(evento.data_evento)}</td>
            <td>${formatarValor(evento.valor)}</td>
            <td>
                <div class="tabela-acoes">
                    <button
                        type="button"
                        class="btn-approve"
                        data-aprovar="${evento.id}"
                    >
                        ✓ Aprovar
                    </button>

                    <button
                        type="button"
                        class="btn-reject"
                        data-rejeitar="${evento.id}"
                    >
                        ✕ Rejeitar
                    </button>
                </div>
            </td>
        </tr>
    `;
}

async function atualizarStatus(botao, eventoId, novoStatus) {
    const linha = document.querySelector(`[data-linha-evento="${eventoId}"]`);
    const botoes = linha.querySelectorAll("button");

    botoes.forEach((b) => (b.disabled = true));
    botao.textContent = novoStatus === "aprovado" ? "Aprovando..." : "Rejeitando...";

    const { error } = await supabaseClient
        .from("eventos")
        .update({ status: novoStatus })
        .eq("id", eventoId);

    if (error) {
        console.error("Erro ao atualizar status do evento:", error);
        alert(error.message || "Não foi possível atualizar o evento.");
        botoes.forEach((b) => (b.disabled = false));
        botao.textContent = novoStatus === "aprovado" ? "✓ Aprovar" : "✕ Rejeitar";
        return;
    }

    linha.remove();

    const restantes = corpoTabelaPendentes.querySelectorAll("tr").length;

    totalPendentesLabel.textContent =
        restantes === 1 ? "1 evento pendente" : `${restantes} eventos pendentes`;

    if (restantes === 0) {
        tabelaPendentes.classList.add("hidden");
        semPendentes.classList.remove("hidden");
    }
}

function formatarData(data) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR");
}

function formatarValor(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return "-";
    }

    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "-";

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function escaparHTML(valor) {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

iniciar();
