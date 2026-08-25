(() => {
  "use strict";

  const form = document.getElementById("lookupForm");
  const submitButton = document.getElementById("lookupSubmitButton");
  const cpfInput = document.getElementById("lookupCpf");
  const emailInput = document.getElementById("lookupEmail");
  const message = document.getElementById("lookupMessage");
  const resultBox = document.getElementById("lookupResult");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    limparResultado();

    const evento = window.eventoAtual;
    if (!evento) return;

    ativarCarregamento(true);

    try {
      const { data, error } = await supabaseClient.rpc(
        "consultar_inscricao",
        {
          p_evento_id: evento.id,
          p_cpf: cpfInput.value.trim(),
          p_email: emailInput.value.trim()
        }
      );

      if (error) throw error;

      const inscricao = (data || [])[0];

      if (!inscricao) {
        mostrarMensagem(
          "Inscrição não encontrada. Confira o CPF e o e-mail " +
            "informados.",
          "error"
        );
        return;
      }

      exibirResultado(inscricao, evento);
    } catch (error) {
      console.error("Erro ao consultar inscrição:", error);

      mostrarMensagem(
        error.message ||
          "Não foi possível consultar sua inscrição agora.",
        "error"
      );
    } finally {
      ativarCarregamento(false);
    }
  });

  function exibirResultado(inscricao, evento) {
    const categoriaAtual = (window.categoriasDoEvento || []).find(
      (categoria) => categoria.nome === inscricao.categoria
    );

    const valorAtual = categoriaAtual?.precoAtual;

    const statusRotulos = {
      pendente: "Pendente",
      confirmado: "Confirmado",
      cancelado: "Cancelado"
    };

    const status = (inscricao.status || "pendente").toLowerCase();

    resultBox.innerHTML = `
      <div class="lookup-result-header">
        <strong>${escaparHTML(inscricao.nome)}</strong>
        <span class="status-pill status-${status}">
          ${escaparHTML(statusRotulos[status] || inscricao.status)}
        </span>
      </div>

      ${
        inscricao.codigo_inscricao
          ? `<p>Código da inscrição: <strong>${escaparHTML(inscricao.codigo_inscricao)}</strong></p>`
          : ""
      }

      ${
        inscricao.categoria
          ? `<p>Categoria: ${escaparHTML(inscricao.categoria)}</p>`
          : ""
      }

      ${
        valorAtual !== undefined && valorAtual !== null
          ? `<p>Valor atual da categoria: ${Number(valorAtual).toLocaleString(
              "pt-BR",
              { style: "currency", currency: "BRL" }
            )}</p>`
          : ""
      }

      ${
        inscricao.comprovante_url
          ? `<p><a href="${escaparAtributo(
              inscricao.comprovante_url
            )}" target="_blank" rel="noopener noreferrer">Ver comprovante enviado</a></p>`
          : "<p>Nenhum comprovante enviado ainda.</p>"
      }

      ${
        status !== "confirmado"
          ? `
            <div class="payment-info-box">
              <strong>Como pagar (segunda via)</strong>
              <p>${escaparHTML(
                evento.informacoes_pagamento?.trim() ||
                  "Entre em contato com o organizador para obter os dados de pagamento."
              )}</p>
            </div>
          `
          : ""
      }
    `;

    resultBox.classList.remove("hidden");
  }

  function mostrarMensagem(texto, tipo) {
    message.textContent = texto;
    message.className = `registration-form-message ${tipo}`;
  }

  function limparResultado() {
    message.textContent = "";
    message.className = "registration-form-message";
    resultBox.classList.add("hidden");
    resultBox.innerHTML = "";
  }

  function ativarCarregamento(ativo) {
    submitButton.disabled = ativo;
    submitButton.textContent = ativo ? "Consultando..." : "Consultar";
  }

  function escaparHTML(valor) {
    return String(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escaparAtributo(valor) {
    return escaparHTML(valor);
  }
})();
