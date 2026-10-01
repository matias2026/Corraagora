// Barra de ferramentas do aplicativo offline: importar evento, exportar/
// sincronizar resultados, e trocar entre a janela de Cronometragem e a de
// Resultados. Não existe nada equivalente no site — só faz sentido aqui.
(function () {
    "use strict";

    const paginaAtual = window.location.pathname.split("/").pop();
    const estaNaResultados = paginaAtual === "resultados.html";

    function escaparTexto(valor) {
        return String(valor)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    function nomeEventoAtual() {
        const dados = window.electronAPI.lerDadosSync();
        return dados.evento ? dados.evento.nome : null;
    }

    function montarBarra() {
        const container = document.getElementById("barraOffline");
        if (!container) return;

        const nomeEvento = nomeEventoAtual();

        container.innerHTML = `
            <div class="barra-offline-inner">
                <div class="barra-offline-status">
                    <strong>📡 Offline</strong>
                    <span>${
                        nomeEvento
                            ? `Evento: ${escaparTexto(nomeEvento)}`
                            : "Nenhum evento importado ainda"
                    }</span>
                </div>
                <div class="barra-offline-botoes">
                    <button type="button" id="botaoImportarEvento">📥 Importar evento</button>
                    <button type="button" id="botaoExportarResultados">📤 Exportar resultados</button>
                    <button type="button" id="botaoSincronizar">☁️ Sincronizar</button>
                    <button type="button" id="botaoNavegarOutraPagina">
                        ${estaNaResultados ? "⏱️ Cronometragem" : "📋 Resultados"}
                    </button>
                </div>
            </div>

            <div id="modalSincronizar" class="barra-offline-modal hidden">
                <div class="barra-offline-modal-caixa">
                    <h3>Sincronizar com o CorraAgora</h3>
                    <p>
                        Entra com seu login do site pra mandar os resultados
                        registrados offline pro banco online. Precisa de
                        internet agora.
                    </p>
                    <label>
                        E-mail
                        <input type="email" id="inputSincEmail" autocomplete="email">
                    </label>
                    <label>
                        Senha
                        <input type="password" id="inputSincSenha" autocomplete="current-password">
                    </label>
                    <div class="barra-offline-modal-acoes">
                        <button type="button" id="botaoCancelarSincronizar">Cancelar</button>
                        <button type="button" id="botaoConfirmarSincronizar">Entrar e sincronizar</button>
                    </div>
                </div>
            </div>
        `;

        document
            .getElementById("botaoImportarEvento")
            .addEventListener("click", importarEvento);
        document
            .getElementById("botaoExportarResultados")
            .addEventListener("click", exportarResultados);
        document
            .getElementById("botaoSincronizar")
            .addEventListener("click", abrirModalSincronizar);
        document
            .getElementById("botaoNavegarOutraPagina")
            .addEventListener("click", () => {
                if (estaNaResultados) {
                    window.electronAPI.abrirCronometragem();
                } else {
                    window.electronAPI.abrirResultados();
                }
            });
        document
            .getElementById("botaoCancelarSincronizar")
            .addEventListener("click", fecharModalSincronizar);
        document
            .getElementById("botaoConfirmarSincronizar")
            .addEventListener("click", confirmarSincronizar);
    }

    async function importarEvento() {
        const resultado = await window.electronAPI.importarEvento();

        if (resultado.cancelado) return;

        if (!resultado.ok) {
            alert(resultado.erro || "Não foi possível importar o evento.");
            return;
        }

        alert(
            `Evento "${resultado.evento.nome}" importado com ${resultado.totalInscritos} inscrito(s). A página vai recarregar.`
        );
        window.location.reload();
    }

    async function exportarResultados() {
        const resultado = await window.electronAPI.exportarResultados();

        if (resultado.cancelado) return;

        if (!resultado.ok) {
            alert(resultado.erro || "Não foi possível exportar os resultados.");
            return;
        }

        alert(`${resultado.total} resultado(s) exportado(s) para:\n${resultado.caminho}`);
    }

    function abrirModalSincronizar() {
        document.getElementById("modalSincronizar").classList.remove("hidden");
    }

    function fecharModalSincronizar() {
        document.getElementById("modalSincronizar").classList.add("hidden");
        document.getElementById("inputSincSenha").value = "";
    }

    async function confirmarSincronizar() {
        const email = document.getElementById("inputSincEmail").value.trim();
        const senha = document.getElementById("inputSincSenha").value;

        if (!email || !senha) {
            alert("Preencha e-mail e senha.");
            return;
        }

        const botao = document.getElementById("botaoConfirmarSincronizar");
        botao.disabled = true;
        botao.textContent = "Sincronizando...";

        const resultado = await window.electronAPI.sincronizar({ email, senha });

        botao.disabled = false;
        botao.textContent = "Entrar e sincronizar";

        if (!resultado.ok) {
            alert(resultado.erro || "Não foi possível sincronizar.");
            return;
        }

        fecharModalSincronizar();

        let mensagem = `✅ ${resultado.enviados} resultado(s) enviado(s).`;

        if (resultado.jaExistiam > 0) {
            mensagem += `\n${resultado.jaExistiam} já estavam sincronizados antes.`;
        }

        if (resultado.falhas.length > 0) {
            mensagem +=
                `\n⚠ ${resultado.falhas.length} falharam:\n` +
                resultado.falhas
                    .map((f) => `Placa #${f.numero ?? "?"}: ${f.erro}`)
                    .join("\n");
        }

        alert(mensagem);
    }

    montarBarra();
})();
