## Objetivo
- Implementar cadastro e login do usuário usando Postgres/Drizzle.
- Integrar a UI existente (login/cadastro) com os novos endpoints.

## Endpoints (Serverless)
- POST `/api/auth/register`
  - Body: `{ name, email, phone, password }`
  - Validações: obrigatórios; email/phone únicos; senha ≥ 8; telefone em E.164 normalizado.
  - Ação: hash com bcrypt; insert em `users`; retorna `{ id, name, email, phone }`.
- POST `/api/auth/login`
  - Body: `{ emailOrPhone, password }`
  - Ação: consulta por email ou phone; compara bcrypt; emite JWT (12h) com `{ sub, name, email }`; retorna `{ token, user }`.
- POST `/api/auth/request-reset` (opcional nesta fase)
  - Body: `{ emailOrPhone }`
  - Ação: gera `reset_token` e `reset_expires_at`; retorna `{ ok: true }`.
- POST `/api/auth/reset` (opcional nesta fase)
  - Body: `{ token, newPassword }`
  - Ação: valida token/expiração; atualiza `password_hash`.

## Implementação (Drizzle)
- Utilizar `db` de `src/db.ts` e `users` de `db/schema.ts`.
- Funções util: normalizar telefone; validar email; gerar hash com bcrypt; gerar JWT com `JWT_SECRET`.
- Responder erros padronizados: `missing_fields`, `email_exists`, `phone_exists`, `invalid_credentials`.

## UI Integração
- Login: enviar POST `/api/auth/login`; salvar `token` em memória; atualizar topbar com `user.name`; habilitar painel de conexões.
- Cadastro: enviar POST `/api/auth/register`; em caso de sucesso, redirecionar para login.
- Máscara de telefone: manter a máscara existente; normalizar para E.164 no backend.
- Exibir mensagens de erro amigáveis sob os formulários.

## Segurança
- Não logar senhas/tokens; usar bcrypt para `password_hash`.
- JWT armazenado apenas em memória da página (não localStorage) nesta fase; se necessário, podemos mover para cookies HTTPOnly.
- Variáveis: `JWT_SECRET` obrigatória; sem defaults fracos.

## Testes
- Cadastro feliz caminho; cadastro com email/phone duplicados; login válido/ inválido.
- Integração UI: cadastro → login → acesso ao painel; verificar erros renderizados.

## Próximos Passos após cadastro/login
- Proteger endpoints de conexões com Bearer JWT (Authorization: `Bearer <token>`).
- Associar `service_connections.user_id` ao usuário autenticado ao criar conexões.
- (Opcional) Implementar reset de senha.
