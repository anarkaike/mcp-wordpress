## Objetivos
- Estrutura genérica (JSONB) para conexões de qualquer provider (WhatsApp, WordPress, etc.) sem alterar a base ao adicionar novos campos.
- Suporte a múltiplos MCP providers no mesmo servidor, com seleção por `provider` + `token`.

## Estrutura de Banco (Postgres/Drizzle)
### Tabelas
- `users`
  - `id` (pk), `name`, `email` (unique), `phone` (unique opcional), `password_hash`, `created_at`, `updated_at`
- `service_providers`
  - `id` (pk), `key` (unique, ex.: `wordpress`, `whatsapp`), `name`, `enabled` (bool), `version`, `created_at`, `updated_at`
- `service_connections`
  - `id` (pk)
  - `user_id` (fk → `users.id`)
  - `provider_id` (fk → `service_providers.id`)
  - `name` (rótulo), `status` (enum: `active`, `inactive`, `error`)
  - `config_json` (jsonb) → parâmetros não sensíveis (ex.: `{"url": "...", "phone_e164": "...", "webhook_url": "..."}`)
  - `secret_json` (jsonb) → credenciais sensíveis (ex.: `{"username":"...","app_password":"...","api_key":"..."}`)
  - `token_hash` (unique), `token_last4`, `token_created_at`
  - `created_at`, `updated_at`
- `mcp_tokens` (opcional para múltiplos tokens por conexão)
  - `id` (pk), `connection_id` (fk), `token_hash` (unique), `expires_at`, `revoked_at`, `created_at`
- `audit_logs`
  - `id` (pk), `user_id`, `connection_id`, `action`, `data` (jsonb), `created_at`

### Índices
- `users.email` unique; `users.phone` unique opcional.
- `service_connections.token_hash` unique.
- Índice composto (`user_id`, `provider_id`).
- GIN em `config_json` para consultas por chave frequente (ex.: `phone_e164`), usando `jsonb_path_ops`.
- Partial index em `mcp_tokens(token_hash)` onde `revoked_at IS NULL`.

### Segurança
- `password_hash` com bcrypt.
- Criptografia em repouso para `secret_json` (encryption util + `JWT_SECRET`/KMS); nunca logar segredos.
- Token somente em hash (`token_hash` SHA-256 + salt), mostrar o token apenas na criação.

## Multi‑Provider MCP
- `src/providers/` com módulos genéricos por provider: `wordpress`, `whatsapp`, `...`
- Registry em `src/providers/index.ts` mapeando `key → providerModule` (carregado a partir de `service_providers.key`).
- Roteamento: `POST /api/mcp/:provider?token=...` ou `POST /api/mcp?provider=...&token=...` para resolver conexão (carrega `service_connections` → `config_json`/`secret_json`).
- Cada provider registra suas tools com `zod` e usa `config_json`/`secret_json` diretamente, sem alterar o schema do banco.

## Fluxos de Aplicação
- Login/cadastro usuário.
- Painel: seleção de provider (tabs/dropdown), formulário genérico por provider (campos dinâmicos), listagem de conexões.
- Cadastro de conexão: gera `token` (persistido como `token_hash`), exibe token uma única vez.

## Migrações Drizzle
- Atualizar `db/schema.ts` com tabelas acima (snake_case) e tipos jsonb.
- Gerar/aplicar migrations com `drizzle-kit` (`DATABASE_URL`).
- Seeds: inserir `service_providers` padrão (`wordpress`, `whatsapp`).

## Próximos Passos
1. Implementar tabelas genéricas (`service_providers`, `service_connections`, `mcp_tokens`, `audit_logs`).
2. Adicionar util de criptografia para `secret_json` e hashing de tokens.
3. Ajustar `api/mcp` para roteamento por provider e resolução por token.
4. Implementar providers `wordpress` e `whatsapp` usando `config_json`/`secret_json`.
5. Atualizar UI para cadastro/listagem genérica por provider.
6. Testes end‑to‑end de cadastro e invocação MCP.
