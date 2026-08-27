(() => {
  "use strict";

  const modal = document.getElementById("registrationModal");
  const closeButton = document.getElementById("registrationModalClose");
  const form = document.getElementById("registrationForm");
  const submitButton = document.getElementById("registrationSubmitButton");
  const formMessage = document.getElementById("registrationFormMessage");
  const paymentInfoText = document.getElementById("paymentInfoText");

  const nomeInput = document.getElementById("regNome");
  const cpfInput = document.getElementById("regCpf");
  const dataNascimentoInput = document.getElementById("regDataNascimento");
  const sexoInput = document.getElementById("regSexo");
  const emailInput = document.getElementById("regEmail");
  const telefoneInput = document.getElementById("regTelefone");
  const equipeInput = document.getElementById("regEquipe");
  const licencaCbcInput = document.getElementById("regLicencaCbc");
  const cidadeInput = document.getElementById("regCidade");
  const categoriaWrapper = document.getElementById("regCategoriaWrapper");
  const categoriaSelect = document.getElementById("regCategoria");
  const cupomInput = document.getElementById("regCupom");
  const cupomFeedback = document.getElementById("regCupomFeedback");
  const comprovanteInput = document.getElementById("regComprovante");

  window.abrirModalInscricao = function abrirModalInscricao() {
    const evento = window.eventoAtual;
    if (!evento || !modal) return;

    limparMensagem();
    form.reset();
    limparFeedbackCupom();

    paymentInfoText.textContent =
      evento.informacoes_pagamento?.trim() ||
      "O organizador ainda não informou os dados de pagamento. Entre em contato após enviar sua inscrição.";

    preencherCategorias(window.categoriasDoEvento || []);

    modal.classList.remove("hidden");
    document.body.classList.add("menu-open");
  };

  function preencherCategorias(categorias) {
    if (!categorias.length) {
      categoriaWrapper.classList.add("hidden");
      categoriaSelect.innerHTML = "";
      categoriaSelect.required = false;
      return;
    }

    categoriaSelect.innerHTML = categorias
      .map((categoria) => {
        const precoBase =
          categoria.precoAtual !== undefined
            ? categoria.precoAtual
            : categoria.valor;

        const valor =
          precoBase !== null && precoBase !== undefined
            ? Number(precoBase).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })
            : "";

        const percurso = categoria.percurso?.trim();
        const rotulo = percurso
          ? `${categoria.nome} — ${percurso}`
          : categoria.nome;

        const precoAtributo =
          precoBase !== null && precoBase !== undefined
            ? Number(precoBase)
            : "";

        return `<option value="${escaparAtributo(categoria.nome)}" data-preco="${precoAtributo}">${escaparHTML(
          rotulo
        )}${valor ? ` — ${valor}` : ""}</option>`;
      })
      .join("");

    categoriaSelect.required = true;
    categoriaWrapper.classList.remove("hidden");
  }

  function fecharModal() {
    modal.classList.add("hidden");
    document.body.classList.remove("menu-open");
  }

  closeButton?.addEventListener("click", fecharModal);

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      fecharModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      fecharModal();
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    limparMensagem();

    const evento = window.eventoAtual;
    if (!evento) return;

    const arquivo = comprovanteInput.files[0];
    const limiteArquivo = 10 * 1024 * 1024;

    if (arquivo && arquivo.size > limiteArquivo) {
      mostrarMensagem(
        "O comprovante deve ter no máximo 10 MB.",
        "error"
      );
      return;
    }

    const codigoCupomDigitado = cupomInput.value.trim();
    let cupomAplicado = null;

    if (codigoCupomDigitado) {
      const { data: cupomEncontrado, error: erroCupom } = await supabaseClient
        .from("cupons")
        .select("codigo, percentual")
        .eq("evento_id", evento.id)
        .eq("codigo", codigoCupomDigitado.toLowerCase())
        .eq("ativo", true)
        .maybeSingle();

      if (erroCupom) {
        console.error("Erro ao consultar cupom:", erroCupom);
        mostrarMensagem(
          "Não foi possível verificar o cupom agora. Tente novamente.",
          "error"
        );
        return;
      }

      if (!cupomEncontrado) {
        mostrarFeedbackCupom("Cupom inválido ou não está mais ativo.", "error");
        return;
      }

      cupomAplicado = cupomEncontrado;

      mostrarFeedbackCupom(
        cupomAplicado.percentual === 100
          ? "Cupom aplicado! Inscrição gratuita."
          : `Cupom aplicado! ${cupomAplicado.percentual}% de desconto.`,
        "success"
      );
    }

    ativarCarregamento(true);

    try {
      const comprovanteUrl = arquivo
        ? await window.uploadComprovante(arquivo, evento.id)
        : null;

      const precoSelecionado =
        categoriaSelect.selectedOptions[0]?.dataset.preco;

      const valorBase = precoSelecionado ? Number(precoSelecionado) : null;

      const valorPago =
        valorBase !== null && cupomAplicado
          ? Math.round(valorBase * (1 - cupomAplicado.percentual / 100) * 100) / 100
          : valorBase;

      const inscricao = {
        evento_id: evento.id,
        codigo_inscricao: gerarCodigoInscricao(),
        nome: nomeInput.value.trim(),
        cpf: cpfInput.value.trim(),
        data_nascimento: dataNascimentoInput.value,
        sexo: sexoInput.value,
        email: emailInput.value.trim(),
        telefone: telefoneInput.value.trim(),
        equipe: equipeInput.value.trim() || null,
        licenca_cbc: licencaCbcInput.value.trim() || null,
        cidade: cidadeInput.value.trim() || null,
        categoria: categoriaSelect.value || null,
        valor_pago: valorPago,
        cupom_codigo: cupomAplicado?.codigo || null,
        comprovante_url: comprovanteUrl,
        status: "pendente"
      };

      const { error } = await supabaseClient
        .from("inscricoes")
        .insert(inscricao);

      if (error) throw error;

      mostrarMensagem(
        `Inscrição enviada! Seu código é ${inscricao.codigo_inscricao}. ` +
          "Assim que confirmarmos o pagamento, você recebe a confirmação.",
        "success"
      );

      form.reset();
      preencherCategorias(window.categoriasDoEvento || []);
      limparFeedbackCupom();

      setTimeout(fecharModal, 4000);
    } catch (error) {
      console.error("Erro ao enviar inscrição:", error);

      mostrarMensagem(
        error.message ||
          "Não foi possível enviar sua inscrição. Tente novamente.",
        "error"
      );
    } finally {
      ativarCarregamento(false);
    }
  });

  function mostrarMensagem(texto, tipo) {
    formMessage.textContent = texto;
    formMessage.className = `registration-form-message ${tipo}`;
  }

  function limparMensagem() {
    formMessage.textContent = "";
    formMessage.className = "registration-form-message";
  }

  function mostrarFeedbackCupom(texto, tipo) {
    cupomFeedback.textContent = texto;
    cupomFeedback.style.color = tipo === "error" ? "#b91c1c" : "#166534";
  }

  function limparFeedbackCupom() {
    cupomFeedback.textContent = "";
    cupomFeedback.style.color = "";
  }

  function ativarCarregamento(ativo) {
    submitButton.disabled = ativo;
    submitButton.textContent = ativo ? "Enviando..." : "Enviar inscrição";
  }

  function gerarCodigoInscricao() {
    const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase();
    const tempo = Date.now().toString(36).slice(-4).toUpperCase();
    return `CA-${tempo}${aleatorio}`;
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
