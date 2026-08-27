(() => {
  "use strict";

  const lista = document.getElementById("listaInscricoes");
  const semInscricoes = document.getElementById("semInscricoes");
  const logoutButton = document.getElementById("logoutButton");

  logoutButton?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  async function carregar() {
    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
      window.location.href = "minha-conta.html";
      return;
    }

    const { data: inscricoes, error } = await supabaseClient
      .from("inscricoes")
      .select("*, eventos(nome, slug, data_evento)")
      .eq("usuario_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar inscrições:", error);
      return;
    }

    if (!inscricoes || inscricoes.length === 0) {
      semInscricoes.classList.remove("hidden");
      return;
    }

    lista.innerHTML = inscricoes.map(criarCard).join("");
  }

  function criarCard(inscricao) {
    const evento = inscricao.eventos;
    const nomeEvento = escaparHTML(evento?.nome || "Evento");
    const slug = encodeURIComponent(evento?.slug || "");

    const statusRotulo = {
      pendente: "Pendente",
      confirmado: "Confirmado",
      cancelado: "Cancelado"
    }[inscricao.status] || inscricao.status;

    return `
      <div class="inscricao-card">
        <div class="inscricao-card-info">
          <h3>${nomeEvento}</h3>
          <p>Inscrito: ${escaparHTML(inscricao.nome || "-")}</p>
          <p>Categoria: ${escaparHTML(inscricao.categoria || "-")}</p>
          <p>Data do evento: ${formatarData(evento?.data_evento)}</p>
          <a href="evento.html?slug=${slug}">Ver evento</a>
        </div>

        <div class="inscricao-card-valor">
          <span class="status-pill status-${inscricao.status || "pendente"}">${escaparHTML(statusRotulo)}</span>
          <strong>${inscricao.valor_pago !== null && inscricao.valor_pago !== undefined ? formatarMoeda(inscricao.valor_pago) : "-"}</strong>
        </div>
      </div>
    `;
  }

  function escaparHTML(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  carregar();
})();
