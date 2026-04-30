// Wrapper para Cloudflare Workers — importa o build do vinext
// e converte a função handler em um objeto Worker com método fetch

export default {
  async fetch(request, env, ctx) {
    // Injeta variáveis do Cloudflare no process.env para compatibilidade com vinext
    // ANTES de carregar o bundle server (evita capturas top-level de undefined)
    if (!globalThis.process) {
      globalThis.process = { env: {} };
    }

    // Cria um Proxy para process.env que consulta o env do Cloudflare como fallback.
    // Isso resolve capturas top-level no bundle server que ocorrem quando o módulo
    // é avaliado antes do Object.assign ter efeito completo.
    const originalEnv = globalThis.process.env || {};
    globalThis.process.env = new Proxy(originalEnv, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop in env) return env[prop];
        return undefined;
      }
    });

    const { default: handler } = await import("../dist/server/index.js");

    return handler(request, ctx);
  }
};
