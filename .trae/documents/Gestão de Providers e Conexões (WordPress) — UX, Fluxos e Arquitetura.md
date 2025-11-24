## Objetivo
Entregar uma experiência prática e eficiente para gerenciar conexões do WordPress (sem gestão de providers na UI), com token sempre acessível e copiável, credenciais visíveis, e autenticação do cliente MCP (n8n) por Bearer e/ou querystring.

## Princípios de UX
- Praticidade: token e segredos sempre à vista com ações rápidas “na frente”.
- Clareza: linguagem simples e consistente; estados e feedbacks evidentes.
- Fluidez: wizard para nova conexão e painel de detalhes para manutenção.
- Reuso: componentes reutilizáveis e testáveis.

## Páginas e Componentes
### Lista de Conexões
- Colunas: `Nome`, `URL`, `Status`, `Última verificação`, `Token (last4)`.
- Ações na frente: `Detalhes`, `Testar`, `Rotacionar Token`, `Revogar`, `Remover`, `Criar nova`.

### Detalhes da Conexão (Drawer/Modal)
- Token MCP: sempre visível em claro; `Copiar`, `Rotacionar`, `Revogar`.
- Credenciais WordPress: `URL`, `Usuário`, `App Password` com `Mostrar/Ocultar` e `Copiar`.
- Verificação: `Testar conexão` mostra versão do WP, usuário autenticado e latência.
- Metadados: `Criado em`, `Atualizado em`, `token_last4`.

### Nova Conexão (Wizard 3 passos)
1) Dados: `URL`, `Usuário`, `App Password` (validações + dica de App Password).  
2) Verificação: ping ao endpoint `/wp-json` com credenciais.  
3) Emissão de Token: token visível + copiar; resumo da conexão.

### Componentes Reutilizáveis
- `Table`, `FormField`, `WizardStepper`, `CopyableField` (Mostrar/Ocultar e Copiar), `StatusBadge`, `ActionBar`.

## API — Conexões (somente)
- `GET /api/connections?provider=wordpress` → lista do usuário.
- `GET /api/connections/:id` → retorna em claro:  
  ```json
  { "id": 1, "name": "Meu WP", "status": "active", "config": { "url": "..." }, "secrets": { "username": "...", "app_password": "..." }, "token": "<token>", "token_last4": "1234", "created_at": "...", "updated_at": "..." }
  ```
- `POST /api/connections` → `{ name, config:{ url }, secrets:{ username, app_password } }` retorna `token` visível.
- `PATCH /api/connections/:id` → atualiza `config` e `secrets` (reentrada obrigatória para segredos).
- `POST /api/connections/:id/test` → valida credenciais no WP.
- `POST /api/connections/:id/rotate-token` → novo `token` visível; atualiza `token_hash` e `token_last4`.
- `POST /api/connections/:id/revoke` → marca `status = revoked`.
- `DELETE /api/connections/:id` → remove.

## MCP HTTP — Autenticação por Bearer e Querystring
- Rota: `POST /mcp` aceita:
  - `Authorization: Bearer <token>` (prioritário).
  - `?token=<token>` (fallback).
- Fluxo de request:
  1) Extrair token (Bearer > querystring).  
  2) Calcular `sha256(token)` e localizar conexão por `token_hash`.  
  3) Validar `status` (`revoked` → 403).  
  4) Decriptar `secret_json` e ler `config_json`.  
  5) Montar servidor MCP da sessão com ferramentas WP parametrizadas.  
  6) Conectar via `StreamableHTTPServerTransport` e executar ferramentas (`wp_list_posts`, etc.).
- Erros:
  - 401 `{ error: "missing_token" }`  
  - 401 `{ error: "invalid_token" }`  
  - 403 `{ error: "revoked" }`  
  - 500 `{ error: "provider_not_configured" }`

## Armazenamento e Exibição
- Em repouso: `token_hash` + `token_last4`; segredos em `secret_json` criptografados (AES-256-GCM).  
- Para exibição contínua: `token_enc` (token criptografado) decriptado na resposta da API e mostrado na UI.  
- UI exibe token em claro e segredos visíveis com Mostrar/Ocultar, ambos copiáveis.

## Auditoria e Status
- Eventos: `connection_created`, `connection_tested`, `token_rotated`, `token_revoked`, `connection_deleted`, `secrets_viewed`, `mcp_session_started`.
- Status: `active`, `error`, `revoked`.  
- `Última verificação`: timestamp e resultado (armazenar no `config_json` ou coluna dedicada).

## Testes
- Unitários: extrator de token (Bearer vs querystring), hash/criptografia/decriptação (`token_enc`, `secret_json`), validação de URL.
- Integração: criação/listagem/edição; teste de conexão; exibição de token/segredos em claro; rotação/revogação com auditoria.
- E2E: wizard completo; painel de detalhes; copiar token/segredos; rotacionar/revogar; chamadas MCP por Bearer e por querystring.

## Integração n8n (cliente MCP)
- JSON de conexão para copiar na UI:  
  `{"endpoint":"http://<host>/mcp","transport":"streamable-http","token":"<token>"}`  
- Chamadas possíveis:  
  - `POST http://<host>/mcp?token=<token>`  
  - `POST http://<host>/mcp` com `Authorization: Bearer <token>`

## Entregáveis
- UI: Lista, Detalhes e Wizard de Conexões WordPress com copiar/ocultar.  
- API: endpoints de gestão (detalhes, teste, rotacionar, revogar, remover).  
- MCP: suporte a Bearer e querystring com carregamento de conexão por token.  
- Testes: unitários, integração e E2E cobrindo os fluxos principais.

## Próximos Passos
1) Implementar autenticação dual (Bearer + querystring) e montagem de sessão MCP por conexão.  
2) Implementar endpoints `GET /api/connections/:id`, `test`, `rotate-token`, `revoke`, `delete` com auditoria.  
3) Construir UI de Lista/Detalhes/Wizard e componentes `CopyableField`.  
4) Adicionar testes e validar com um WordPress real.
