(() => {
    "use strict";

    const selectEvento = document.getElementById("selectEventoResultados");
    const atualizarButton = document.getElementById("atualizarResultadosButton");
    const resultadosContainer = document.getElementById("resultadosContainer");
    const semResultados = document.getElementById("semResultados");

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
            .select("id, nome")
            .eq("status", "aprovado")
            .order("data_evento", { ascending: false });

        if (error) {
            console.error("Erro ao carregar eventos:", error.message);
            return;
        }

        selectEvento.innerHTML = '<option value="">Selecione o evento...</option>';

        (eventos || []).forEach((evento) => {
            const opt = document.createElement("option");
            opt.value = evento.id;
            opt.text = evento.nome;
            selectEvento.add(opt);
        });

        const parametros = new URLSearchParams(window.location.search);
        const eventoIdDaUrl = parametros.get("evento_id");

        if (eventoIdDaUrl) {
            selectEvento.value = eventoIdDaUrl;
            if (selectEvento.value === eventoIdDaUrl) {
                carregarResultados();
            }
        }
    }

    async function carregarResultados() {
        const eventoId = selectEvento.value;

        resultadosContainer.innerHTML = "";
        semResultados.classList.add("hidden");

        if (!eventoId) {
            return;
        }

        const { data: resultados, error } = await supabaseClient
            .from("resultados_publicos")
            .select("*")
            .eq("evento_id", eventoId);

        if (error) {
            console.error("Erro ao carregar resultados:", error.message);
            return;
        }

        if (!resultados || resultados.length === 0) {
            semResultados.classList.remove("hidden");
            return;
        }

        const porCategoria = {};
        resultados.forEach((resultado) => {
            const categoria = resultado.categoria || "Sem categoria";
            if (!porCategoria[categoria]) porCategoria[categoria] = [];
            porCategoria[categoria].push(resultado);
        });

        Object.keys(porCategoria)
            .sort((a, b) => a.localeCompare(b, "pt-BR"))
            .forEach((categoria) => {
                const lista = porCategoria[categoria].sort(
                    (a, b) => a.tempo_liquido_segundos - b.tempo_liquido_segundos
                );

                const linhas = lista
                    .map(
                        (resultado, indice) => `
                            <tr>
                                <td class="resultados-posicao">${indice + 1}º</td>
                                <td>${resultado.numero != null ? `#${resultado.numero}` : "-"}</td>
                                <td>${escaparHTML(resultado.nome)}</td>
                                <td class="resultados-tempo">${formatarSegundosParaRelogio(resultado.tempo_liquido_segundos)}</td>
                            </tr>
                        `
                    )
                    .join("");

                resultadosContainer.innerHTML += `
                    <section class="resultados-categoria">
                        <h2>${escaparHTML(categoria)}</h2>
                        <table class="resultados-tabela">
                            <thead>
                                <tr>
                                    <th>Pos.</th>
                                    <th>Nº</th>
                                    <th>Nome</th>
                                    <th>Tempo</th>
                                </tr>
                            </thead>
                            <tbody>${linhas}</tbody>
                        </table>
                    </section>
                `;
            });
    }

    selectEvento.addEventListener("change", carregarResultados);
    atualizarButton.addEventListener("click", carregarResultados);

    carregarEventos();
})();
