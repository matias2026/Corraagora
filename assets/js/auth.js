document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document.getElementById("email").value.trim();

        const password = document.getElementById("password").value;

        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert(error.message);
            return;
        }

        window.location.href = "organizador/index.html";

    });

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