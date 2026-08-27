const logoutButton = document.getElementById("logoutButton");

const totalConfirmado = document.getElementById("totalConfirmado");
const totalPendente = document.getElementById("totalPendente");
const totalDesconto = document.getElementById("totalDesconto");

const tabelaReceitas = document.getElementById("tabelaReceitas");
const corpoTabelaReceitas = document.getElementById("corpoTabelaReceitas");
const semEventosReceita = document.getElementById("semEventosReceita");

const tabelaCupons = document.getElementById("tabelaCupons");
const corpoTabelaCupons = document.getElementById("corpoTabelaCupons");
const semCupons = document.getElementById("semCupons");

let usuario = null;

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

    await carregarReceitas();
}

async function carregarReceitas() {
    const { data: eventos, error: eventosError } = await supabaseClient
        .from("eventos")
        .select("id, nome")
        .eq("organizador_id", usuario.id)
        .order("data_evento", { ascending: false });

    if (eventosError) {
        console.error("Erro ao carregar eventos:", eventosError);
        return;
    }

    const listaEventos = eventos || [];

    if (listaEventos.length === 0) {
        tabelaReceitas.classList.add("hidden");
        semEventosReceita.classList.remove("hidden");
        tabelaCupons.classList.add("hidden");
        semCupons.classList.remove("hidden");
        return;
    }

    const eventoIds = listaEventos.map(evento => evento.id);

    const [
        { data: inscricoes, error: inscricoesError },
        { data: cupons, error: cuponsError },
        { data: categorias, error: categoriasError }
    ] = await Promise.all([
        supabaseClient
            .from("inscricoes")
            .select("evento_id, status, valor_pago, cupom_codigo, categoria")
            .in("evento_id", eventoIds),
        supabaseClient
            .from("cupons")
            .select("evento_id, codigo, percentual")
            .in("evento_id", eventoIds),
        supabaseClient
            .from("categorias")
            .select("evento_id, nome, valor")
            .in("evento_id", eventoIds)
    ]);

    if (inscricoesError) {
        console.error("Erro ao carregar inscrições:", inscricoesError);
        return;
    }

    if (cuponsError) {
        console.error("Erro ao carregar cupons:", cuponsError);
    }

    if (categoriasError) {
        console.error("Erro ao carregar categorias:", categoriasError);
    }

    renderizarPorEvento(listaEventos, inscricoes || []);
    renderizarCupons(
        listaEventos,
        inscricoes || [],
        cupons || [],
        categorias || []
    );
}

function renderizarPorEvento(eventos, inscricoes) {
    let somaConfirmado = 0;
    let somaPendente = 0;

    const linhas = eventos.map(evento => {
        const inscricoesDoEvento = inscricoes.filter(
            i => i.evento_id === evento.id
        );

        const confirmadas = inscricoesDoEvento.filter(
            i => (i.status || "").toLowerCase() === "confirmado"
        );

        const pendentes = inscricoesDoEvento.filter(
            i => (i.status || "").toLowerCase() === "pendente"
        );

        const receitaConfirmada = confirmadas.reduce(
            (soma, i) => soma + Number(i.valor_pago || 0),
            0
        );

        const receitaPendente = pendentes.reduce(
            (soma, i) => soma + Number(i.valor_pago || 0),
            0
        );

        somaConfirmado += receitaConfirmada;
        somaPendente += receitaPendente;

        return `
            <tr>
                <td>${escaparHTML(evento.nome || "-")}</td>
                <td>${confirmadas.length}</td>
                <td>${formatarMoeda(receitaConfirmada)}</td>
                <td>${pendentes.length}</td>
                <td>${formatarMoeda(receitaPendente)}</td>
            </tr>
        `;
    });

    totalConfirmado.textContent = formatarMoeda(somaConfirmado);
    totalPendente.textContent = formatarMoeda(somaPendente);

    if (linhas.length === 0) {
        tabelaReceitas.classList.add("hidden");
        semEventosReceita.classList.remove("hidden");
        return;
    }

    tabelaReceitas.classList.remove("hidden");
    semEventosReceita.classList.add("hidden");
    corpoTabelaReceitas.innerHTML = linhas.join("");
}

function renderizarCupons(eventos, inscricoes, cupons, categorias) {
    const nomeEvento = {};
    eventos.forEach(evento => {
        nomeEvento[evento.id] = evento.nome;
    });

    const percentualPorCupom = {};
    cupons.forEach(cupom => {
        percentualPorCupom[`${cupom.evento_id}::${cupom.codigo}`] = cupom.percentual;
    });

    const valorReferenciaPorCategoria = {};
    categorias.forEach(categoria => {
        valorReferenciaPorCategoria[`${categoria.evento_id}::${categoria.nome}`] =
            Number(categoria.valor || 0);
    });

    const usoPorCupom = {};

    inscricoes
        .filter(i => i.cupom_codigo)
        .forEach(inscricao => {
            const chave = `${inscricao.evento_id}::${inscricao.cupom_codigo}`;
            const percentual = percentualPorCupom[chave];

            const valorReferencia =
                valorReferenciaPorCategoria[`${inscricao.evento_id}::${inscricao.categoria}`] || 0;

            const desconto =
                percentual === 100
                    ? valorReferencia
                    : percentual
                        ? (Number(inscricao.valor_pago || 0) * percentual) / (100 - percentual)
                        : 0;

            if (!usoPorCupom[chave]) {
                usoPorCupom[chave] = {
                    evento_id: inscricao.evento_id,
                    codigo: inscricao.cupom_codigo,
                    percentual: percentual ?? null,
                    usos: 0,
                    totalDesconto: 0
                };
            }

            usoPorCupom[chave].usos += 1;
            usoPorCupom[chave].totalDesconto += desconto;
        });

    let somaDesconto = 0;

    const linhas = Object.values(usoPorCupom).map(uso => {
        somaDesconto += uso.totalDesconto;

        return `
            <tr>
                <td>${escaparHTML(nomeEvento[uso.evento_id] || "-")}</td>
                <td>${escaparHTML(uso.codigo)}</td>
                <td>${uso.percentual !== null ? `${uso.percentual}%` : "-"}</td>
                <td>${uso.usos}</td>
                <td>${formatarMoeda(uso.totalDesconto)}</td>
            </tr>
        `;
    });

    totalDesconto.textContent = formatarMoeda(somaDesconto);

    if (linhas.length === 0) {
        tabelaCupons.classList.add("hidden");
        semCupons.classList.remove("hidden");
        return;
    }

    tabelaCupons.classList.remove("hidden");
    semCupons.classList.add("hidden");
    corpoTabelaCupons.innerHTML = linhas.join("");
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
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

logoutButton.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "../index.html";
});

verificarUsuario();
