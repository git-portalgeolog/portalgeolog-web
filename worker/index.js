// Wrapper para Cloudflare Workers — importa o build do vinext
// e converte a função handler em um objeto Worker com método fetch

import handler from "../dist/server/index.js";

export default {
  async fetch(request, env, ctx) {
    // Injeta variáveis do Cloudflare no process.env para compatibilidade com vinext
    // As variáveis NEXT_PUBLIC_* já são injetadas no build, mas as secrets precisam disso
    if (!globalThis.process) {
      globalThis.process = { env: {} };
    }
    
    // Mapeia todas as variáveis do env para process.env
    Object.assign(globalThis.process.env, env);
    
    return handler(request, ctx);
  }
};
