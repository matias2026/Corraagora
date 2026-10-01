# Cronometragem CorraAgora — versão offline (sem internet)

Programa pra instalar no notebook e usar na linha de chegada **sem precisar
de internet**. Faz a mesma cronometragem e a mesma tela de resultados do
site, só que salvando tudo no próprio computador.

## Como baixar o instalador (.exe)

Você não precisa instalar nada de programação. O GitHub compila o `.exe`
sozinho sempre que o código muda. Pra baixar:

1. No repositório do GitHub, clique na aba **Actions**.
2. Clique em **Build Cronometragem Desktop (Windows)** na lista à esquerda.
3. Clique na execução mais recente (a do topo).
4. Role até **Artifacts** e baixe **CronometragemCorraAgora-instalador-windows**
   (vem como um `.zip` — descompacte pra ter o `.exe` dentro).

Se quiser gerar um instalador novo sem esperar uma mudança no código, entre
em **Actions → Build Cronometragem Desktop (Windows) → Run workflow**.

## Como usar no dia da prova

### 1. Antes de sair de casa (com internet)

No site, em **Meus eventos**, clique em **📥 Exportar offline** no evento
do dia. Isso baixa um arquivo tipo `cronometragem-offline-evento-17.json`
— guarde ele (pendrive, ou direto na pasta Downloads do notebook que vai
pra prova).

### 2. No dia da prova (sem internet, funciona normal)

1. Abra o programa instalado.
2. Clique em **📥 Importar evento** e escolha o arquivo baixado no passo 1.
3. Use a tela de cronometragem normalmente: marque a categoria, dê a
   largada, registre as chegadas pelo teclado numérico.
4. Pra ver a classificação ao vivo, clique em **📋 Resultados** (abre numa
   outra janela, pode deixar as duas abertas ao mesmo tempo).
5. **Nada se perde** se o programa fechar, travar ou o notebook desligar —
   tudo fica salvo no computador o tempo todo. Só abrir de novo e importar
   o mesmo evento outra vez (os resultados já registrados continuam lá).

### 3. Depois da prova (quando tiver internet de novo)

Duas formas, pode usar as duas:

- **☁️ Sincronizar** (mais rápido): clique no botão, entre com seu
  e-mail/senha do site, e os resultados sobem direto pro CorraAgora.
  Precisa de internet nesse momento.
- **📤 Exportar resultados**: gera um arquivo com os resultados, pra levar
  pra outro computador com internet depois (recurso de importar esse
  arquivo no site ainda será adicionado ao painel do organizador).

O **📄 Exportar PDF**, dentro da tela de cronometragem, continua
funcionando igual — gera o PDF pra imprimir/divulgar na hora, sem precisar
de internet em nenhum momento.

## Para quem for mexer no código (não precisa pra só usar o programa)

```bash
cd cronometragem-desktop
npm install          # instala as dependências (só na primeira vez)
npm start             # compila o CSS e abre o programa pra testar
npm run dist          # gera o instalador .exe localmente (só funciona
                       # direito num Windows — por isso o GitHub Actions
                       # existe, pra compilar isso automaticamente)
```

### Como isso funciona por dentro

- `app/cronometragem.html` e `app/assets/js/cronometragem.js`, e
  `app/resultados.html` e `app/assets/js/resultados-publicos.js`, são
  **cópias exatas** das páginas do site — a lógica de cronometragem e de
  resultados não foi reescrita.
- A única diferença: em vez de carregar `assets/js/supabase.js` (que fala
  com o banco online), essas páginas carregam `app/assets/js/local-db.js`,
  que imita exatamente a mesma "forma" do cliente do Supabase, mas lê e
  grava num arquivo local do computador (`main.js` cuida de ler/gravar
  esse arquivo, e expõe isso pra página via `preload.js`).
- Isso quer dizer: se um dia mudar alguma regra na cronometragem do site
  (`assets/js/cronometragem.js`), é preciso copiar a mudança manualmente
  pra cá também (`cronometragem-desktop/app/assets/js/cronometragem.js`) —
  os dois arquivos não são o mesmo arquivo, são cópias independentes.
