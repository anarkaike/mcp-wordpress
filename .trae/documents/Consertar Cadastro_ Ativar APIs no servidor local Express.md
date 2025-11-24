## Problema
- Ao cadastrar, o frontend chama `/api/auth/register`, mas nosso servidor local Express só serve `/mcp` e estático. As rotas `/api/*` existem como serverless (Vercel), porém não estão montadas no servidor local.
- Resultado: Express devolve HTML (index) e o fetch tenta parsear como JSON → “Unexpected token '<'…”.

## Solução
- Montar as rotas `/api/*` no servidor local reutilizando os mesmos módulos que criamos em `api/`.
- Implementar um despachante simples com dynamic import ESM para:
  - `POST /api/auth/register` → `api/auth/register.mjs`
  - `POST /api/auth/login` → `api/auth/login.mjs`
  - `GET/POST /api/connections` → `api/connections/index.mjs`
  - `POST /api/providers/seed` → `api/providers/seed.mjs`
- Padronizar respostas JSON de erro e garantir `Content-Type: application/json`.

## Passos
1. Criar um helper `mountApiRoute(path, method, file)` em `src/server.js` com `import(file)` e `handler(req,res)`.
2. Registrar as rotas acima no Express.
3. Testar localmente: cadastro (200/201), login (200), conexões (200/201).
4. Ajustar se necessário códigos de erro e mensagens para a UI.

## Resultado Esperado
- O cadastro deixa de retornar HTML e passa a responder JSON adequado.
- A UI exibe sucesso ou mensagem de erro amigável e permite seguir para login/painel.