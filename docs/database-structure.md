# Estrutura do Banco (PostgreSQL)

Este documento descreve a estrutura atual do banco utilizada pelo MCP WordPress, inspecionada via conexão PostgreSQL do MCP `PostgreSQL-mcp-wordpress`.

## Esquemas
- `public` — dados de aplicação (usuários, providers, conexões, tokens, auditoria).
- `drizzle` — controle de migrações (`__drizzle_migrations`).
- `neon_auth` — tabela auxiliar do provedor Neon (`users_sync`).

## Tabelas em `public`

### `mcp_users`
- Colunas:
  - `id` `integer` NOT NULL (PK)
  - `name` `varchar` NOT NULL
  - `email` `varchar` NOT NULL (unique)
  - `phone` `varchar` NOT NULL
  - `password_hash` `varchar` NOT NULL
  - `reset_token` `varchar` NULL
  - `reset_expires_at` `timestamp` NULL
  - `created_at` `timestamp` DEFAULT `now()`
  - `updated_at` `timestamp` DEFAULT `now()`
- Índices:
  - `mcp_users_pkey` (unique, `id`)
  - `mcp_users_email_unique` (unique, `email`)

### `mcp_service_providers`
- Colunas:
  - `id` `integer` NOT NULL (PK)
  - `key` `varchar` NOT NULL (unique) — exemplo: `wordpress`, `whatsapp`
  - `name` `varchar` NOT NULL
  - `enabled` `boolean` DEFAULT `true`
  - `version` `varchar` NULL
  - `created_at` `timestamp` DEFAULT `now()`
  - `updated_at` `timestamp` DEFAULT `now()`
- Índices:
  - `mcp_service_providers_pkey` (unique, `id`)
  - `mcp_service_providers_key_unique` (unique, `key`)

### `mcp_service_connections`
- Colunas:
  - `id` `integer` NOT NULL (PK)
  - `user_id` `integer` NOT NULL (FK → `mcp_users.id` ON DELETE CASCADE)
  - `provider_id` `integer` NOT NULL (FK → `mcp_service_providers.id` ON DELETE CASCADE)
  - `name` `varchar` NOT NULL
  - `status` `varchar` NOT NULL
  - `config_json` `jsonb` NOT NULL
  - `secret_json` `jsonb` NOT NULL
  - `token_hash` `varchar` NOT NULL (unique)
  - `token_last4` `varchar` NULL
  - `token_created_at` `timestamp` DEFAULT `now()`
  - `created_at` `timestamp` DEFAULT `now()`
  - `updated_at` `timestamp` DEFAULT `now()`
- Índices:
  - `mcp_service_connections_pkey` (unique, `id`)
  - `mcp_service_connections_token_unique` (unique, `token_hash`)

### `mcp_tokens`
- Colunas:
  - `id` `integer` NOT NULL (PK)
  - `connection_id` `integer` NOT NULL (FK → `mcp_service_connections.id` ON DELETE CASCADE)
  - `token_hash` `varchar` NOT NULL (unique)
  - `expires_at` `timestamp` NULL
  - `revoked_at` `timestamp` NULL
  - `created_at` `timestamp` DEFAULT `now()`
- Índices:
  - `mcp_tokens_pkey` (unique, `id`)
  - `mcp_tokens_token_unique` (unique, `token_hash`)

### `mcp_audit_logs`
- Colunas:
  - `id` `integer` NOT NULL (PK)
  - `user_id` `integer` NULL (FK → `mcp_users.id` ON DELETE SET NULL)
  - `connection_id` `integer` NULL (FK → `mcp_service_connections.id` ON DELETE SET NULL)
  - `action` `varchar` NOT NULL
  - `data` `jsonb` NULL
  - `created_at` `timestamp` DEFAULT `now()`
- Índices:
  - `mcp_audit_logs_pkey` (unique, `id`)

## Contagens atuais
- `mcp_users`: 7
- `mcp_service_providers`: 0
- `mcp_service_connections`: 0
- `mcp_tokens`: 0
- `mcp_audit_logs`: 0

## Observações
- As FKs garantem o encadeamento: `users` → `service_connections` → `tokens` e `audit_logs` referenciam `users` e `connections`.
- Campos `jsonb` (`config_json`, `secret_json`, `data`) permitem flexibilidade por provider.
- Migrações são gerenciadas por Drizzle (`drizzle.__drizzle_migrations`).