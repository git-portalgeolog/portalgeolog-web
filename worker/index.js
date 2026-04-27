// Wrapper para Cloudflare Workers — importa o build do vinext
// e converte a função handler em um objeto Worker com método fetch

import handler from "../dist/server/index.js";

export default {
  async fetch(request, env, ctx) {
    return handler(request, ctx);
  }
};
