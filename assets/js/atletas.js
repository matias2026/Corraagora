const adminLayout = document.getElementById("adminLayout");
const adminName = document.getElementById("adminName");
const logoutButton = document.getElementById("logoutButton");
const buscarAtleta = document.getElementById("buscarAtleta");
const corpoTabelaAtletas = document.getElementById("corpoTabelaAtletas");
const tabelaAtletas = document.getElementById("tabelaAtletas");
const semAtletas = document.getElementById("semAtletas");
const totalAtletasLabel = document.getElementById("totalAtletasLabel");

let usuario = null;
let todosOsAtletas = [];

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

    buscarAtleta.addEventListener("input", renderizarAtletas);

    await carregarAtletas();
}

async function carregarAtletas() {
    const { data: atletas, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email, created_at, status_atleta")
        .eq("role", "atleta")
        .order("full_name", { ascending: true });

    if (error) {
        console.error("Erro ao carregar atletas:", error);
        corpoTabelaAtletas.innerHTML = "";
        tabelaAtletas.classList.add("hidden");
        semAtletas.classList.remove("hidden");
        semAtletas.querySelector("h3").textContent =
            "Não foi possível carregar as contas de atleta";
        totalAtletasLabel.textContent = "0 atletas";
        return;
    }

    todosOsAtletas = atletas || [];
    renderizarAtletas();
}

function renderizarAtletas() {
    const termo = (buscarAtleta.value || "").toLowerCase().trim();

    const filtrados = termo
        ? todosOsAtletas.filter(
              (atleta) =>
                  (atleta.full_name || "").toLowerCase().includes(termo) ||
                  (atleta.email || "").toLowerCase().includes(termo)
          )
        : todosOsAtletas;

    totalAtletasLabel.textContent =
        todosOsAtletas.length === 1
            ? "1 atleta"
            : `${todosOsAtletas.length} atletas`;

    if (filtrados.length === 0) {
        corpoTabelaAtletas.innerHTML = "";
        tabelaAtletas.classList.add("hidden");
        semAtletas.classList.remove("hidden");
        return;
    }

    tabelaAtletas.classList.remove("hidden");
    semAtletas.classList.add("hidden");

    corpoTabelaAtletas.innerHTML = filtrados
        .map((atleta) => criarLinha(atleta))
        .join("");

    corpoTabelaAtletas
        .querySelectorAll("[data-alternar]")
        .forEach((botao) =>
            botao.addEventListener("click", () =>
                alternarStatus(
                    botao,
                    botao.dataset.alternar,
                    botao.dataset.nome,
                    botao.dataset.novoStatus
                )
            )
        );
}

function criarLinha(atleta) {
    const nome = atleta.full_name || "-";
    const banido = atleta.status_atleta === "banido";

    return `
        <tr data-linha-atleta="${atleta.id}">
            <td>${escaparHTML(nome)}</td>
            <td>${escaparHTML(atleta.email || "-")}</td>
            <td>${formatarData(atleta.created_at)}</td>
            <td>
                <span class="status-pill status-${banido ? "rejeitado" : "aprovado"}">
                    ${banido ? "Banido" : "Ativo"}
                </span>
            </td>
            <td>
                <div class="tabela-acoes">
                    ${
                        banido
                            ? `<button type="button" class="btn-approve" data-alternar="${atleta.id}" data-nome="${escaparAtributo(nome)}" data-novo-status="ativo">✓ Reativar</button>`
                            : `<button type="button" class="btn-reject" data-alternar="${atleta.id}" data-nome="${escaparAtributo(nome)}" data-novo-status="banido">✕ Banir</button>`
                    }
                </div>
            </td>
        </tr>
    `;
}

async function alternarStatus(botao, atletaId, nome, novoStatus) {
    const mensagemConfirmacao =
        novoStatus === "banido"
            ? `Banir "${nome}"?\n\nA conta continua existindo e ele(a) consegue logar, ` +
              "mas não vai mais conseguir criar novas inscrições (pra si ou pra um amigo). " +
              "As inscrições que já existem não são afetadas."
            : `Reativar "${nome}"? A conta volta a conseguir se inscrever normalmente.`;

    if (!window.confirm(mensagemConfirmacao)) return;

    const linha = document.querySelector(`[data-linha-atleta="${atletaId}"]`);
    const botoes = linha.querySelectorAll("button");

    botoes.forEach((b) => (b.disabled = true));
    botao.textContent = novoStatus === "banido" ? "Banindo..." : "Reativando...";

    const { error } = await supabaseClient
        .from("profiles")
        .update({ status_atleta: novoStatus })
        .eq("id", atletaId)
        .eq("role", "atleta");

    if (error) {
        console.error("Erro ao atualizar status do atleta:", error);
        alert(error.message || "Não foi possível atualizar essa conta.");
        botoes.forEach((b) => (b.disabled = false));
        botao.textContent = novoStatus === "banido" ? "✕ Banir" : "✓ Reativar";
        return;
    }

    const atleta = todosOsAtletas.find((a) => a.id === atletaId);
    if (atleta) atleta.status_atleta = novoStatus;

    renderizarAtletas();
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
