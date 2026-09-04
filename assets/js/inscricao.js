(() => {
  "use strict";

  const RECAPTCHA_SITE_KEY = "6LeOOqctAAAAAA7KkRcp7AIuNKNHFdS2BGGogB0Z";

  function obterTokenRecaptcha(acao) {
    return new Promise((resolve) => {
      if (!window.grecaptcha?.execute) {
        resolve(null);
        return;
      }
      window.grecaptcha.ready(() => {
        window.grecaptcha
          .execute(RECAPTCHA_SITE_KEY, { action: acao })
          .then(resolve)
          .catch(() => resolve(null));
      });
    });
  }

  const modal = document.getElementById("registrationModal");
  const closeButton = document.getElementById("registrationModalClose");
  const form = document.getElementById("registrationForm");
  const submitButton = document.getElementById("registrationSubmitButton");
  const formMessage = document.getElementById("registrationFormMessage");
  const paymentInfoText = document.getElementById("paymentInfoText");
  const paymentPixBox = document.getElementById("paymentPixBox");
  const paymentPixKey = document.getElementById("paymentPixKey");
  const paymentPixCopyButton = document.getElementById("paymentPixCopyButton");
  const paymentLinkButton = document.getElementById("paymentLinkButton");

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

  const declaracaoSaudeInput = document.getElementById("regDeclaracaoSaude");
  const aceiteTermosInput = document.getElementById("regAceiteTermos");
  const linkRegulamento = document.getElementById("regLinkRegulamento");

  [declaracaoSaudeInput, aceiteTermosInput].forEach((input) => {
    input?.addEventListener("change", () => {
      if (input.checked) {
        input.closest(".registration-terms-item")?.classList.remove(
          "termo-invalido"
        );
      }
    });
  });

  linkRegulamento?.addEventListener("click", (event) => {
    if (!linkRegulamento.getAttribute("href") || linkRegulamento.getAttribute("href") === "#") {
      event.preventDefault();
      window.mostrarToast?.(
        "O organizador ainda não enviou o regulamento oficial deste evento.",
        "erro"
      );
    }
  });

  const regContaLogada = document.getElementById("regContaLogada");
  const regContaDeslogada = document.getElementById("regContaDeslogada");
  const radiosParaQuem = document.querySelectorAll(
    'input[name="regParaQuem"]'
  );

  window.aplicarMascaraCPF?.(cpfInput);
  window.aplicarMascaraData?.(dataNascimentoInput);

  window.ativarRevalidacaoAoDigitar?.(nomeInput, (input) =>
    window.validarCampoObrigatorio(input, "Digite o nome completo.")
  );
  window.ativarRevalidacaoAoDigitar?.(cpfInput, (input) =>
    window.validarCampoCPF(input)
  );
  window.ativarRevalidacaoAoDigitar?.(dataNascimentoInput, (input) =>
    window.validarCampoData(input)
  );
  window.ativarRevalidacaoAoDigitar?.(sexoInput, (input) =>
    window.validarCampoObrigatorio(input, "Selecione o sexo.")
  );
  window.ativarRevalidacaoAoDigitar?.(emailInput, (input) =>
    window.validarCampoEmail(input)
  );
  window.ativarRevalidacaoAoDigitar?.(telefoneInput, (input) =>
    window.validarCampoObrigatorio(input, "Digite um telefone para contato.")
  );

  let sessaoAtual = null;
  let dadosProprios = null;

  radiosParaQuem.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.value === "mim" && radio.checked) {
        preencherDadosProprios();
      } else if (radio.value === "amigo" && radio.checked) {
        limparDadosPessoais();
      }
    });
  });

  function preencherDadosProprios() {
    if (!dadosProprios) return;

    nomeInput.value = dadosProprios.nome || "";
    cpfInput.value = window.formatarCPF(dadosProprios.cpf || "");
    dataNascimentoInput.value = dadosProprios.data_nascimento
      ? window.converterDataISOparaBR(dadosProprios.data_nascimento)
      : "";
    sexoInput.value = dadosProprios.sexo || "";
    emailInput.value = dadosProprios.email || "";
    telefoneInput.value = dadosProprios.telefone || "";
    equipeInput.value = dadosProprios.equipe || "";
    licencaCbcInput.value = dadosProprios.licenca_cbc || "";
    cidadeInput.value = dadosProprios.cidade || "";
  }

  function limparDadosPessoais() {
    nomeInput.value = "";
    cpfInput.value = "";
    dataNascimentoInput.value = "";
    sexoInput.value = "";
    emailInput.value = "";
    telefoneInput.value = "";
    equipeInput.value = "";
    licencaCbcInput.value = "";
    cidadeInput.value = "";
  }

  window.abrirModalInscricao = async function abrirModalInscricao() {
    const evento = window.eventoAtual;
    if (!evento || !modal) return;

    limparMensagem();
    form.reset();
    limparFeedbackCupom();

    document
      .querySelectorAll(".registration-terms-item")
      .forEach((item) => item.classList.remove("termo-invalido"));

    if (evento.regulamento_url) {
      linkRegulamento.href = evento.regulamento_url;
    } else {
      linkRegulamento.href = "#";
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    sessaoAtual = session;
    dadosProprios = null;

    if (session) {
      regContaLogada.classList.remove("hidden");
      regContaDeslogada.classList.add("hidden");

      document.querySelector(
        'input[name="regParaQuem"][value="mim"]'
      ).checked = true;

      const { data: ultimaInscricao } = await supabaseClient
        .from("inscricoes")
        .select(
          "nome, cpf, data_nascimento, sexo, email, telefone, equipe, licenca_cbc, cidade"
        )
        .eq("usuario_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      dadosProprios = ultimaInscricao || {
        email: session.user.email,
        nome: session.user.user_metadata?.full_name || ""
      };

      preencherDadosProprios();
    } else {
      regContaLogada.classList.add("hidden");
      regContaDeslogada.classList.remove("hidden");
    }

    const nomeEBanco = evento.informacoes_pagamento?.trim();
    const chavePix = evento.chave_pix?.trim();
    const linkPagamento = evento.link_pagamento?.trim();

    if (nomeEBanco) {
      paymentInfoText.textContent = nomeEBanco;
    } else if (chavePix || linkPagamento) {
      paymentInfoText.textContent = "Confira os dados de pagamento abaixo.";
    } else {
      paymentInfoText.textContent =
        "O organizador ainda não informou os dados de pagamento. Entre em contato após enviar sua inscrição.";
    }

    if (chavePix) {
      paymentPixKey.textContent = chavePix;
      paymentPixBox.classList.remove("hidden");
    } else {
      paymentPixBox.classList.add("hidden");
    }

    const linkPagamentoSeguro = window.sanitizarUrlExterna(linkPagamento);

    if (linkPagamentoSeguro) {
      paymentLinkButton.href = linkPagamentoSeguro;
      paymentLinkButton.classList.remove("hidden");
    } else {
      paymentLinkButton.classList.add("hidden");
    }

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

  paymentPixCopyButton?.addEventListener("click", () => {
    const chave = paymentPixKey.textContent;
    if (!chave) return;

    navigator.clipboard.writeText(chave).then(() => {
      const textoOriginal = paymentPixCopyButton.textContent;
      paymentPixCopyButton.textContent = "Copiado!";
      setTimeout(() => {
        paymentPixCopyButton.textContent = textoOriginal;
      }, 1500);
    });
  });

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

    const nomeValido = window.validarCampoObrigatorio(
      nomeInput,
      "Digite o nome completo."
    );
    const cpfValido = window.validarCampoCPF(cpfInput);
    const dataNascimentoValida = window.validarCampoData(dataNascimentoInput);
    const sexoValido = window.validarCampoObrigatorio(
      sexoInput,
      "Selecione o sexo."
    );
    const emailValido = window.validarCampoEmail(emailInput);
    const telefoneValido = window.validarCampoObrigatorio(
      telefoneInput,
      "Digite um telefone para contato."
    );
    const categoriaValida =
      categoriaWrapper.classList.contains("hidden") ||
      window.validarCampoObrigatorio(categoriaSelect, "Escolha uma categoria.");

    if (
      !nomeValido ||
      !cpfValido ||
      !dataNascimentoValida ||
      !sexoValido ||
      !emailValido ||
      !telefoneValido ||
      !categoriaValida
    ) {
      window.mostrarToast?.(
        "Confira os campos destacados antes de enviar.",
        "erro"
      );
      return;
    }

    const declaracaoSaudeItem = declaracaoSaudeInput.closest(
      ".registration-terms-item"
    );
    const aceiteTermosItem = aceiteTermosInput.closest(
      ".registration-terms-item"
    );

    declaracaoSaudeItem.classList.toggle(
      "termo-invalido",
      !declaracaoSaudeInput.checked
    );
    aceiteTermosItem.classList.toggle(
      "termo-invalido",
      !aceiteTermosInput.checked
    );

    if (!declaracaoSaudeInput.checked || !aceiteTermosInput.checked) {
      mostrarMensagem(
        "Você precisa aceitar os dois termos acima para enviar a inscrição.",
        "error"
      );
      return;
    }

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
      const { data: cuponsEncontrados, error: erroCupom } = await supabaseClient
        .rpc("validar_cupom", {
          p_evento_id: evento.id,
          p_codigo: codigoCupomDigitado.toLowerCase()
        });

      const cupomEncontrado = cuponsEncontrados?.[0] || null;

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
      const recaptchaToken = await obterTokenRecaptcha("inscricao");

      if (!recaptchaToken) {
        mostrarMensagem(
          "Não foi possível validar o reCAPTCHA. Recarregue a página e tente novamente.",
          "error"
        );
        return;
      }

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
        data_nascimento: window.converterDataBRparaISO(
          dataNascimentoInput.value
        ),
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
        status: "pendente",
        usuario_id: sessaoAtual?.user?.id || null
      };

      const resposta = await fetch("/api/inscricao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recaptchaToken,
          inscricao,
          accessToken: sessaoAtual?.access_token || null
        })
      });

      const resultado = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(
          resultado.erro ||
            "Não foi possível enviar sua inscrição. Tente novamente."
        );
      }

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

    window.mostrarToast?.(
      texto,
      tipo === "success" ? "sucesso" : "erro"
    );
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
