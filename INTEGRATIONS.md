# Integrações de afiliados

O backend OAuth do Afiliados Automation está publicado como uma Supabase Edge Function no projeto `afiliados-automation`.

## URLs de callback

Cadastre exatamente estas URLs nos painéis das plataformas:

- Mercado Livre: `https://ybxizbbpdcaywcbeorrm.supabase.co/functions/v1/oauth/mercadolivre/callback`
- Shopee: `https://ybxizbbpdcaywcbeorrm.supabase.co/functions/v1/oauth/shopee/callback`
- TikTok Shop: `https://ybxizbbpdcaywcbeorrm.supabase.co/functions/v1/oauth/tiktok/callback`

## URLs para iniciar a conexão

Depois que as credenciais forem cadastradas no ambiente da função:

- Mercado Livre: `https://ybxizbbpdcaywcbeorrm.supabase.co/functions/v1/oauth/mercadolivre/start`
- Shopee: `https://ybxizbbpdcaywcbeorrm.supabase.co/functions/v1/oauth/shopee/start`
- TikTok Shop: `https://ybxizbbpdcaywcbeorrm.supabase.co/functions/v1/oauth/tiktok/start`

## Variáveis de ambiente

Mercado Livre:

- `MELI_CLIENT_ID`
- `MELI_CLIENT_SECRET`

Shopee:

- `SHOPEE_PARTNER_ID`
- `SHOPEE_PARTNER_KEY`

TikTok Shop:

- `TIKTOK_APP_KEY`
- `TIKTOK_APP_SECRET`

Nunca grave secrets, access tokens ou refresh tokens no GitHub.

## Persistência e segurança

A tabela `oauth_connections` guarda conexões por provedor/conta. Tokens são cifrados pela Edge Function antes de serem persistidos. RLS está habilitado e `anon`/`authenticated` não têm acesso direto à tabela.

O fluxo do Mercado Livre usa Authorization Code, `state` assinado e troca do código no backend. O callback deve ser exatamente igual ao URI registrado no DevCenter.

Shopee e TikTok Shop já possuem rotas separadas para que cada plataforma possa ter seu próprio callback e credenciais sem misturar tokens.