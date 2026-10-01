// --- BANCO DE DADOS LOCAL (substitui o Supabase, 100% offline) ---
//
// cronometragem.js e resultados-publicos.js (copiados do site, sem
// nenhuma alteração) esperam encontrar um objeto global "supabaseClient"
// com os métodos .from(tabela).select()/.insert()/.update()/.eq()/
// .order()/.single()/.maybeSingle() e .auth.getSession(). Este arquivo
// implementa exatamente essa mesma "forma", mas por baixo dos panos lê e
// grava num arquivo local do computador (via window.electronAPI, exposto
// pelo preload.js) em vez de fazer qualquer chamada de rede — por isso
// tudo funciona sem internet.
//
// Import/sincronização de verdade (arquivos, Supabase online) ficam no
// processo principal do Electron (main.js); aqui dentro só existe leitura
// e escrita no estado local já carregado.

let armazenamento = window.electronAPI.lerDadosSync();

function persistir() {
    return window.electronAPI.salvarDados(armazenamento);
}

// Recarrega o estado em memória (chamado depois de importar um evento ou
// de qualquer outra mudança feita fora da página, tipo pelo processo
// principal) e dispara os carregamentos de tela de novo.
function recarregarArmazenamento() {
    armazenamento = window.electronAPI.lerDadosSync();
    if (typeof window.recarregarTelaAposImportar === "function") {
        window.recarregarTelaAposImportar();
    }
}
window.recarregarArmazenamentoLocal = recarregarArmazenamento;

function clonar(valor) {
    return valor === undefined || valor === null
        ? valor
        : JSON.parse(JSON.stringify(valor));
}

function compararFrouxo(a, b) {
    // "numero" chega como string do campo de texto, mas é guardado como
    // número — compara convertendo os dois pro mesmo tipo.
    return String(a) === String(b);
}

function montarResultadosPublicos(eventoId) {
    const mapaInscricoes = new Map(
        armazenamento.inscricoes.map((inscricao) => [inscricao.id, inscricao])
    );
    const mapaCategorias = new Map(
        armazenamento.categorias.map((categoria) => [categoria.nome, categoria])
    );

    return armazenamento.resultados
        .filter((resultado) => compararFrouxo(resultado.evento_id, eventoId))
        .map((resultado) => {
            const inscricao = mapaInscricoes.get(resultado.inscricao_id) || {};
            const categoria = mapaCategorias.get(inscricao.categoria) || {};

            return {
                evento_id: resultado.evento_id,
                numero: inscricao.numero ?? null,
                nome: inscricao.nome || "",
                categoria: inscricao.categoria || null,
                tempo_liquido_segundos: resultado.tempo_liquido_segundos,
                horario_chegada: resultado.horario_chegada,
                percurso: categoria.percurso || null,
                distancia_km: categoria.distancia_km || null
            };
        });
}

function montarInscritosPorCategoriaPublico(eventoId) {
    const contagem = {};

    armazenamento.inscricoes
        .filter(
            (inscricao) =>
                compararFrouxo(armazenamento.evento?.id, eventoId) &&
                inscricao.status === "confirmado"
        )
        .forEach((inscricao) => {
            const categoria = inscricao.categoria || "Sem categoria";
            contagem[categoria] = (contagem[categoria] || 0) + 1;
        });

    return Object.entries(contagem).map(([categoria, total]) => ({
        evento_id: eventoId,
        categoria,
        total_inscritos: total
    }));
}

async function executar(tabela, estado) {
    if (tabela === "profiles") {
        // Página offline não tem login — qualquer um que abriu o
        // programa já "é" o organizador/admin dono dos dados locais.
        return { data: { role: "admin", status_organizador: "aprovado" }, error: null };
    }

    if (tabela === "eventos") {
        if (estado.op === "select") {
            if (estado.filtros.id !== undefined) {
                if (!armazenamento.evento || !compararFrouxo(armazenamento.evento.id, estado.filtros.id)) {
                    return { data: null, error: null };
                }
                return { data: clonar(armazenamento.evento), error: null };
            }

            const lista = armazenamento.evento ? [clonar(armazenamento.evento)] : [];
            return { data: lista, error: null };
        }

        if (estado.op === "update") {
            if (armazenamento.evento) {
                Object.assign(armazenamento.evento, estado.payload);
                await persistir();
            }
            return { data: null, error: null };
        }
    }

    if (tabela === "categorias") {
        return { data: clonar(armazenamento.categorias), error: null };
    }

    if (tabela === "inscricoes") {
        if (estado.op === "select") {
            let lista = armazenamento.inscricoes;

            if (estado.filtros.numero !== undefined) {
                lista = lista.filter((inscricao) =>
                    compararFrouxo(inscricao.numero, estado.filtros.numero)
                );
            }

            if (estado.unico) {
                return { data: lista.length > 0 ? clonar(lista[0]) : null, error: null };
            }

            return { data: clonar(lista), error: null };
        }
    }

    if (tabela === "cronometragem_baterias") {
        if (estado.op === "select") {
            const lista = [...armazenamento.cronometragem_baterias].sort(
                (a, b) => new Date(a.horario_largada) - new Date(b.horario_largada)
            );
            return { data: clonar(lista), error: null };
        }

        if (estado.op === "insert") {
            const linha = {
                id: armazenamento.proximoBateriaId++,
                evento_id: estado.payload.evento_id,
                categorias: estado.payload.categorias,
                status: "ativa",
                horario_largada: new Date().toISOString(),
                horario_encerrada: null,
                criado_por: estado.payload.criado_por || null
            };
            armazenamento.cronometragem_baterias.push(linha);
            await persistir();
            return { data: clonar(linha), error: null };
        }

        if (estado.op === "update") {
            const linha = armazenamento.cronometragem_baterias.find((bateria) =>
                compararFrouxo(bateria.id, estado.filtros.id)
            );
            if (!linha) {
                return { data: null, error: { message: "Bateria não encontrada." } };
            }
            Object.assign(linha, estado.payload);
            await persistir();
            return { data: clonar(linha), error: null };
        }
    }

    if (tabela === "resultados") {
        if (estado.op === "insert") {
            const jaExiste = armazenamento.resultados.some((resultado) =>
                compararFrouxo(resultado.inscricao_id, estado.payload.inscricao_id)
            );

            if (jaExiste) {
                return {
                    data: null,
                    error: { code: "23505", message: "Já existe um resultado para essa inscrição." }
                };
            }

            const linha = {
                id: armazenamento.proximoResultadoId++,
                inscricao_id: estado.payload.inscricao_id,
                evento_id: estado.payload.evento_id,
                tempo_liquido_segundos: estado.payload.tempo_liquido_segundos,
                registrado_por: estado.payload.registrado_por || null,
                horario_chegada: new Date().toISOString(),
                sincronizado: false
            };
            armazenamento.resultados.push(linha);
            await persistir();
            return { data: clonar(linha), error: null };
        }
    }

    if (tabela === "resultados_publicos") {
        const eventoId = estado.filtros.evento_id ?? armazenamento.evento?.id;
        return { data: montarResultadosPublicos(eventoId), error: null };
    }

    if (tabela === "inscritos_por_categoria_publico") {
        const eventoId = estado.filtros.evento_id ?? armazenamento.evento?.id;
        return { data: montarInscritosPorCategoriaPublico(eventoId), error: null };
    }

    return { data: null, error: null };
}

function makeBuilder(tabela) {
    const estado = { filtros: {}, op: null, payload: null, unico: false };

    const builder = {
        select() {
            if (!estado.op) estado.op = "select";
            return builder;
        },
        insert(objeto) {
            estado.op = "insert";
            estado.payload = objeto;
            return builder;
        },
        update(objeto) {
            estado.op = "update";
            estado.payload = objeto;
            return builder;
        },
        eq(coluna, valor) {
            estado.filtros[coluna] = valor;
            if (!estado.op) estado.op = "select";
            return builder;
        },
        order() {
            if (!estado.op) estado.op = "select";
            return builder;
        },
        single() {
            estado.unico = true;
            return builder;
        },
        maybeSingle() {
            estado.unico = true;
            return builder;
        },
        then(resolve, reject) {
            if (!estado.op) estado.op = "select";
            executar(tabela, estado).then(resolve, reject);
        }
    };

    return builder;
}

window.supabaseClient = {
    auth: {
        // Página offline não tem login de verdade — sempre "logado" como
        // o organizador local assim que o programa abre.
        async getSession() {
            return { data: { session: { user: { id: "organizador-offline" } } } };
        }
    },
    from(tabela) {
        return makeBuilder(tabela);
    }
};
