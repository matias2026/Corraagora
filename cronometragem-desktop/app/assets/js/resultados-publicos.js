(() => {
    "use strict";

    const selectEvento = document.getElementById("selectEventoResultados");
    const selectAnoFiltro = document.getElementById("selectAnoFiltro");
    const selectModalidadeFiltro = document.getElementById("selectModalidadeFiltro");
    const atualizarButton = document.getElementById("atualizarResultadosButton");
    const resultadosContainer = document.getElementById("resultadosContainer");
    const semResultados = document.getElementById("semResultados");

    let eventosCache = [];

    function formatarSegundosParaRelogio(totalSegundos) {
        const segundos = Math.max(0, Math.floor(totalSegundos || 0));
        const hrs = Math.floor(segundos / 3600).toString().padStart(2, "0");
        const mins = Math.floor((segundos % 3600) / 60).toString().padStart(2, "0");
        const secs = (segundos % 60).toString().padStart(2, "0");
        return `${hrs}:${mins}:${secs}`;
    }

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function carregarEventos() {
        const { data: eventos, error } = await supabaseClient
            .from("eventos")
            .select("id, nome, data_evento, modalidade")
            .eq("status", "aprovado")
            .order("data_evento", { ascending: false });

        if (error) {
            console.error("Erro ao carregar eventos:", error.message);
            return;
        }

        eventosCache = eventos || [];

        popularFiltroAno();
        popularFiltroModalidade();
        popularSelectEventos();

        const parametros = new URLSearchParams(window.location.search);
        const eventoIdDaUrl = parametros.get("evento_id");

        if (eventoIdDaUrl) {
            selectEvento.value = eventoIdDaUrl;
            if (selectEvento.value === eventoIdDaUrl) {
                carregarResultados();
            }
        }
    }

    // Anos e modalidades das opções vêm sempre dos eventos carregados —
    // nunca aparece um filtro pra um ano/modalidade que não tem evento.
    function popularFiltroAno() {
        const anos = [...new Set(
            eventosCache
                .filter((evento) => evento.data_evento)
                .map((evento) => evento.data_evento.slice(0, 4))
        )].sort((a, b) => b.localeCompare(a));

        selectAnoFiltro.innerHTML = '<option value="">Todos os anos</option>';
        anos.forEach((ano) => {
            const opt = document.createElement("option");
            opt.value = ano;
            opt.text = ano;
            selectAnoFiltro.add(opt);
        });
    }

    function popularFiltroModalidade() {
        const modalidades = [...new Set(
            eventosCache
                .filter((evento) => evento.modalidade)
                .map((evento) => evento.modalidade)
        )].sort((a, b) => a.localeCompare(b, "pt-BR"));

        selectModalidadeFiltro.innerHTML = '<option value="">Todas as modalidades</option>';
        modalidades.forEach((modalidade) => {
            const opt = document.createElement("option");
            opt.value = modalidade;
            opt.text = modalidade;
            selectModalidadeFiltro.add(opt);
        });
    }

    // Re-monta a lista de eventos selecionáveis a partir do cache, aplicando
    // os filtros de ano/modalidade marcados — sem precisar consultar o
    // Supabase de novo a cada troca de filtro.
    function popularSelectEventos() {
        const anoFiltrado = selectAnoFiltro.value;
        const modalidadeFiltrada = selectModalidadeFiltro.value;

        const filtrados = eventosCache.filter((evento) => {
            const anoOk = !anoFiltrado || (evento.data_evento || "").startsWith(anoFiltrado);
            const modalidadeOk = !modalidadeFiltrada || evento.modalidade === modalidadeFiltrada;
            return anoOk && modalidadeOk;
        });

        const selecaoAnterior = selectEvento.value;

        selectEvento.innerHTML = '<option value="">Selecione o evento...</option>';
        filtrados.forEach((evento) => {
            const opt = document.createElement("option");
            opt.value = evento.id;
            opt.text = evento.nome;
            selectEvento.add(opt);
        });

        if (filtrados.some((evento) => String(evento.id) === selecaoAnterior)) {
            selectEvento.value = selecaoAnterior;
        } else {
            resultadosContainer.innerHTML = "";
            semResultados.classList.add("hidden");
        }
    }

    // Percurso da aba marcada — persiste entre atualizações do mesmo
    // evento, mas é recalculado quando o evento selecionado muda.
    let percursoAtivo = null;
    let ultimoEventoId = null;

    function formatarRitmo(tempoSegundos, distanciaKm) {
        const segundosPorKm = tempoSegundos / distanciaKm;
        const mins = Math.floor(segundosPorKm / 60);
        const secs = Math.round(segundosPorKm % 60).toString().padStart(2, "0");
        return `${mins}:${secs} /km`;
    }

    async function carregarResultados() {
        const eventoId = selectEvento.value;

        resultadosContainer.innerHTML = "";
        semResultados.classList.add("hidden");

        if (!eventoId) {
            return;
        }

        if (eventoId !== ultimoEventoId) {
            percursoAtivo = null;
            ultimoEventoId = eventoId;
        }

        const [resultadosResp, inscritosResp] = await Promise.all([
            supabaseClient
                .from("resultados_publicos")
                .select("*")
                .eq("evento_id", eventoId),
            supabaseClient
                .from("inscritos_por_categoria_publico")
                .select("*")
                .eq("evento_id", eventoId)
        ]);

        if (resultadosResp.error) {
            console.error("Erro ao carregar resultados:", resultadosResp.error.message);
            return;
        }

        if (inscritosResp.error) {
            console.error("Erro ao carregar contagem de inscritos:", inscritosResp.error.message);
        }

        const resultados = resultadosResp.data || [];

        if (resultados.length === 0) {
            semResultados.classList.remove("hidden");
            return;
        }

        const totalPorCategoria = {};
        (inscritosResp.data || []).forEach((linha) => {
            totalPorCategoria[linha.categoria] = linha.total_inscritos;
        });

        // Posição geral: ranking de todo mundo no evento por tempo, sem
        // separar por categoria nem por percurso.
        const geralOrdenado = [...resultados].sort(
            (a, b) => a.tempo_liquido_segundos - b.tempo_liquido_segundos
        );
        const posicaoGeralPorNumero = new Map();
        geralOrdenado.forEach((resultado, indice) => {
            posicaoGeralPorNumero.set(resultado.numero, indice + 1);
        });

        renderizarResultadosComAbas(resultados, totalPorCategoria, posicaoGeralPorNumero);
    }

    // Abas por percurso só aparecem quando o evento tem mais de um percurso
    // registrado nas categorias — evento com um único percurso (ou nenhum
    // preenchido) mostra as categorias direto, sem abas.
    function renderizarResultadosComAbas(resultados, totalPorCategoria, posicaoGeralPorNumero) {
        const percursos = [...new Set(resultados.map((r) => r.percurso || "Geral"))];

        if (!percursoAtivo || !percursos.includes(percursoAtivo)) {
            percursoAtivo = percursos[0];
        }

        const abasHTML =
            percursos.length > 1
                ? `
                    <div class="resultados-abas">
                        ${percursos
                            .map(
                                (percurso) => `
                                    <button type="button" class="resultados-aba ${percurso === percursoAtivo ? "ativa" : ""}" data-percurso="${escaparHTML(percurso)}">
                                        ${escaparHTML(percurso)}
                                    </button>
                                `
                            )
                            .join("")}
                    </div>
                `
                : "";

        const resultadosDoPercurso = resultados.filter(
            (r) => (r.percurso || "Geral") === percursoAtivo
        );

        resultadosContainer.innerHTML =
            abasHTML + montarHTMLCategorias(resultadosDoPercurso, totalPorCategoria, posicaoGeralPorNumero);

        resultadosContainer.querySelectorAll(".resultados-aba").forEach((botao) => {
            botao.addEventListener("click", () => {
                percursoAtivo = botao.dataset.percurso;
                renderizarResultadosComAbas(resultados, totalPorCategoria, posicaoGeralPorNumero);
            });
        });
    }

    function montarHTMLCategorias(resultados, totalPorCategoria, posicaoGeralPorNumero) {
        const porCategoria = {};
        resultados.forEach((resultado) => {
            const categoria = resultado.categoria || "Sem categoria";
            if (!porCategoria[categoria]) porCategoria[categoria] = [];
            porCategoria[categoria].push(resultado);
        });

        return Object.keys(porCategoria)
            .sort((a, b) => a.localeCompare(b, "pt-BR"))
            .map((categoria) => {
                const lista = porCategoria[categoria].sort(
                    (a, b) => a.tempo_liquido_segundos - b.tempo_liquido_segundos
                );

                const tempoLider = lista[0].tempo_liquido_segundos;
                const totalInscritos = totalPorCategoria[categoria];
                const completaramTexto = totalInscritos
                    ? `${lista.length}/${totalInscritos} completaram`
                    : `${lista.length} completaram`;

                const linhas = lista
                    .map((resultado, indice) => {
                        const intervalo =
                            indice === 0
                                ? "—"
                                : `+${formatarSegundosParaRelogio(resultado.tempo_liquido_segundos - tempoLider)}`;

                        const distanciaKm = resultado.distancia_km ? Number(resultado.distancia_km) : null;
                        const ritmo = distanciaKm
                            ? formatarRitmo(resultado.tempo_liquido_segundos, distanciaKm)
                            : "—";

                        return `
                            <tr>
                                <td class="resultados-posicao">${posicaoGeralPorNumero.get(resultado.numero)}º</td>
                                <td class="resultados-posicao">${indice + 1}º</td>
                                <td>${resultado.numero != null ? `#${resultado.numero}` : "-"}</td>
                                <td>${escaparHTML(resultado.nome)}</td>
                                <td class="resultados-tempo">${formatarSegundosParaRelogio(resultado.tempo_liquido_segundos)}</td>
                                <td>${intervalo}</td>
                                <td>${ritmo}</td>
                            </tr>
                        `;
                    })
                    .join("");

                return `
                    <section class="resultados-categoria">
                        <div class="resultados-categoria-header">
                            <h2>${escaparHTML(categoria)}</h2>
                            <span class="resultados-completaram">${completaramTexto}</span>
                        </div>
                        <table class="resultados-tabela">
                            <thead>
                                <tr>
                                    <th>Geral</th>
                                    <th>Cat.</th>
                                    <th>Nº</th>
                                    <th>Nome</th>
                                    <th>Tempo</th>
                                    <th>Intervalo</th>
                                    <th>Ritmo</th>
                                </tr>
                            </thead>
                            <tbody>${linhas}</tbody>
                        </table>
                    </section>
                `;
            })
            .join("");
    }

    selectEvento.addEventListener("change", carregarResultados);
    atualizarButton.addEventListener("click", carregarResultados);
    selectAnoFiltro.addEventListener("change", popularSelectEventos);
    selectModalidadeFiltro.addEventListener("change", popularSelectEventos);

    carregarEventos();
})();
