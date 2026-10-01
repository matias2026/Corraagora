const { contextBridge, ipcRenderer } = require("electron");

// Ponte segura entre a página (renderer, sem acesso direto a arquivos) e o
// processo principal (que lê/grava no disco e fala com a internet quando
// tem). A página só enxerga esses métodos — nunca o "fs" ou o "ipcRenderer"
// crus.
contextBridge.exposeInMainWorld("electronAPI", {
    lerDadosSync: () => ipcRenderer.sendSync("ler-dados-sync"),
    salvarDados: (dados) => ipcRenderer.invoke("salvar-dados", dados),
    importarEvento: () => ipcRenderer.invoke("importar-evento"),
    exportarResultados: () => ipcRenderer.invoke("exportar-resultados"),
    sincronizar: (credenciais) => ipcRenderer.invoke("sincronizar", credenciais),
    abrirResultados: () => ipcRenderer.invoke("abrir-resultados"),
    abrirCronometragem: () => ipcRenderer.invoke("abrir-cronometragem")
});
