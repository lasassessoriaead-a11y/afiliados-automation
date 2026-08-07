# Afiliados Automation — Backend Foundation

A branch `foundation-backend` adiciona uma API real ao protótipo existente sem alterar a página principal de produção.

## Recursos atuais

- PostgreSQL via `DATABASE_URL`
- Registro e login com bcrypt + JWT
- Usuário autenticado (`/api/me`)
- CRUD de produtos
- Métricas reais do dashboard
- Histórico de links afiliados
- Credenciais com AES-256-GCM
- Health check e versionamento da API

## Preparação do banco

Execute `database/schema.sql` no PostgreSQL escolhido.

## Variáveis na Vercel

Configure `DATABASE_URL`, `JWT_SECRET` e `CREDENTIALS_ENCRYPTION_KEY` nos ambientes Preview e Production.

## Importante

A branch está isolada da `main`. Só faça merge após configurar o banco e validar o deployment de Preview.
