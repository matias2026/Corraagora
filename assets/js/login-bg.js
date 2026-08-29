(() => {
    "use strict";

    const container = document.getElementById("loginBgCollage");
    if (!container || typeof supabaseClient === "undefined") return;

    const TOTAL_LADRILHOS = 24;

    const SIMBOLOS_POR_MODALIDADE = {
        mtb: "🚵",
        speed: "🚴",
        corrida: "🏃",
        "trail run": "⛰️",
        triathlon: "🏊",
        outro: "🏆"
    };

    function obterSimbolo(modalidade) {
        const chave = String(modalidade || "").trim().toLowerCase();
        return SIMBOLOS_POR_MODALIDADE[chave] || "🏁";
    }

    function criarLadrilho(evento) {
        const div = document.createElement("div");
        div.className = "login-bg-card";

        if (evento?.banner_url) {
            const img = document.createElement("img");
            img.src = evento.banner_url;
            img.alt = "";
            img.loading = "lazy";
            div.appendChild(img);
        } else {
            const simbolo = document.createElement("span");
            simbolo.className = "login-bg-simbolo";
            simbolo.textContent = obterSimbolo(evento?.modalidade);
            div.appendChild(simbolo);
        }

        return div;
    }

    function preencherColagem(eventos) {
        container.innerHTML = "";

        if (!eventos.length) {
            for (let i = 0; i < TOTAL_LADRILHOS; i++) {
                container.appendChild(criarLadrilho(null));
            }
            return;
        }

        for (let i = 0; i < TOTAL_LADRILHOS; i++) {
            container.appendChild(criarLadrilho(eventos[i % eventos.length]));
        }
    }

    async function carregar() {
        try {
            const { data, error } = await supabaseClient
                .from("eventos")
                .select("nome, modalidade, banner_url")
                .eq("status", "aprovado")
                .order("created_at", { ascending: false })
                .limit(TOTAL_LADRILHOS);

            if (error) throw error;

            preencherColagem(data || []);
        } catch (erro) {
            console.error("Erro ao carregar eventos para o fundo do login:", erro);
            preencherColagem([]);
        }
    }

    carregar();
})();
