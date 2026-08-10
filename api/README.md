# API

Base URL: `/api`

Endpoints públicos:
- `GET /version`
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /click`

Endpoints autenticados com `Authorization: Bearer <token>`:
- `GET /me`
- `GET|POST /products`
- `GET|PATCH|DELETE /product?id=<uuid>`
- `GET /dashboard`
- `GET|POST /links`
- `GET|POST /credentials`
- `POST /conversion`
