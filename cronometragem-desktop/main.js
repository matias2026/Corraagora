const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// Mesma URL/chave pública usadas no site (assets/js/supabase.js) — a chave
// é "publishable", feita pra ficar exposta no código do cliente, não é
// segredo nenhum. Só é usada aqui no processo principal, quando o usuário
// pede pra "Sincronizar com CorraAgora" e o computador tem internet.
const SUPABASE_URL = "https://ymaybqujglfajllruqub.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_l3qNE9dzBeefjdKpRyzVOg_bkm51ZI4";

const PASTA_DADOS = path.join(app.getPath("userData"), "cronometragem-offline");
const ARQUIVO_DADOS = path.join(PASTA_DADOS, "dados.json");

function dadosPadrao() {
    return {
        evento: null,
        categorias: [],
        inscricoes: [],
        cronometragem_baterias: [],
        resultados: [],
        proximoBateriaId: 1,
        proximoResultadoId: 1
    };
}

function lerArquivoAtual() {
    try {
        const conteudo = fs.readFileSync(ARQUIVO_DADOS, "utf8");
        return { ...dadosPadrao(), ...JSON.parse(conteudo) };
    } catch (erro) {
        return dadosPadrao();
    }
}

function gravarArquivoAtual(dados) {
    fs.mkdirSync(PASTA_DADOS, { recursive: true });
    fs.writeFileSync(ARQUIVO_DADOS, JSON.stringify(dados, null, 2), "utf8");
}

let janelaCronometragem = null;
let janelaResultados = null;

function criarJanela(arquivoHtml, janelaExistente) {
    if (janelaExistente && !janelaExistente.isDestroyed()) {
        janelaExistente.focus();
        return janelaExistente;
    }

    const janela = new BrowserWindow({
        width: 1280,
        height: 860,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    janela.loadFile(path.join(__dirname, "app", arquivoHtml));
    return janela;
}

app.whenReady().then(() => {
    janelaCronometragem = criarJanela("cronometragem.html", null);

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            janelaCronometragem = criarJanela("cronometragem.html", null);
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// --- Leitura/gravação do estado local (usado pelo local-db.js) ---

ipcMain.on("ler-dados-sync", (event) => {
    event.returnValue = lerArquivoAtual();
});

ipcMain.handle("salvar-dados", (event, dados) => {
    gravarArquivoAtual(dados);
    return true;
});

// --- Abrir a outra janela (cronometragem <-> resultados) ---

ipcMain.handle("abrir-resultados", () => {
    janelaResultados = criarJanela("resultados.html", janelaResultados);
});

ipcMain.handle("abrir-cronometragem", () => {
    janelaCronometragem = criarJanela("cronometragem.html", janelaCronometragem);
});

// --- Importar evento (arquivo .json exportado do site) ---

ipcMain.handle("importar-evento", async () => {
    const resultado = await dialog.showOpenDialog({
        title: "Importar evento para cronometragem offline",
        filters: [{ name: "Arquivo do CorraAgora", extensions: ["json"] }],
        properties: ["openFile"]
    });

    if (resultado.canceled || resultado.filePaths.length === 0) {
        return { ok: false, cancelado: true };
    }

    let pacote;
    try {
        const conteudo = fs.readFileSync(resultado.filePaths[0], "utf8");
        pacote = JSON.parse(conteudo);
    } catch (erro) {
        return { ok: false, erro: "Arquivo inválido ou corrompido." };
    }

    if (pacote.formato !== "cronometragem-offline-v1" || !pacote.evento) {
        return {
            ok: false,
            erro: "Esse arquivo não é um arquivo de evento exportado do CorraAgora (botão \"Exportar offline\" em Meus eventos)."
        };
    }

    const dadosAtuais = lerArquivoAtual();
    const mesmoEvento =
        dadosAtuais.evento && String(dadosAtuais.evento.id) === String(pacote.evento.id);

    // Reimportar o MESMO evento (pra atualizar a lista de inscritos, por
    // exemplo) preserva as baterias e os resultados já registrados. Um
    // evento DIFERENTE começa tudo do zero.
    const novosDados = {
        evento: {
            ...pacote.evento,
            cronometragem_encerrada: mesmoEvento
                ? dadosAtuais.evento.cronometragem_encerrada
                : false,
            cronometragem_encerrada_em: mesmoEvento
                ? dadosAtuais.evento.cronometragem_encerrada_em
                : null
        },
        categorias: pacote.categorias || [],
        inscricoes: (pacote.inscritos || []).map((inscrito) => ({
            ...inscrito,
            status: "confirmado"
        })),
        cronometragem_baterias: mesmoEvento ? dadosAtuais.cronometragem_baterias : [],
        resultados: mesmoEvento ? dadosAtuais.resultados : [],
        proximoBateriaId: mesmoEvento ? dadosAtuais.proximoBateriaId : 1,
        proximoResultadoId: mesmoEvento ? dadosAtuais.proximoResultadoId : 1
    };

    gravarArquivoAtual(novosDados);
    return { ok: true, evento: novosDados.evento, totalInscritos: novosDados.inscricoes.length };
});

// --- Exportar resultados pra um arquivo (pra importar no site depois) ---

ipcMain.handle("exportar-resultados", async () => {
    const dados = lerArquivoAtual();

    if (!dados.evento) {
        return { ok: false, erro: "Nenhum evento importado ainda." };
    }

    const mapaInscricoes = new Map(dados.inscricoes.map((i) => [i.id, i]));

    const pacote = {
        formato: "resultados-offline-v1",
        evento_id: dados.evento.id,
        evento_nome: dados.evento.nome,
        gerado_em: new Date().toISOString(),
        resultados: dados.resultados.map((resultado) => {
            const inscricao = mapaInscricoes.get(resultado.inscricao_id) || {};
            return {
                inscricao_id: resultado.inscricao_id,
                numero: inscricao.numero ?? null,
                nome: inscricao.nome || "",
                categoria: inscricao.categoria || null,
                horario_chegada: resultado.horario_chegada,
                tempo_liquido_segundos: resultado.tempo_liquido_segundos
            };
        })
    };

    const escolha = await dialog.showSaveDialog({
        title: "Exportar resultados",
        defaultPath: `resultados-evento-${dados.evento.id}.json`,
        filters: [{ name: "Arquivo de resultados", extensions: ["json"] }]
    });

    if (escolha.canceled || !escolha.filePath) {
        return { ok: false, cancelado: true };
    }

    fs.writeFileSync(escolha.filePath, JSON.stringify(pacote, null, 2), "utf8");
    return { ok: true, caminho: escolha.filePath, total: pacote.resultados.length };
});

// --- Sincronizar direto com o CorraAgora (precisa de internet na hora) ---

ipcMain.handle("sincronizar", async (event, credenciais) => {
    const dados = lerArquivoAtual();

    if (!dados.evento) {
        return { ok: false, erro: "Nenhum evento importado ainda." };
    }

    const mapaInscricoes = new Map(dados.inscricoes.map((i) => [i.id, i]));

    let accessToken;
    let usuarioId;

    try {
        const respLogin = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: SUPABASE_PUBLIC_KEY },
            body: JSON.stringify({ email: credenciais.email, password: credenciais.senha })
        });

        const loginJson = await respLogin.json();

        if (!respLogin.ok) {
            return {
                ok: false,
                erro:
                    loginJson.error_description ||
                    loginJson.msg ||
                    "Não foi possível entrar com esse e-mail/senha."
            };
        }

        accessToken = loginJson.access_token;
        usuarioId = loginJson.user?.id;
    } catch (erro) {
        return {
            ok: false,
            erro: "Sem conexão com a internet agora. Tente de novo quando tiver sinal."
        };
    }

    let enviados = 0;
    let jaExistiam = 0;
    const falhas = [];

    for (const resultado of dados.resultados) {
        if (resultado.sincronizado) continue;

        try {
            const resp = await fetch(`${SUPABASE_URL}/rest/v1/resultados`, {
                method: "POST",
                headers: {
                    apikey: SUPABASE_PUBLIC_KEY,
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    Prefer: "return=minimal"
                },
                body: JSON.stringify({
                    inscricao_id: resultado.inscricao_id,
                    evento_id: dados.evento.id,
                    horario_chegada: resultado.horario_chegada,
                    tempo_liquido_segundos: resultado.tempo_liquido_segundos,
                    registrado_por: usuarioId
                })
            });

            if (resp.ok) {
                resultado.sincronizado = true;
                enviados++;
            } else if (resp.status === 409) {
                resultado.sincronizado = true;
                jaExistiam++;
            } else {
                const erroResp = await resp.json().catch(() => ({}));
                falhas.push({
                    numero: mapaInscricoes.get(resultado.inscricao_id)?.numero,
                    erro: erroResp.message || resp.statusText
                });
            }
        } catch (erro) {
            falhas.push({
                numero: mapaInscricoes.get(resultado.inscricao_id)?.numero,
                erro: "Falha de conexão."
            });
        }
    }

    gravarArquivoAtual(dados);

    return { ok: true, enviados, jaExistiam, falhas };
});
