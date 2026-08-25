document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document.getElementById("email").value.trim();

        const password = document.getElementById("password").value;

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert(error.message);
            return;
        }

        const { data: perfil } = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle();

        window.location.href =
            perfil?.role === "admin"
                ? "admin/eventos-pendentes.html"
                : "organizador/index.html";

    });

    const forgotLink = document.getElementById("forgotPasswordLink");
    const forgotForm = document.getElementById("forgotPasswordForm");
    const cancelForgot = document.getElementById("cancelForgotPassword");
    const forgotMessage = document.getElementById("forgotMessage");

    if (forgotLink && forgotForm) {

        forgotLink.addEventListener("click", (e) => {
            e.preventDefault();
            form.classList.add("hidden");
            forgotLink.classList.add("hidden");
            forgotForm.classList.remove("hidden");
            forgotMessage.classList.add("hidden");
        });

        cancelForgot?.addEventListener("click", (e) => {
            e.preventDefault();
            forgotForm.classList.add("hidden");
            form.classList.remove("hidden");
            forgotLink.classList.remove("hidden");
            forgotMessage.classList.add("hidden");
        });

        forgotForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("forgotEmail").value.trim();
            const submitButton = forgotForm.querySelector("button[type='submit']");

            submitButton.disabled = true;
            submitButton.textContent = "Enviando...";

            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/login.html"
            });

            submitButton.disabled = false;
            submitButton.textContent = "Enviar link de redefinição";

            forgotMessage.classList.remove("hidden", "success", "error");

            if (error) {
                forgotMessage.classList.add("error");
                forgotMessage.textContent = error.message;
                return;
            }

            forgotMessage.classList.add("success");
            forgotMessage.textContent =
                "Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.";

            forgotForm.reset();
        });
    }

});
const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const name = document.getElementById("name").value.trim();

        const email = document.getElementById("email").value.trim();

        const password = document.getElementById("password").value;

        const { error } = await supabaseClient.auth.signUp({

            email,

            password,

            options: {

                data: {

                    full_name: name

                }

            }

        });

        if (error) {

            alert(error.message);

            return;

        }

        alert("Conta criada com sucesso!");

        window.location.href = "login.html";

    });

}