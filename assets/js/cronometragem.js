// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = "https://ymaybquglfajllruqub.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_l3qNE9dzBeefjdKpRyzVOg_bkm51ZI4";

// Inicializa o cliente do Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Relógio em tempo real no cabeçalho
setInterval(() => {
    const agora = new Date();
    document.getElementById("relogioAtual").innerText =
        agora.toLocaleTimeString("pt-BR");
}, 1000);

let segundosProva = 0;
let cronometroAtivo = false;
let intervaloCronometro = null;
let eventoAtualId = null;

// 1. Carregar eventos reais do Supabase ao iniciar a página
async function carregarEventosDropdown() {
    try {
        const { data: eventos, error } = await supabaseClient
            .from("eventos")
            .select("id, nome");

        if (error) throw error;

        const select = document.getElementById("selectEvento");
        select.innerHTML = '<option value="">Selecione o Evento...</option>';

        eventos.forEach((evento) => {
            const opt = document.createElement("option");
            opt.value = evento.id;
            opt.text = evento.nome;
            select.add(opt);
        });
    } catch (err) {
        console.error("Erro ao carregar eventos:", err.message);
    }
}

// Executa ao carregar a página
window.onload = () => {
    carregarEventosDropdown();
};

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

        alert("Categorias carregadas com sucesso!");
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
            let hrs = Math.floor(segundosProva / 3600)
                .toString()
                .padStart(2, "0");
            let mins = Math.floor((segundosProva % 3600) / 60)
                .toString()
                .padStart(2, "0");
            let secs = (segundosProva % 60).toString().padStart(2, "0");
            document.getElementById("cronometroGlobal").innerText =
                `${hrs}:${mins}:${secs}`;
        }, 1000);
    }
}

// 3. Registrar chegada consultando a tabela de inscrições
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
        // Busca na tabela inscricoes pelo número da placa e ID do evento
        const { data: inscricao, error } = await supabaseClient
            .from("inscricoes")
            .select("*")
            .eq("evento_id", eventoAtualId)
            .eq("numero", numeral) // Ajuste para o nome da coluna da placa na sua tabela inscricoes, se necessário
            .single();

        if (error || !inscricao) {
            alert(
                `Placa #${numeral} não encontrada nas inscrições deste evento!`
            );
            input.value = "";
            input.focus();
            return;
        }

        const nomeAtleta = inscricao.nome_atleta || "Atleta";
        const horarioAtual = new Date().toLocaleTimeString("pt-BR");
        const tempoProvaStr =
            document.getElementById("cronometroGlobal").innerText;

        // Atualiza o card do último atleta na tela
        document.getElementById("cardUltimoAtleta").innerHTML = `
            <p class="text-xs text-gray-400">Último registro:</p>
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
            <td class="py-3 text-gray-300">Geral</td>
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

// Atalho: Pressionar 'Enter' no input dispara o registro
document
    .getElementById("inputNumeral")
    .addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            registrarChegada();
        }
    });
