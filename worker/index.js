// Wrapper para Cloudflare Workers — importa o build do vinext
// e converte a função handler em um objeto Worker com método fetch

export default {
  async fetch(request, env, ctx) {
    // Injeta variáveis do Cloudflare no process.env para compatibilidade com vinext
    // ANTES de carregar o bundle server (evita capturas top-level de undefined)
    if (!globalThis.process) {
      globalThis.process = { env: {} };
    }

    // Mapeia todas as variáveis do env para process.env
    Object.assign(globalThis.process.env, env);

    // Import dinâmico garante que o bundle server só seja avaliado
    // depois que process.env já contém as variáveis do Cloudflare
    const { default: handler } = await import("../dist/server/index.js");

    return handler(request, ctx);
  }
};
