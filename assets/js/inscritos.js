const logoutButton = document.getElementById("logoutButton");

const seletorEventos = document.getElementById("seletorEventos");
const listaEventosSeletor = document.getElementById("listaEventosSeletor");
const painelInscritos = document.getElementById("painelInscritos");

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const nomeEventoSelecionado = document.getElementById("nomeEventoSelecionado");

const buscarInscrito = document.getElementById("buscarInscrito");
const statusInscricaoFiltro = document.getElementById("statusInscricaoFiltro");

const corpoTabelaInscritos = document.getElementById("corpoTabelaInscritos");
const tabelaInscritos = document.getElementById("tabelaInscritos");
const semInscritos = document.getElementById("semInscritos");
const tabelaIndisponivel = document.getElementById("tabelaIndisponivel");

const resumoTotal = document.getElementById("resumoTotal");
const resumoConfirmados = document.getElementById("resumoConfirmados");
const resumoPendentes = document.getElementById("resumoPendentes");

const exportarExcelButton = document.getElementById("exportarExcelButton");

let usuario = null;
let eventoAtual = null;
let inscricoes = [];

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
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

    if (perfil?.role !== "organizador" && perfil?.role !== "admin") {
        window.location.href = "../minhas-inscricoes.html";
        return;
    }

    usuario = session.user;

    const eventoId = new URLSearchParams(window.location.search).get("evento_id");

    if (eventoId) {
        await abrirEvento(eventoId);
    } else {
        await carregarSeletorDeEventos();
    }
}

async function carregarSeletorDeEventos() {
    seletorEventos.classList.remove("hidden");
    painelInscritos.classList.add("hidden");

    pageTitle.textContent = "Inscritos";
    pageSubtitle.textContent = "Selecione um evento para ver a lista de inscritos.";

    const { data, error } = await supabaseClient
        .from("eventos")
        .select("*")
        .eq("organizador_id", usuario.id)
        .order("data_evento", { ascending: false });

    if (error) {
        listaEventosSeletor.innerHTML = `<p>Não foi possível carregar seus eventos.</p>`;
        console.error(error);
        return;
    }

    const eventos = data || [];

    if (eventos.length === 0) {
        listaEventosSeletor.innerHTML = `
            <div class="empty-state">
                <h3>Você ainda não tem eventos cadastrados</h3>
            </div>
        `;
        return;
    }

    listaEventosSeletor.innerHTML = eventos.map(evento => `
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
                    <span>📍 ${evento.cidade || "-"}/${evento.estado || "-"}</span>
                </div>

                <div class="evento-actions">
                    <a href="inscritos.html?evento_id=${evento.id}" class="btn-users">
                        👥 Ver inscritos
                    </a>
                </div>
            </div>
        </div>
    `).join("");
}

async function abrirEvento(eventoId) {
    seletorEventos.classList.add("hidden");
    painelInscritos.classList.remove("hidden");

    const { data: evento, error } = await supabaseClient
        .from("eventos")
        .select("*")
        .eq("id", eventoId)
        .eq("organizador_id", usuario.id)
        .maybeSingle();

    if (error || !evento) {
        pageSubtitle.textContent = "Evento não encontrado.";
        nomeEventoSelecionado.textContent = "Evento não encontrado";
        console.error(error);
        return;
    }

    eventoAtual = evento;

    pageTitle.textContent = "Inscritos";
    pageSubtitle.textContent = `Acompanhe quem já se inscreveu em "${evento.nome}".`;
    nomeEventoSelecionado.textContent = evento.nome;

    await carregarInscricoes(eventoId);
}

async function carregarInscricoes(eventoId) {
    const { data, error } = await supabaseClient
        .from("inscricoes")
        .select("*")
        .eq("evento_id", eventoId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar inscritos:", error);

        tabelaInscritos.classList.add("hidden");
        semInscritos.classList.add("hidden");
        tabelaIndisponivel.classList.remove("hidden");

        resumoTotal.textContent = "0";
        resumoConfirmados.textContent = "0";
        resumoPendentes.textContent = "0";
        return;
    }

    tabelaIndisponivel.classList.add("hidden");
    inscricoes = data || [];

    atualizarResumo();
    renderizarInscricoes();
}

function atualizarResumo() {
    resumoTotal.textContent = inscricoes.length;

    resumoConfirmados.textContent = inscricoes.filter(
        i => (i.status || "").toLowerCase() === "confirmado"
    ).length;

    resumoPendentes.textContent = inscricoes.filter(
        i => (i.status || "").toLowerCase() === "pendente"
    ).length;
}

function renderizarInscricoes() {
    const termo = (buscarInscrito.value || "").toLowerCase().trim();
    const status = statusInscricaoFiltro.value;

    let lista = [...inscricoes];

    if (termo) {
        lista = lista.filter(i =>
            (i.nome || "").toLowerCase().includes(termo) ||
            (i.email || "").toLowerCase().includes(termo) ||
            (i.categoria || "").toLowerCase().includes(termo) ||
            (i.cpf || "").toLowerCase().includes(termo)
        );
    }

    if (status) {
        lista = lista.filter(i => (i.status || "").toLowerCase() === status);
    }

    if (lista.length === 0) {
        tabelaInscritos.classList.add("hidden");
        semInscritos.classList.remove("hidden");
        corpoTabelaInscritos.innerHTML = "";
        return;
    }

    tabelaInscritos.classList.remove("hidden");
    semInscritos.classList.add("hidden");

    corpoTabelaInscritos.innerHTML = lista.map(i => {
        const statusAtual = (i.status || "pendente").toLowerCase();

        return `
        <tr data-linha-inscricao="${i.id}">
            <td>${escaparHTML(i.codigo_inscricao || "-")}</td>
            <td>${escaparHTML(i.nome || "-")}</td>
            <td>${escaparHTML(i.cpf || "-")}</td>
            <td>${escaparHTML(i.email || "-")}</td>
            <td>${escaparHTML(i.telefone || "-")}</td>
            <td>${escaparHTML(i.categoria || "-")}</td>
            <td>${escaparHTML(i.cupom_codigo || "-")}</td>
            <td>${i.valor_pago !== null && i.valor_pago !== undefined ? formatarMoeda(i.valor_pago) : "-"}</td>
            <td>${escaparHTML(i.cidade || "-")}</td>
            <td>
                ${
                    i.comprovante_url
                        ? `<button type="button" class="link-button" data-ver-comprovante="${i.id}">Ver comprovante</button>`
                        : "-"
                }
            </td>
            <td><span class="status-pill status-${statusAtual}">${escaparHTML(i.status || "Pendente")}</span></td>
            <td>${formatarData(i.created_at)}</td>
            <td>
                <div class="tabela-acoes">
                    <button
                        type="button"
                        class="btn-approve"
                        data-confirmar="${i.id}"
                        ${statusAtual === "confirmado" ? "disabled" : ""}
                    >
                        ✓ Confirmar
                    </button>

                    <button
                        type="button"
                        class="btn-reject"
                        data-cancelar="${i.id}"
                        ${statusAtual === "cancelado" ? "disabled" : ""}
                    >
                        ✕ Cancelar
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join("");

    corpoTabelaInscritos
        .querySelectorAll("[data-confirmar]")
        .forEach(botao =>
            botao.addEventListener("click", () =>
                atualizarStatusInscricao(botao, Number(botao.dataset.confirmar), "confirmado")
            )
        );

    corpoTabelaInscritos
        .querySelectorAll("[data-cancelar]")
        .forEach(botao =>
            botao.addEventListener("click", () =>
                atualizarStatusInscricao(botao, Number(botao.dataset.cancelar), "cancelado")
            )
        );

    corpoTabelaInscritos
        .querySelectorAll("[data-ver-comprovante]")
        .forEach(botao =>
            botao.addEventListener("click", () =>
                abrirComprovante(botao, Number(botao.dataset.verComprovante))
            )
        );
}

async function abrirComprovante(botao, inscricaoId) {
    const inscricao = inscricoes.find(i => i.id === inscricaoId);
    if (!inscricao?.comprovante_url) return;

    const textoOriginal = botao.textContent;
    botao.textContent = "Abrindo...";
    botao.disabled = true;

    const caminho = inscricao.comprovante_url.includes("inscricoes-comprovantes/")
        ? inscricao.comprovante_url.split("inscricoes-comprovantes/")[1]
        : inscricao.comprovante_url;

    const { data, error } = await supabaseClient.storage
        .from("inscricoes-comprovantes")
        .createSignedUrl(caminho, 300);

    botao.textContent = textoOriginal;
    botao.disabled = false;

    if (error || !data?.signedUrl) {
        alert("Não foi possível abrir o comprovante.");
        return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

async function atualizarStatusInscricao(botao, inscricaoId, novoStatus) {
    const linha = document.querySelector(`[data-linha-inscricao="${inscricaoId}"]`);
    const botoes = linha.querySelectorAll("button");

    botoes.forEach(b => (b.disabled = true));

    const { error } = await supabaseClient
        .from("inscricoes")
        .update({ status: novoStatus })
        .eq("id", inscricaoId);

    if (error) {
        console.error("Erro ao atualizar inscrição:", error);
        alert(error.message || "Não foi possível atualizar a inscrição.");
        botoes.forEach(b => (b.disabled = false));
        return;
    }

    const inscricao = inscricoes.find(i => i.id === inscricaoId);
    if (inscricao) inscricao.status = novoStatus;

    atualizarResumo();
    renderizarInscricoes();
}

function formatarData(data) {
    if (!data) return "-";

    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        const [ano, mes, dia] = data.split("-").map(Number);
        return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
    }

    return new Date(data).toLocaleDateString("pt-BR");
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
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

function escaparAtributo(valor) {
    return escaparHTML(valor).replaceAll('"', "&quot;");
}

function exportarParaExcel() {
    if (!eventoAtual) return;

    if (inscricoes.length === 0) {
        alert("Não há inscritos para exportar.");
        return;
    }

    const linhas = inscricoes.map(i => ({
        "Código": i.codigo_inscricao || "",
        Nome: i.nome || "",
        CPF: i.cpf || "",
        "Data de nascimento": i.data_nascimento || "",
        Sexo: i.sexo || "",
        "E-mail": i.email || "",
        Telefone: i.telefone || "",
        Equipe: i.equipe || "",
        "Licença CBC": i.licenca_cbc || "",
        Categoria: i.categoria || "",
        Cupom: i.cupom_codigo || "",
        "Valor pago": i.valor_pago ?? "",
        Cidade: i.cidade || "",
        Status: i.status || "",
        "Inscrito em": formatarData(i.created_at)
    }));

    const planilha = XLSX.utils.json_to_sheet(linhas);
    const livro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(livro, planilha, "Inscritos");

    const nomeArquivo = `inscritos-${(eventoAtual.slug || eventoAtual.nome || "evento")}.xlsx`;

    XLSX.writeFile(livro, nomeArquivo);
}

buscarInscrito?.addEventListener("input", renderizarInscricoes);
statusInscricaoFiltro?.addEventListener("change", renderizarInscricoes);
exportarExcelButton?.addEventListener("click", exportarParaExcel);

logoutButton.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "../index.html";
});

verificarUsuario();
