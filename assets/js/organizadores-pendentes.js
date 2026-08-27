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
        window.location.href = "../index.html";
    });

    await carregarPendentes();
}

async function carregarPendentes() {
    const { data: organizadores, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email, created_at")
        .eq("role", "organizador")
        .eq("status_organizador", "pendente")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Erro ao carregar organizadores pendentes:", error);
        corpoTabelaPendentes.innerHTML = "";
        tabelaPendentes.classList.add("hidden");
        semPendentes.classList.remove("hidden");
        semPendentes.querySelector("h3").textContent =
            "Não foi possível carregar os pedidos pendentes";
        totalPendentesLabel.textContent = "0 pedidos pendentes";
        return;
    }

    renderizarPendentes(organizadores || []);
}

function renderizarPendentes(organizadores) {
    totalPendentesLabel.textContent =
        organizadores.length === 1
            ? "1 pedido pendente"
            : `${organizadores.length} pedidos pendentes`;

    if (organizadores.length === 0) {
        corpoTabelaPendentes.innerHTML = "";
        tabelaPendentes.classList.add("hidden");
        semPendentes.classList.remove("hidden");
        return;
    }

    tabelaPendentes.classList.remove("hidden");
    semPendentes.classList.add("hidden");

    corpoTabelaPendentes.innerHTML = organizadores
        .map((organizador) => criarLinha(organizador))
        .join("");

    corpoTabelaPendentes
        .querySelectorAll("[data-aprovar]")
        .forEach((botao) =>
            botao.addEventListener("click", () =>
                atualizarStatus(botao, botao.dataset.aprovar, "aprovado")
            )
        );

    corpoTabelaPendentes
        .querySelectorAll("[data-rejeitar]")
        .forEach((botao) =>
            botao.addEventListener("click", () =>
                atualizarStatus(botao, botao.dataset.rejeitar, "rejeitado")
            )
        );
}

function criarLinha(organizador) {
    return `
        <tr data-linha-organizador="${organizador.id}">
            <td>${escaparHTML(organizador.full_name || "-")}</td>
            <td>${escaparHTML(organizador.email || "-")}</td>
            <td>${formatarData(organizador.created_at)}</td>
            <td>
                <div class="tabela-acoes">
                    <button
                        type="button"
                        class="btn-approve"
                        data-aprovar="${organizador.id}"
                    >
                        ✓ Aprovar
                    </button>

                    <button
                        type="button"
                        class="btn-reject"
                        data-rejeitar="${organizador.id}"
                    >
                        ✕ Rejeitar
                    </button>
                </div>
            </td>
        </tr>
    `;
}

async function atualizarStatus(botao, organizadorId, novoStatus) {
    const linha = document.querySelector(`[data-linha-organizador="${organizadorId}"]`);
    const botoes = linha.querySelectorAll("button");

    botoes.forEach((b) => (b.disabled = true));
    botao.textContent = novoStatus === "aprovado" ? "Aprovando..." : "Rejeitando...";

    const { error } = await supabaseClient
        .from("profiles")
        .update({ status_organizador: novoStatus })
        .eq("id", organizadorId);

    if (error) {
        console.error("Erro ao atualizar organizador:", error);
        alert(error.message || "Não foi possível atualizar o organizador.");
        botoes.forEach((b) => (b.disabled = false));
        botao.textContent = novoStatus === "aprovado" ? "✓ Aprovar" : "✕ Rejeitar";
        return;
    }

    linha.remove();

    const restantes = corpoTabelaPendentes.querySelectorAll("tr").length;

    totalPendentesLabel.textContent =
        restantes === 1 ? "1 pedido pendente" : `${restantes} pedidos pendentes`;

    if (restantes === 0) {
        tabelaPendentes.classList.add("hidden");
        semPendentes.classList.remove("hidden");
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

iniciar();
