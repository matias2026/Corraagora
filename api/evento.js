const SUPABASE_URL = "https://ymaybqujglfajllruqub.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_l3qNE9dzBeefjdKpRyzVOg_bkm51ZI4";
const LOGO_PADRAO = "https://www.corraagora.com.br/images/logo-corraagora-trim.png";

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatarData(dataISO) {
  const partes = String(dataISO || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!partes) return "";
  const [, ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

module.exports = async (req, res) => {
  const protocolo = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const baseUrl = `${protocolo}://${host}`;
  const slug =
    typeof req.query.slug === "string" ? req.query.slug.trim() : "";

  let html;
  try {
    const respHtml = await fetch(`${baseUrl}/evento.html`);
    html = await respHtml.text();
  } catch (erro) {
    res.status(502).send("Erro ao carregar a página do evento.");
    return;
  }

  if (slug) {
    try {
      const respEvento = await fetch(
        `${SUPABASE_URL}/rest/v1/eventos?slug=eq.${encodeURIComponent(
          slug
        )}&status=eq.aprovado&select=nome,modalidade,cidade,estado,data_evento,banner_url`,
        {
          headers: {
            apikey: SUPABASE_PUBLIC_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLIC_KEY}`
          }
        }
      );
      const eventos = await respEvento.json();
      const evento = Array.isArray(eventos) ? eventos[0] : null;

      if (evento) {
        const nome = evento.nome || "Evento esportivo";
        const cidadeEstado = [evento.cidade, evento.estado]
          .filter(Boolean)
          .join(" - ");
        const dataFormatada = formatarData(evento.data_evento);

        const partesDescricao = [
          evento.modalidade || "Evento esportivo",
          cidadeEstado || null,
          dataFormatada || null
        ].filter(Boolean);

        const titulo = `${nome} | CorraAgora`;
        const descricao = `${partesDescricao.join(
          " • "
        )}. Inscreva-se agora na CorraAgora!`;
        const imagem = evento.banner_url || LOGO_PADRAO;
        const urlEvento = `${baseUrl}/evento.html?slug=${encodeURIComponent(
          slug
        )}`;

        const tituloEsc = escapeHtml(titulo);
        const descricaoEsc = escapeHtml(descricao);
        const imagemEsc = escapeHtml(imagem);
        const urlEsc = escapeHtml(urlEvento);

        const novoBloco = `<!-- OG_META_START -->
  <!-- Open Graph / redes sociais (WhatsApp, Facebook, LinkedIn) -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CorraAgora">
  <meta property="og:title" content="${tituloEsc}">
  <meta property="og:description" content="${descricaoEsc}">
  <meta property="og:url" content="${urlEsc}">
  <meta property="og:image" content="${imagemEsc}">
  <meta property="og:locale" content="pt_BR">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${tituloEsc}">
  <meta name="twitter:description" content="${descricaoEsc}">
  <meta name="twitter:image" content="${imagemEsc}">
  <!-- OG_META_END -->`;

        html = html.replace(
          /<!-- OG_META_START -->[\s\S]*?<!-- OG_META_END -->/,
          novoBloco
        );

        html = html.replace(
          /<title>[^<]*<\/title>/,
          `<title>${tituloEsc}</title>`
        );
      }
    } catch (erro) {
      // Mantém o HTML padrão (tags genéricas) se a busca do evento falhar.
    }
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=600, stale-while-revalidate=3600"
  );
  res.status(200).send(html);
};
