// --- ESTADO GLOBAL ---
// O cliente Supabase (supabaseClient) já vem pronto de assets/js/supabase.js,
// carregado antes deste arquivo — nunca declarar SUPABASE_URL/ANON_KEY/
// supabaseClient aqui de novo, pra não duplicar o que já existe lá.

let sessaoAtual = null;
let perfilAtual = null;

let segundosProva = 0;
let cronometroAtivo = false;
let intervaloCronometro = null;
let eventoAtualId = null;

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

// 2. Puxar dados do evento selecionado (Categorias)
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

        const listaDiv = document.getElementById("listaCategorias");
        listaDiv.innerHTML = "";

        if (!categorias || categorias.length === 0) {
            listaDiv.innerHTML =
                '<p class="text-xs text-gray-400">Nenhuma categoria encontrada para este evento.</p>';
            return;
        }

        categorias.forEach((cat) => {
            listaDiv.innerHTML += `
                <div class="p-3.5 bg-[#0f1115] rounded-xl border border-gray-800 flex justify-between items-center">
                    <div>
                        <span class="font-bold text-white text-sm block">${cat.nome}</span>
                        <span class="text-xs text-gray-400">Aguardando largada</span>
                    </div>
                    <button onclick="selecionarCategoria('${cat.id}', '${cat.nome}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors">
                        Selecionar
                    </button>
                </div>
            `;
        });
    } catch (err) {
        console.error("Erro ao carregar categorias:", err.message);
        alert("Erro ao conectar com o Supabase.");
    }
}

function selecionarCategoria(catId, catNome) {
    document.getElementById("categoriaSelecionadaBadge").innerText =
        `Categoria Ativa: ${catNome}`;

    if (!cronometroAtivo) {
        cronometroAtivo = true;
        intervaloCronometro = setInterval(() => {
            segundosProva++;
            document.getElementById("cronometroGlobal").innerText =
                formatarSegundosParaRelogio(segundosProva);
        }, 1000);
    }
}

// 3. Registrar chegada consultando a tabela de inscrições, e gravar o
// resultado de verdade (antes só atualizava a tela — se a página
// recarregasse, todos os tempos eram perdidos).
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

        const nomeAtleta = inscricao.nome || "Atleta";
        const horarioAtual = new Date().toLocaleTimeString("pt-BR");
        const tempoProvaSegundos = segundosProva;
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
            <p class="text-xs text-gray-300 font-mono mt-0.5">Tempo: ${tempoProvaStr}</p>
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
