document.addEventListener("DOMContentLoaded", () => {

    const tabEntrar = document.getElementById("tabEntrar");
    const tabCriarConta = document.getElementById("tabCriarConta");
    const loginForm = document.getElementById("loginAtletaForm");
    const cadastroForm = document.getElementById("cadastroAtletaForm");
    const forgotLink = document.getElementById("forgotPasswordLink");
    const forgotForm = document.getElementById("forgotPasswordForm");
    const cancelForgot = document.getElementById("cancelForgotPassword");
    const authMessage = document.getElementById("authMessage");

    function mostrarAba(aba) {
        const ehLogin = aba === "login";

        tabEntrar.classList.toggle("active", ehLogin);
        tabCriarConta.classList.toggle("active", !ehLogin);

        loginForm.classList.toggle("hidden", !ehLogin);
        forgotLink.classList.toggle("hidden", !ehLogin);
        cadastroForm.classList.toggle("hidden", ehLogin);

        forgotForm.classList.add("hidden");
        authMessage.classList.add("hidden");
    }

    tabEntrar.addEventListener("click", () => mostrarAba("login"));
    tabCriarConta.addEventListener("click", () => mostrarAba("cadastro"));

    function mostrarMensagem(texto, tipo) {
        authMessage.textContent = texto;
        authMessage.className = `forgot-message ${tipo}`;
    }

    function redirecionarPorPapel(role) {
        if (role === "admin") {
            window.location.href = "admin/eventos-pendentes.html";
        } else if (role === "organizador") {
            window.location.href = "organizador/index.html";
        } else {
            window.location.href = "minhas-inscricoes.html";
        }
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const senha = document.getElementById("loginSenha").value;

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password: senha
        });

        if (error) {
            mostrarMensagem(
                "E-mail ou senha incorretos.",
                "error"
            );
            return;
        }

        const { data: perfil } = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle();

        redirecionarPorPapel(perfil?.role);
    });

    cadastroForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nome = document.getElementById("cadastroNome").value.trim();
        const email = document.getElementById("cadastroEmail").value.trim();
        const senha = document.getElementById("cadastroSenha").value;

        const { error } = await supabaseClient.auth.signUp({
            email,
            password: senha,
            options: {
                data: {
                    full_name: nome,
                    tipo_conta: "atleta"
                }
            }
        });

        if (error) {
            mostrarMensagem(error.message, "error");
            return;
        }

        mostrarAba("login");
        mostrarMensagem(
            "Conta criada! Já dá pra entrar com seu e-mail e senha.",
            "success"
        );
    });

    forgotLink.addEventListener("click", (e) => {
        e.preventDefault();
        loginForm.classList.add("hidden");
        forgotLink.classList.add("hidden");
        forgotForm.classList.remove("hidden");
        authMessage.classList.add("hidden");
    });

    cancelForgot.addEventListener("click", (e) => {
        e.preventDefault();
        forgotForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
        forgotLink.classList.remove("hidden");
        authMessage.classList.add("hidden");
    });

    forgotForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("forgotEmail").value.trim();
        const botao = forgotForm.querySelector("button[type='submit']");

        botao.disabled = true;
        botao.textContent = "Enviando...";

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + "/minha-conta.html"
        });

        botao.disabled = false;
        botao.textContent = "Enviar link de redefinição";

        if (error) {
            mostrarMensagem(error.message, "error");
            return;
        }

        mostrarMensagem(
            "Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
            "success"
        );

        forgotForm.reset();
    });

});
