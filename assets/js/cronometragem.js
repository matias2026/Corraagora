// --- ESTADO GLOBAL ---
// O cliente Supabase (supabaseClient) já vem pronto de assets/js/supabase.js,
// carregado antes deste arquivo — nunca declarar SUPABASE_URL/ANON_KEY/
// supabaseClient aqui de novo, pra não duplicar o que já existe lá.

let sessaoAtual = null;
let perfilAtual = null;
let eventoAtualId = null;

// Cronômetro geral — só uma referência visual de tempo decorrido desde
// que o evento foi carregado. Nunca é usado pra calcular tempo líquido
// de nenhum atleta; cada bateria tem o seu próprio cronômetro pra isso.
let segundosGeral = 0;
let intervaloGeral = null;

// Categorias do evento carregado (cache pra poder re-renderizar a lista
// sem precisar consultar o Supabase de novo a cada clique).
let categoriasCache = [];

// Categorias marcadas na tela, formando a PRÓXIMA bateria a ser disparada.
let categoriasSelecionadas = new Set();

// Categorias que já largaram em alguma bateria — ficam bloqueadas pra
// não serem selecionadas de novo noutra bateria.
let categoriasJaLargadas = new Set();

// Cada bateria é uma largada independente: { id, categorias (Set),
// segundos, intervalo, status }. status é "ativa" ou "encerrada" — ao
// encerrar, o cronômetro congela e novas chegadas pra essa bateria são
// bloqueadas. Várias baterias podem estar rodando ao mesmo tempo.
let baterias = [];
let proximoBateriaId = 1;

// Trava a seleção de categorias só durante a contagem regressiva de uma
// largada — não impede outras baterias já disparadas de continuar rodando.
let contagemRegressivaAtiva = false;

// Depois de encerrado, o evento inteiro para: nenhuma largada nova, nenhuma
// chegada nova, cronômetro geral congelado.
let eventoEncerrado = false;

// Relógio em tempo real no cabeçalho
setInterval(() => {
    const agora = new Date();
    document.getElementById("relogioAtual").innerText =
        agora.toLocaleTimeString("pt-BR");
}, 1000);

function formatarSegundosParaRelogio(totalSegundos) {
    const segundos = Math.max(0, Math.floor(totalSegundos || 0));
    const hrs = Math.floor(segundos / 3600).toString().padStart(2, "0");
    const mins = Math.floor((segundos % 3600) / 60).toString().padStart(2, "0");
    const secs = (segundos % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
}

// --- TECLADO NUMÉRICO (estilo calculadora) ---
// Mais rápido pra digitar o número da placa do que o teclado físico ou o
// teclado virtual do celular/tablet (que o "inputmode=none" no HTML evita
// que abra por cima da tela).
function digitarNumeral(digito) {
    const input = document.getElementById("inputNumeral");
    input.value = (input.value || "") + digito;
    input.focus();
}

function apagarUltimoDigitoNumeral() {
    const input = document.getElementById("inputNumeral");
    input.value = (input.value || "").slice(0, -1);
    input.focus();
}

function limparNumeral() {
    const input = document.getElementById("inputNumeral");
    input.value = "";
    input.focus();
}

// --- CONTROLE DE ACESSO ---
// Página de uso interno (equipe de cronometragem) — precisa de sessão de
// organizador (dono do evento) ou admin, igual ao painel do organizador.
async function verificarUsuario() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "login.html";
        return false;
    }

    sessaoAtual = session;

    const { data: perfil } = await supabaseClient
        .from("profiles")
        .select("role, status_organizador")
        .eq("id", session.user.id)
        .maybeSingle();

    perfilAtual = perfil;

    if (perfil?.role === "organizador" && perfil?.status_organizador !== "aprovado") {
        window.location.href = "organizador/aguardando-aprovacao.html";
        return false;
    }

    if (perfil?.role !== "organizador" && perfil?.role !== "admin") {
        window.location.href = "minhas-inscricoes.html";
        return false;
    }

    return true;
}

// 1. Carregar eventos reais do Supabase ao iniciar a página
// Organizador só vê os próprios eventos; admin vê todos.
async function carregarEventosDropdown() {
    try {
        let consulta = supabaseClient
            .from("eventos")
            .select("id, nome")
            .order("data_evento", { ascending: false });

        if (perfilAtual?.role !== "admin") {
            consulta = consulta.eq("organizador_id", sessaoAtual.user.id);
        }

        const { data: eventos, error } = await consulta;

        if (error) throw error;

        const select = document.getElementById("selectEvento");
        select.innerHTML = '<option value="">Selecione o Evento...</option>';

        if (eventos) {
            eventos.forEach((evento) => {
                const opt = document.createElement("option");
                opt.value = evento.id;
                opt.text = evento.nome;
                select.add(opt);
            });
        }
    } catch (err) {
        console.error("Erro ao carregar eventos:", err.message);
    }
}

// 2. Puxar dados do evento selecionado (categorias) e reiniciar todo o
// estado de baterias — baterias de um evento não fazem sentido pra outro.
async function carregarDadosEvento() {
    const select = document.getElementById("selectEvento");
    eventoAtualId = select.value;

    if (!eventoAtualId) {
        alert("Por favor, selecione um evento válido na lista.");
        return;
    }

    try {
        const { data: categorias, error } = await supabaseClient
            .from("categorias")
            .select("*")
            .eq("evento_id", eventoAtualId);

        if (error) throw error;

        baterias.forEach((bateria) => clearInterval(bateria.intervalo));
        baterias = [];
        categoriasSelecionadas.clear();
        categoriasJaLargadas.clear();
        contagemRegressivaAtiva = false;
        eventoEncerrado = false;

        document.getElementById("listaBaterias").innerHTML = `
            <p id="semBaterias" class="text-xs text-gray-500 col-span-full">
                Nenhuma bateria disparada ainda.
            </p>
        `;

        document.getElementById("avisoProvaConcluida").classList.add("hidden");

        const botao = document.getElementById("botaoIniciarLargada");
        botao.disabled = false;
        botao.innerHTML = `<span>▶</span> INICIAR LARGADA (5s)`;

        const botaoEncerrar = document.getElementById("botaoEncerrarEvento");
        botaoEncerrar.disabled = false;
        botaoEncerrar.innerHTML = `🏁 Encerrar Evento`;

        categoriasCache = categorias || [];
        atualizarListaCategorias();
        atualizarBadgeSelecao();

        // Cronômetro geral só começa a contar na primeira largada do
        // evento (dispararBateria) — carregar o evento apenas zera o
        // mostrador, pra não começar a contar antes de a prova começar
        // de verdade (vale tanto pra evento de 1 categoria quanto de várias).
        clearInterval(intervaloGeral);
        segundosGeral = 0;
        document.getElementById("cronometroGeral").innerText =
            formatarSegundosParaRelogio(0);
    } catch (err) {
        console.error("Erro ao carregar categorias:", err.message);
        alert("Erro ao conectar com o Supabase.");
    }
}

// Cronômetro geral — começa a contar na primeira largada do evento (seja
// evento de uma categoria só ou de várias) e nunca para depois disso; não
// representa a largada de nenhuma categoria específica, só o tempo desde
// que a prova oficialmente começou.
function iniciarCronometroGeral() {
    clearInterval(intervaloGeral);
    segundosGeral = 0;
    document.getElementById("cronometroGeral").innerText =
        formatarSegundosParaRelogio(0);

    intervaloGeral = setInterval(() => {
        segundosGeral++;
        document.getElementById("cronometroGeral").innerText =
            formatarSegundosParaRelogio(segundosGeral);
    }, 1000);
}

// Re-renderiza a lista de categorias a partir do cache + do estado atual
// (selecionada pra próxima bateria, ou já largada numa bateria anterior).
function atualizarListaCategorias() {
    const listaDiv = document.getElementById("listaCategorias");

    if (categoriasCache.length === 0) {
        listaDiv.innerHTML =
            '<p class="text-xs text-gray-400">Nenhuma categoria encontrada para este evento.</p>';
        return;
    }

    listaDiv.innerHTML = categoriasCache
        .map((cat) => {
            if (categoriasJaLargadas.has(cat.nome)) {
                const bateriaDaCategoria = baterias.find((b) =>
                    b.categorias.has(cat.nome)
                );
                const numeroBateria = bateriaDaCategoria ? bateriaDaCategoria.id : "?";
                const encerrada = bateriaDaCategoria?.status === "encerrada";

                return `
                    <div class="p-3.5 bg-[#0f1115] rounded-xl border border-gray-800 flex justify-between items-center opacity-60" data-categoria-nome="${cat.nome}">
                        <div>
                            <span class="font-bold text-white text-sm block">${cat.nome}</span>
                            <span class="text-xs ${encerrada ? "text-gray-500" : "text-emerald-400"}">
                                ${encerrada ? "Encerrada" : "Em andamento"} — Bateria #${numeroBateria}
                            </span>
                        </div>
                        <button disabled class="px-3 py-1.5 bg-gray-800 text-gray-500 text-xs font-bold rounded-lg cursor-not-allowed">
                            ${encerrada ? "✔ Encerrada" : "Largou"}
                        </button>
                    </div>
                `;
            }

            const ativa = categoriasSelecionadas.has(cat.nome);

            return `
                <div class="p-3.5 bg-[#0f1115] rounded-xl border border-gray-800 flex justify-between items-center" data-categoria-nome="${cat.nome}">
                    <div>
                        <span class="font-bold text-white text-sm block">${cat.nome}</span>
                        <span class="text-xs text-gray-400">Aguardando largada</span>
                    </div>
                    <button onclick="alternarCategoria('${cat.nome}')" class="px-3 py-1.5 ${ativa ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"} text-white text-xs font-bold rounded-lg transition-colors">
                        ${ativa ? "✓ Selecionada" : "Selecionar"}
                    </button>
                </div>
            `;
        })
        .join("");
}

// Liga/desliga uma categoria na seleção da PRÓXIMA bateria.
function alternarCategoria(catNome) {
    if (contagemRegressivaAtiva) {
        alert("Aguarde a contagem regressiva atual terminar antes de mudar a seleção.");
        return;
    }

    if (eventoEncerrado) {
        alert("O evento já foi encerrado. Não é possível iniciar novas baterias.");
        return;
    }

    if (categoriasJaLargadas.has(catNome)) {
        alert(`A categoria "${catNome}" já largou e não pode ser selecionada de novo.`);
        return;
    }

    if (categoriasSelecionadas.has(catNome)) {
        categoriasSelecionadas.delete(catNome);
    } else {
        categoriasSelecionadas.add(catNome);
    }

    atualizarListaCategorias();
    atualizarBadgeSelecao();
}

function atualizarBadgeSelecao() {
    const badge = document.getElementById("categoriaSelecionadaBadge");

    badge.innerText =
        categoriasSelecionadas.size === 0
            ? "Nenhuma categoria selecionada"
            : `Próxima bateria: ${[...categoriasSelecionadas].join(", ")}`;
}

// Botão "▶ INICIAR LARGADA (5s)" — faz a contagem regressiva de verdade
// e só então dispara uma NOVA bateria com as categorias marcadas. Outras
// baterias já disparadas continuam rodando normalmente durante a espera.
function iniciarLargada() {
    if (eventoEncerrado) {
        alert("O evento já foi encerrado. Não é possível iniciar novas baterias.");
        return;
    }

    if (categoriasSelecionadas.size === 0) {
        alert("Selecione ao menos uma categoria antes de iniciar a largada.");
        return;
    }

    if (contagemRegressivaAtiva) {
        alert("Aguarde a contagem regressiva atual terminar.");
        return;
    }

    const categoriasDaBateria = new Set(categoriasSelecionadas);
    contagemRegressivaAtiva = true;

    const botao = document.getElementById("botaoIniciarLargada");
    botao.disabled = true;

    let restante = 5;
    botao.innerHTML = `<span>⏳</span> Largando em ${restante}...`;

    const intervaloContagem = setInterval(() => {
        restante--;

        if (restante <= 0) {
            clearInterval(intervaloContagem);
            dispararBateria(categoriasDaBateria);

            botao.disabled = false;
            botao.innerHTML = `<span>▶</span> INICIAR LARGADA (5s)`;
            contagemRegressivaAtiva = false;
            return;
        }

        botao.innerHTML = `<span>⏳</span> Largando em ${restante}...`;
    }, 1000);
}

// Cria a bateria de verdade: registra as categorias como "já largadas"
// (bloqueando-as pras próximas seleções) e liga o cronômetro próprio dela.
function dispararBateria(categoriasDaBateria) {
    const primeiraBateriaDoEvento = baterias.length === 0;

    const bateria = {
        id: proximoBateriaId++,
        categorias: categoriasDaBateria,
        segundos: 0,
        intervalo: null,
        status: "ativa"
    };

    baterias.push(bateria);

    if (primeiraBateriaDoEvento) {
        iniciarCronometroGeral();
    }

    categoriasDaBateria.forEach((nome) => {
        categoriasJaLargadas.add(nome);
        categoriasSelecionadas.delete(nome);
    });

    renderizarCartaoBateria(bateria);
    atualizarListaCategorias();
    atualizarBadgeSelecao();

    bateria.intervalo = setInterval(() => {
        bateria.segundos++;
        const relogio = document.getElementById(`bateria-${bateria.id}-clock`);
        if (relogio) {
            relogio.innerText = formatarSegundosParaRelogio(bateria.segundos);
        }
    }, 1000);
}

function renderizarCartaoBateria(bateria) {
    const lista = document.getElementById("listaBaterias");
    const semBaterias = document.getElementById("semBaterias");
    if (semBaterias) semBaterias.remove();

    const card = document.createElement("div");
    card.id = `bateria-${bateria.id}`;
    atualizarCartaoBateria(bateria, card);

    lista.appendChild(card);
}

// Reconstrói o conteúdo do card de uma bateria a partir do estado atual —
// usado tanto na criação quanto depois de encerrar, pra trocar o relógio
// vermelho "ao vivo" pelo estado "encerrada" sem recriar o card inteiro.
function atualizarCartaoBateria(bateria, card) {
    const nomesCategorias = [...bateria.categorias].join(", ");
    const encerrada = bateria.status === "encerrada";

    card.className = `bg-[#0f1115] p-4 rounded-2xl border shadow-lg text-center ${encerrada ? "border-gray-700 opacity-70" : "border-red-500/30"}`;

    card.innerHTML = `
        <span class="text-xs text-gray-400">Bateria #${bateria.id}</span>
        <p class="text-xs ${encerrada ? "text-gray-500" : "text-red-400"} font-semibold mb-1 truncate" title="${nomesCategorias}">${nomesCategorias}</p>
        <div class="font-mono text-2xl md:text-3xl font-bold ${encerrada ? "text-gray-500" : "text-red-500"}" id="bateria-${bateria.id}-clock">${formatarSegundosParaRelogio(bateria.segundos)}</div>
        ${
            encerrada
                ? `<span class="inline-block mt-2 px-2 py-0.5 bg-gray-800 text-gray-400 text-[11px] font-bold rounded-full">✔ Encerrada</span>`
                : `<button onclick="encerrarBateria(${bateria.id})" class="mt-2 w-full py-1.5 bg-gray-800 hover:bg-red-700 text-gray-300 hover:text-white text-[11px] font-bold rounded-lg transition-colors">Encerrar Bateria</button>`
        }
    `;
}

// Congela o cronômetro daquela bateria (tempo final fica registrado) e
// bloqueia novas chegadas pras categorias dela — não afeta outras baterias.
function encerrarBateria(bateriaId) {
    const bateria = baterias.find((b) => b.id === bateriaId);
    if (!bateria || bateria.status === "encerrada") return;

    clearInterval(bateria.intervalo);
    bateria.status = "encerrada";

    const card = document.getElementById(`bateria-${bateria.id}`);
    if (card) {
        atualizarCartaoBateria(bateria, card);
    }

    atualizarListaCategorias();
}

// Encerra oficialmente a cronometragem do evento inteiro: para todas as
// baterias ainda ativas, trava novas largadas e novas chegadas.
function encerrarEvento() {
    if (!eventoAtualId) {
        alert("Selecione e carregue um evento primeiro.");
        return;
    }

    if (eventoEncerrado) {
        return;
    }

    const confirmar = window.confirm(
        "Tem certeza que deseja encerrar oficialmente a cronometragem deste evento? Todas as baterias em andamento serão encerradas e não será mais possível registrar chegadas."
    );
    if (!confirmar) return;

    baterias.forEach((bateria) => {
        if (bateria.status !== "encerrada") {
            encerrarBateria(bateria.id);
        }
    });

    eventoEncerrado = true;
    clearInterval(intervaloGeral);

    const botaoLargada = document.getElementById("botaoIniciarLargada");
    botaoLargada.disabled = true;
    botaoLargada.innerHTML = `<span>🏁</span> Evento Encerrado`;

    const botaoEncerrar = document.getElementById("botaoEncerrarEvento");
    botaoEncerrar.disabled = true;
    botaoEncerrar.innerHTML = `✔ Evento Encerrado`;

    document.getElementById("avisoProvaConcluida").classList.remove("hidden");
}

// 3. Registrar chegada consultando a tabela de inscrições, achando
// automaticamente a bateria certa pela categoria do atleta, e gravando o
// resultado de verdade com o tempo líquido daquela bateria específica.
async function registrarChegada() {
    const input = document.getElementById("inputNumeral");
    const numeral = input.value.trim();

    if (!numeral) {
        alert("Digite o número da placa do atleta.");
        return;
    }

    if (!eventoAtualId) {
        alert("Selecione e carregue um evento primeiro.");
        return;
    }

    if (eventoEncerrado) {
        alert("O evento já foi encerrado. Não é possível registrar novas chegadas.");
        input.value = "";
        return;
    }

    try {
        const { data: inscricao, error } = await supabaseClient
            .from("inscricoes")
            .select("*")
            .eq("evento_id", eventoAtualId)
            .eq("numero", numeral)
            .maybeSingle();

        if (error) throw error;

        if (!inscricao) {
            alert(
                `Placa #${numeral} não encontrada nas inscrições deste evento!`
            );
            input.value = "";
            input.focus();
            return;
        }

        if (inscricao.status !== "confirmado") {
            alert(
                `Placa #${numeral} (${inscricao.nome || "atleta"}) está com inscrição "${inscricao.status}", não confirmada — não é possível registrar a chegada.`
            );
            input.value = "";
            input.focus();
            return;
        }

        const bateriaDaCategoria = baterias.find((b) =>
            b.categorias.has(inscricao.categoria)
        );

        if (!bateriaDaCategoria) {
            alert(
                `Placa #${numeral} é da categoria "${inscricao.categoria}", que ainda não teve a largada disparada em nenhuma bateria.`
            );
            input.value = "";
            input.focus();
            return;
        }

        if (bateriaDaCategoria.status === "encerrada") {
            alert(
                `A Bateria #${bateriaDaCategoria.id} (${inscricao.categoria}) já foi encerrada — não é possível registrar novas chegadas pra ela.`
            );
            input.value = "";
            input.focus();
            return;
        }

        const nomeAtleta = inscricao.nome || "Atleta";
        const horarioAtual = new Date().toLocaleTimeString("pt-BR");
        const tempoProvaSegundos = bateriaDaCategoria.segundos;
        const tempoProvaStr = formatarSegundosParaRelogio(tempoProvaSegundos);

        const { error: erroResultado } = await supabaseClient
            .from("resultados")
            .insert({
                inscricao_id: inscricao.id,
                evento_id: Number(eventoAtualId),
                tempo_liquido_segundos: tempoProvaSegundos,
                registrado_por: sessaoAtual?.user?.id || null
            });

        if (erroResultado) {
            if (erroResultado.code === "23505") {
                alert(`Atleta #${numeral} (${nomeAtleta}) já tinha um resultado registrado.`);
            } else {
                throw erroResultado;
            }
            input.value = "";
            input.focus();
            return;
        }

        document.getElementById("cardUltimoAtleta").innerHTML = `
            <p class="text-xs text-gray-400">Último registo:</p>
            <p class="text-sm font-bold text-emerald-400">#${numeral} - ${nomeAtleta}</p>
            <p class="text-xs text-gray-300 font-mono mt-0.5">Bateria #${bateriaDaCategoria.id} · Tempo: ${tempoProvaStr}</p>
        `;

        const tbody = document.getElementById("tabelaResultados");
        if (
            tbody.innerHTML.includes("Nenhum registo") ||
            tbody.innerHTML.includes("Nenhum registro")
        ) {
            tbody.innerHTML = "";
        }

        const novaLinha = document.createElement("tr");
        novaLinha.className =
            "border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors";
        novaLinha.innerHTML = `
            <td class="py-3 font-mono font-bold text-emerald-400">#${numeral}</td>
            <td class="py-3 font-semibold text-white">${nomeAtleta}</td>
            <td class="py-3 text-gray-300">${inscricao.categoria || "-"}</td>
            <td class="py-3 font-mono text-gray-400">${horarioAtual}</td>
            <td class="py-3 font-mono font-bold text-blue-400">${tempoProvaStr}</td>
        `;

        tbody.prepend(novaLinha);

        input.value = "";
        input.focus();
    } catch (err) {
        console.error("Erro ao registrar chegada:", err.message);
        alert("Erro ao processar o registro no banco de dados.");
    }
}

// 4. Exportar os resultados da prova em PDF, agrupados por categoria e
// ordenados por tempo líquido.
async function exportarResultadosPDF() {
    if (!eventoAtualId) {
        alert("Selecione e carregue um evento primeiro.");
        return;
    }

    try {
        const { data: resultados, error } = await supabaseClient
            .from("resultados_publicos")
            .select("*")
            .eq("evento_id", eventoAtualId);

        if (error) throw error;

        if (!resultados || resultados.length === 0) {
            alert("Nenhum resultado registrado ainda para gerar o PDF.");
            return;
        }

        const porCategoria = {};
        resultados.forEach((r) => {
            const cat = r.categoria || "Sem categoria";
            if (!porCategoria[cat]) porCategoria[cat] = [];
            porCategoria[cat].push(r);
        });

        Object.values(porCategoria).forEach((lista) =>
            lista.sort((a, b) => a.tempo_liquido_segundos - b.tempo_liquido_segundos)
        );

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const nomeEvento =
            document.getElementById("selectEvento").selectedOptions[0]?.text ||
            "Evento";
        const margemInferior = 280;
        let y = 20;

        doc.setFontSize(16);
        doc.text(`Resultados oficiais — ${nomeEvento}`, 14, y);
        y += 8;
        doc.setFontSize(9);
        doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, y);
        y += 12;

        Object.keys(porCategoria).forEach((categoria) => {
            if (y > margemInferior - 20) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(12);
            doc.setFont(undefined, "bold");
            doc.text(categoria, 14, y);
            y += 7;

            doc.setFontSize(9);
            doc.setFont(undefined, "normal");
            doc.text("Pos.", 14, y);
            doc.text("Nº", 32, y);
            doc.text("Nome", 48, y);
            doc.text("Tempo", 160, y);
            y += 5;

            porCategoria[categoria].forEach((resultado, indice) => {
                if (y > margemInferior) {
                    doc.addPage();
                    y = 20;
                }

                doc.text(String(indice + 1), 14, y);
                doc.text(resultado.numero != null ? `#${resultado.numero}` : "-", 32, y);
                doc.text(resultado.nome || "", 48, y);
                doc.text(
                    formatarSegundosParaRelogio(resultado.tempo_liquido_segundos),
                    160,
                    y
                );
                y += 6;
            });

            y += 6;
        });

        doc.save(
            `resultados-${nomeEvento.trim().replace(/\s+/g, "-").toLowerCase()}.pdf`
        );
    } catch (err) {
        console.error("Erro ao exportar PDF:", err.message);
        alert("Erro ao gerar o PDF de resultados.");
    }
}

// --- INICIALIZAÇÃO ---
// O script já roda no fim do <body>, então o DOM já está pronto — não
// precisa esperar window.onload (que só dispara depois de imagens etc.).
async function inicializar() {
    const autorizado = await verificarUsuario();
    if (!autorizado) return;

    await carregarEventosDropdown();

    const parametros = new URLSearchParams(window.location.search);
    const eventoIdDaUrl = parametros.get("evento_id");

    if (eventoIdDaUrl) {
        const select = document.getElementById("selectEvento");
        select.value = eventoIdDaUrl;

        if (select.value === eventoIdDaUrl) {
            carregarDadosEvento();
        }
    }
}

inicializar();

// Atalho: Pressionar 'Enter' no input dispara o registro
document
    .getElementById("inputNumeral")
    .addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            registrarChegada();
        }
    });
