// Grava uma inscrição só depois de confirmar com o Google que quem enviou
// não é um robô (reCAPTCHA v3). A verificação do token tem que acontecer
// aqui no servidor — no navegador, qualquer pessoa poderia forjar um
// "sucesso" e pular a checagem.

const SUPABASE_URL = "https://ymaybqujglfajllruqub.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_l3qNE9dzBeefjdKpRyzVOg_bkm51ZI4";

// Abaixo desse score o Google considera o comportamento suspeito de bot.
// 0.5 é o valor recomendado pelo Google como ponto de partida.
const RECAPTCHA_SCORE_MINIMO = 0.5;

// Limite de tentativas por IP — cobre uma inscrição com direito a um retry
// (erro de rede, etc.) sem sobrar muita margem pra um script em loop.
const RATE_LIMIT_TENTATIVAS = 3;
const RATE_LIMIT_JANELA_SEGUNDOS = 60;

// Só esses campos podem vir do cliente — impede que alguém injete um
// campo extra (ex.: "status: confirmado") no corpo da requisição.
const CAMPOS_PERMITIDOS_INSCRICAO = [
  "evento_id",
  "codigo_inscricao",
  "nome",
  "cpf",
  "data_nascimento",
  "sexo",
  "email",
  "telefone",
  "equipe",
  "licenca_cbc",
  "cidade",
  "categoria",
  "valor_pago",
  "cupom_codigo",
  "comprovante_url",
  "status",
  "usuario_id"
];

async function dentroDoLimite(ip) {
  if (!ip) return true;

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/verificar_rate_limit_inscricao`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLIC_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLIC_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_ip: ip,
          p_limite: RATE_LIMIT_TENTATIVAS,
          p_janela_segundos: RATE_LIMIT_JANELA_SEGUNDOS
        })
      }
    );

    if (!resp.ok) return true; // Falha ao checar não deve travar inscrição legítima.

    return await resp.json();
  } catch (erro) {
    return true;
  }
}

async function eventoAceitaInscricao(eventoId) {
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/eventos?id=eq.${encodeURIComponent(
        eventoId
      )}&select=status,inscricoes_abertas`,
      {
        headers: {
          apikey: SUPABASE_PUBLIC_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLIC_KEY}`
        }
      }
    );

    if (!resp.ok) return true; // Falha ao checar: deixa a RLS decidir na hora do insert.

    const eventos = await resp.json();
    const evento = Array.isArray(eventos) ? eventos[0] : null;

    if (!evento) return true; // Evento inexistente: deixa o insert falhar com o erro real.

    return evento.status === "aprovado" && evento.inscricoes_abertas === true;
  } catch (erro) {
    return true;
  }
}

async function verificarRecaptcha(token, ip) {
  const params = new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET_KEY,
    response: token
  });
  if (ip) params.set("remoteip", ip);

  const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  return resp.json();
}

function montarInscricaoSegura(dados) {
  const inscricao = {};
  for (const campo of CAMPOS_PERMITIDOS_INSCRICAO) {
    if (dados[campo] !== undefined) inscricao[campo] = dados[campo];
  }
  // Nunca confia no status enviado pelo cliente — toda inscrição nova
  // nasce pendente, quem confirma é o organizador.
  inscricao.status = "pendente";
  return inscricao;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ erro: "Método não permitido." });
    return;
  }

  const corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { recaptchaToken, inscricao: dadosInscricao, accessToken } = corpo;

  if (!recaptchaToken || typeof recaptchaToken !== "string") {
    res.status(400).json({ erro: "Token do reCAPTCHA ausente." });
    return;
  }

  if (!dadosInscricao || typeof dadosInscricao !== "object") {
    res.status(400).json({ erro: "Dados da inscrição ausentes." });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || undefined;

  if (!(await dentroDoLimite(ip))) {
    res.status(429).json({
      erro: "Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente."
    });
    return;
  }

  if (
    dadosInscricao.evento_id &&
    !(await eventoAceitaInscricao(dadosInscricao.evento_id))
  ) {
    res.status(400).json({
      erro: "As inscrições para este evento não estão mais abertas."
    });
    return;
  }

  try {
    const resultado = await verificarRecaptcha(recaptchaToken, ip);

    const aprovado =
      resultado.success === true &&
      resultado.action === "inscricao" &&
      typeof resultado.score === "number" &&
      resultado.score >= RECAPTCHA_SCORE_MINIMO;

    if (!aprovado) {
      console.error("reCAPTCHA reprovado:", resultado);
      res.status(400).json({
        erro:
          "Não foi possível confirmar que você não é um robô. Recarregue a página e tente novamente."
      });
      return;
    }
  } catch (erro) {
    console.error("Erro ao verificar reCAPTCHA:", erro);
    res.status(502).json({
      erro: "Não foi possível validar o reCAPTCHA agora. Tente novamente."
    });
    return;
  }

  const inscricao = montarInscricaoSegura(dadosInscricao);

  // Se quem está enviando tem sessão (logada), repassa o token dela pra
  // que o Postgres reconheça "auth.uid()" corretamente — as policies de
  // RLS (dono da inscrição, atleta banido) dependem disso. Sem sessão,
  // usa a chave pública mesma, igual ao comportamento anônimo de sempre.
  const autorizacao =
    typeof accessToken === "string" && accessToken
      ? `Bearer ${accessToken}`
      : `Bearer ${SUPABASE_PUBLIC_KEY}`;

  try {
    const respInsert = await fetch(`${SUPABASE_URL}/rest/v1/inscricoes`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLIC_KEY,
        Authorization: autorizacao,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(inscricao)
    });

    if (!respInsert.ok) {
      const erroSupabase = await respInsert.json().catch(() => ({}));
      console.error("Erro ao gravar inscrição:", erroSupabase);
      res.status(400).json({
        erro:
          erroSupabase.message ||
          "Não foi possível enviar sua inscrição. Tente novamente."
      });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (erro) {
    console.error("Erro ao gravar inscrição:", erro);
    res.status(502).json({
      erro: "Não foi possível enviar sua inscrição. Tente novamente."
    });
  }
};
