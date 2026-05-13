# Configuração do Webhook do Meta

## Variáveis de Ambiente

O projeto agora requer a variável `META_WEBHOOK_VERIFY_TOKEN` no arquivo `.env.local`:

```env
# Meta Webhook (WhatsApp CTA buttons)
META_WEBHOOK_VERIFY_TOKEN=geolog_wh_1ca922641f5aab5b2d202b470829f9e9324e2de5ed2bcecf
```

## Configuração no Meta Business Manager

1. Acesse [Meta Business Manager](https://business.facebook.com)
2. Vá em "Settings" → "Webhooks"
3. Configure o webhook com:
   - **Callback URL:** `https://portalgeolog.com.br/api/meta-webhook`
   - **Verify token:** O mesmo valor da variável `META_WEBHOOK_VERIFY_TOKEN`

## Configuração no Cloudflare

Adicione a variável no Cloudflare:

```bash
wrangler secret put META_WEBHOOK_VERIFY_TOKEN
```
