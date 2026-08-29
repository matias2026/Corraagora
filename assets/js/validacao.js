(() => {
    "use strict";

    if (window.__validacaoCorraAgoraCarregada) return;
    window.__validacaoCorraAgoraCarregada = true;

    const estilos = document.createElement("style");
    estilos.textContent = `
        .campo-invalido {
            border-color: #dc2626 !important;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, .12) !important;
        }

        .erro-campo {
            display: block;
            color: #dc2626;
            font-size: 12.5px;
            font-weight: 600;
            margin-top: 6px;
            line-height: 1.4;
        }

        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: min(380px, calc(100vw - 40px));
        }

        .toast {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 14px 18px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            line-height: 1.45;
            color: #fff;
            box-shadow: 0 14px 34px rgba(15, 23, 42, .2);
            opacity: 0;
            transform: translateX(24px);
            transition: opacity .25s ease, transform .25s ease;
        }

        .toast.toast-mostrar {
            opacity: 1;
            transform: translateX(0);
        }

        .toast-sucesso { background: #16a34a; }
        .toast-erro { background: #dc2626; }
        .toast-info { background: #2563eb; }

        @media (max-width: 480px) {
            .toast-container {
                left: 16px;
                right: 16px;
                top: 16px;
                max-width: none;
            }
        }
    `;
    document.head.appendChild(estilos);

    function validarEmail(valor) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valor || "").trim());
    }

    function formatarCPF(valor) {
        let v = String(valor || "").replace(/\D/g, "").slice(0, 11);

        if (v.length > 9) {
            v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
        } else if (v.length > 6) {
            v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
        } else if (v.length > 3) {
            v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
        }

        return v;
    }

    function aplicarMascaraCPF(input) {
        input.addEventListener("input", () => {
            input.value = formatarCPF(input.value);
        });
    }

    function validarCPF(valor) {
        const cpf = String(valor || "").replace(/\D/g, "");

        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }

        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += Number(cpf[i]) * (10 - i);
        }
        let resto = (soma * 10) % 11;
        if (resto === 10) resto = 0;
        if (resto !== Number(cpf[9])) return false;

        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += Number(cpf[i]) * (11 - i);
        }
        resto = (soma * 10) % 11;
        if (resto === 10) resto = 0;

        return resto === Number(cpf[10]);
    }

    function formatarDataDigitada(valor) {
        let v = String(valor || "").replace(/\D/g, "").slice(0, 8);

        if (v.length > 4) {
            v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
        } else if (v.length > 2) {
            v = v.replace(/(\d{2})(\d{1,2})/, "$1/$2");
        }

        return v;
    }

    function aplicarMascaraData(input) {
        input.addEventListener("input", () => {
            input.value = formatarDataDigitada(input.value);
        });
    }

    function validarData(valor) {
        const texto = String(valor || "").trim();

        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
            return false;
        }

        const [dia, mes, ano] = texto.split("/").map(Number);

        if (mes < 1 || mes > 12) return false;
        if (ano < 1900 || ano > 2100) return false;

        const data = new Date(ano, mes - 1, dia);

        return (
            data.getFullYear() === ano &&
            data.getMonth() === mes - 1 &&
            data.getDate() === dia
        );
    }

    function converterDataBRparaISO(valor) {
        const texto = String(valor || "").trim();
        const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

        if (!partes) return null;

        const [, dia, mes, ano] = partes;
        return `${ano}-${mes}-${dia}`;
    }

    function converterDataISOparaBR(valor) {
        const texto = String(valor || "").trim();
        const partes = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (!partes) return "";

        const [, ano, mes, dia] = partes;
        return `${dia}/${mes}/${ano}`;
    }

    function validarCampoData(input, mensagem) {
        const valor = input.value.trim();

        if (!valor) {
            mostrarErroCampo(input, "Este campo é obrigatório.");
            return false;
        }

        if (!validarData(valor)) {
            mostrarErroCampo(
                input,
                mensagem || "Digite uma data válida no formato DD/MM/AAAA."
            );
            return false;
        }

        limparErroCampo(input);
        return true;
    }

    function limparErroCampo(input) {
        input.classList.remove("campo-invalido");

        const proximo = input.nextElementSibling;
        if (proximo && proximo.dataset && proximo.dataset.erroCampo === "true") {
            proximo.remove();
        }
    }

    function mostrarErroCampo(input, mensagem) {
        limparErroCampo(input);

        input.classList.add("campo-invalido");

        const erro = document.createElement("small");
        erro.className = "erro-campo";
        erro.dataset.erroCampo = "true";
        erro.textContent = mensagem;

        input.insertAdjacentElement("afterend", erro);
    }

    function limparErrosDoFormulario(form) {
        form.querySelectorAll(".erro-campo").forEach((el) => el.remove());
        form
            .querySelectorAll(".campo-invalido")
            .forEach((el) => el.classList.remove("campo-invalido"));
    }

    function validarCampoObrigatorio(input, mensagem) {
        if (!input.value.trim()) {
            mostrarErroCampo(input, mensagem || "Este campo é obrigatório.");
            return false;
        }

        limparErroCampo(input);
        return true;
    }

    function validarCampoEmail(input, mensagem) {
        const valor = input.value.trim();

        if (!valor) {
            mostrarErroCampo(input, "Este campo é obrigatório.");
            return false;
        }

        if (!validarEmail(valor)) {
            mostrarErroCampo(input, mensagem || "Digite um e-mail válido.");
            return false;
        }

        limparErroCampo(input);
        return true;
    }

    function validarCampoCPF(input, mensagem) {
        const valor = input.value.trim();

        if (!valor) {
            mostrarErroCampo(input, "Este campo é obrigatório.");
            return false;
        }

        if (!validarCPF(valor)) {
            mostrarErroCampo(
                input,
                mensagem || "Digite um CPF válido (11 dígitos)."
            );
            return false;
        }

        limparErroCampo(input);
        return true;
    }

    function ativarRevalidacaoAoDigitar(input, validador) {
        input.addEventListener("blur", () => validador(input));

        input.addEventListener("input", () => {
            if (input.classList.contains("campo-invalido")) {
                validador(input);
            }
        });
    }

    function mostrarToast(mensagem, tipo, duracaoMs) {
        tipo = tipo || "info";
        duracaoMs = duracaoMs || 4000;

        let container = document.querySelector(".toast-container");
        if (!container) {
            container = document.createElement("div");
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = `toast toast-${tipo}`;
        toast.setAttribute("role", "status");
        toast.textContent = mensagem;
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("toast-mostrar"));

        setTimeout(() => {
            toast.classList.remove("toast-mostrar");
            setTimeout(() => toast.remove(), 300);
        }, duracaoMs);
    }

    window.validarEmail = validarEmail;
    window.formatarCPF = formatarCPF;
    window.aplicarMascaraCPF = aplicarMascaraCPF;
    window.validarCPF = validarCPF;
    window.mostrarErroCampo = mostrarErroCampo;
    window.limparErroCampo = limparErroCampo;
    window.limparErrosDoFormulario = limparErrosDoFormulario;
    window.validarCampoObrigatorio = validarCampoObrigatorio;
    window.validarCampoEmail = validarCampoEmail;
    window.validarCampoCPF = validarCampoCPF;
    window.aplicarMascaraData = aplicarMascaraData;
    window.validarData = validarData;
    window.converterDataBRparaISO = converterDataBRparaISO;
    window.converterDataISOparaBR = converterDataISOparaBR;
    window.validarCampoData = validarCampoData;
    window.ativarRevalidacaoAoDigitar = ativarRevalidacaoAoDigitar;
    window.mostrarToast = mostrarToast;
})();
