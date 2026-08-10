# Fundação do Afiliados Automation

Esta branch adiciona a primeira camada real de backend ao protótipo atual.

## Endpoints

- `GET /api/health` — saúde da API e conexão com banco.
- `POST /api/auth/register` — cria o primeiro usuário.
- `POST /api/auth/login` — autentica e retorna JWT.
- `GET /api/products` — lista produtos do usuário autenticado.
- `POST /api/products` — cadastra produto.
- `GET /api/product?id=<uuid>` — detalhe de produto.
- `PATCH /api/product?id=<uuid>` — atualiza produto.
- `DELETE /api/product?id=<uuid>` — remove produto.
- `GET /api/dashboard` — métricas reais calculadas a partir dos produtos.

## Variáveis obrigatórias

`DATABASE_URL` e `JWT_SECRET` devem ser configuradas na Vercel antes de promover esta branch para produção.

## Banco

Execute `database/schema.sql` em um PostgreSQL compatível (Neon, Supabase ou PostgreSQL gerenciado). Nunca coloque credenciais reais no GitHub.

## Segurança

Senhas são armazenadas com bcrypt. A API usa JWT com expiração de 7 dias. Os endpoints de produtos e dashboard exigem token Bearer.
