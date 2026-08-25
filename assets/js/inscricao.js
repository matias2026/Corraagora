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
  const comprovanteInput = document.getElementById("regComprovante");

  window.abrirModalInscricao = function abrirModalInscricao() {
    const evento = window.eventoAtual;
    if (!evento || !modal) return;

    limparMensagem();
    form.reset();

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

        return `<option value="${escaparAtributo(categoria.nome)}">${escaparHTML(
          categoria.nome
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

    ativarCarregamento(true);

    try {
      const comprovanteUrl = arquivo
        ? await window.uploadComprovante(arquivo, evento.id)
        : null;

      const inscricao = {
        evento_id: evento.id,
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
        comprovante_url: comprovanteUrl,
        status: "pendente"
      };

      const { error } = await supabaseClient
        .from("inscricoes")
        .insert(inscricao);

      if (error) throw error;

      mostrarMensagem(
        "Inscrição enviada! Assim que confirmarmos o pagamento, " +
          "você recebe a confirmação.",
        "success"
      );

      form.reset();
      preencherCategorias(window.categoriasDoEvento || []);

      setTimeout(fecharModal, 2600);
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

  function ativarCarregamento(ativo) {
    submitButton.disabled = ativo;
    submitButton.textContent = ativo ? "Enviando..." : "Enviar inscrição";
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
