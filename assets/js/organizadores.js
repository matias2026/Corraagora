const adminLayout = document.getElementById("adminLayout");
const adminName = document.getElementById("adminName");
const logoutButton = document.getElementById("logoutButton");
const corpoTabelaOrganizadores = document.getElementById("corpoTabelaOrganizadores");
const tabelaOrganizadores = document.getElementById("tabelaOrganizadores");
const semOrganizadores = document.getElementById("semOrganizadores");
const totalOrganizadoresLabel = document.getElementById("totalOrganizadoresLabel");

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
        window.location.href = "../index.html";
    });

    await carregarOrganizadores();
}

async function carregarOrganizadores() {
    const { data: organizadores, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email, created_at")
        .eq("role", "organizador")
        .eq("status_organizador", "aprovado")
        .order("full_name", { ascending: true });

    if (error) {
        console.error("Erro ao carregar organizadores:", error);
        corpoTabelaOrganizadores.innerHTML = "";
        tabelaOrganizadores.classList.add("hidden");
        semOrganizadores.classList.remove("hidden");
        semOrganizadores.querySelector("h3").textContent =
            "Não foi possível carregar os organizadores";
        totalOrganizadoresLabel.textContent = "0 organizadores";
        return;
    }

    renderizarOrganizadores(organizadores || []);
}

function renderizarOrganizadores(organizadores) {
    totalOrganizadoresLabel.textContent =
        organizadores.length === 1
            ? "1 organizador"
            : `${organizadores.length} organizadores`;

    if (organizadores.length === 0) {
        corpoTabelaOrganizadores.innerHTML = "";
        tabelaOrganizadores.classList.add("hidden");
        semOrganizadores.classList.remove("hidden");
        return;
    }

    tabelaOrganizadores.classList.remove("hidden");
    semOrganizadores.classList.add("hidden");

    corpoTabelaOrganizadores.innerHTML = organizadores
        .map((organizador) => criarLinha(organizador))
        .join("");

    corpoTabelaOrganizadores
        .querySelectorAll("[data-remover]")
        .forEach((botao) =>
            botao.addEventListener("click", () =>
                removerAcesso(botao, botao.dataset.remover, botao.dataset.nome)
            )
        );
}

function criarLinha(organizador) {
    const nome = organizador.full_name || "-";

    return `
        <tr data-linha-organizador="${organizador.id}">
            <td>${escaparHTML(nome)}</td>
            <td>${escaparHTML(organizador.email || "-")}</td>
            <td>${formatarData(organizador.created_at)}</td>
            <td>
                <div class="tabela-acoes">
                    <button
                        type="button"
                        class="btn-reject"
                        data-remover="${organizador.id}"
                        data-nome="${escaparAtributo(nome)}"
                    >
                        ✕ Remover acesso
                    </button>
                </div>
            </td>
        </tr>
    `;
}

async function removerAcesso(botao, organizadorId, nome) {
    const confirmado = window.confirm(
        `Remover o acesso de organizador de "${nome}"?\n\n` +
        "A conta continua existindo e ele pode fazer login normalmente, " +
        "mas perde acesso ao painel de organizador e não consegue mais " +
        "criar ou gerenciar eventos. Você pode aprovar de novo depois, " +
        "se precisar."
    );

    if (!confirmado) return;

    const linha = document.querySelector(`[data-linha-organizador="${organizadorId}"]`);
    const botoes = linha.querySelectorAll("button");

    botoes.forEach((b) => (b.disabled = true));
    botao.textContent = "Removendo...";

    const { error } = await supabaseClient
        .from("profiles")
        .update({ status_organizador: "rejeitado" })
        .eq("id", organizadorId)
        .eq("role", "organizador");

    if (error) {
        console.error("Erro ao remover acesso do organizador:", error);
        alert(error.message || "Não foi possível remover o acesso desse organizador.");
        botoes.forEach((b) => (b.disabled = false));
        botao.textContent = "✕ Remover acesso";
        return;
    }

    linha.remove();

    const restantes = corpoTabelaOrganizadores.querySelectorAll("tr").length;

    totalOrganizadoresLabel.textContent =
        restantes === 1 ? "1 organizador" : `${restantes} organizadores`;

    if (restantes === 0) {
        tabelaOrganizadores.classList.add("hidden");
        semOrganizadores.classList.remove("hidden");
    }
}

function formatarData(data) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("pt-BR");
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escaparAtributo(valor) {
    return escaparHTML(valor).replaceAll('"', "&quot;");
}

iniciar();
