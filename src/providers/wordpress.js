import WPAPIPkg from "wpapi";

function resolveWPAPI() { return WPAPIPkg.default || WPAPIPkg; }

export default function register(server, cfg, z) {
  const WPAPI = resolveWPAPI();
  const url = cfg.config.url;
  const username = cfg.secrets.username;
  const password = cfg.secrets.app_password;
  const endpoint = url.endsWith("/wp-json") ? url : `${url.replace(/\/$/, "")}/wp-json`;
  const wp = new WPAPI({ endpoint, username, password, auth: Boolean(username && password) });

  server.registerTool(
    "wp_request",
    { title: "Requisição genérica", description: "Chama qualquer endpoint do WordPress", inputSchema: { method: z.enum(["GET","POST","PUT","PATCH","DELETE"]), path: z.string(), query: z.record(z.any()).optional(), body: z.record(z.any()).optional() }, outputSchema: { status: z.number().int(), data: z.any() } },
    async ({ method, path, query, body }) => {
      let p = String(path || "").replace(/^\//, "");
      if (p.startsWith("wp-json/")) p = p.slice(8);
      const base = endpoint.replace(/\/$/, "");
      const u = new URL(`${base}/${p}`);
      if (query && typeof query === "object") for (const k of Object.keys(query)) u.searchParams.set(k, String(query[k]));
      const headers = { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" };
      if (username && password) headers["Authorization"] = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
      const res = await fetch(u.toString(), { method, headers, body: body ? JSON.stringify(body) : undefined });
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : await res.text();
      const output = { status: res.status, data };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_list_posts",
    { title: "Listar posts", description: "Lista posts", inputSchema: { perPage: z.number().int().optional(), page: z.number().int().optional(), search: z.string().optional() }, outputSchema: { items: z.array(z.any()) } },
    async ({ perPage = 10, page = 1, search }) => {
      let q = wp.posts().perPage(perPage).page(page);
      if (search) q = q.search(search);
      const items = await q.get();
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_get_post",
    { title: "Obter post", description: "Obtém post pelo ID", inputSchema: { id: z.number().int() }, outputSchema: { item: z.any() } },
    async ({ id }) => {
      const item = await wp.posts().id(id).get();
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_create_post",
    { title: "Criar post", description: "Cria post", inputSchema: { title: z.string(), content: z.string(), status: z.string().optional(), categories: z.array(z.number().int()).optional(), tags: z.array(z.number().int()).optional() }, outputSchema: { item: z.any() } },
    async ({ title, content, status = "draft", categories, tags }) => {
      const payload = { title, content, status };
      if (categories) payload.categories = categories;
      if (tags) payload.tags = tags;
      const item = await wp.posts().create(payload);
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_update_post",
    { title: "Atualizar post", description: "Atualiza post", inputSchema: { id: z.number().int(), data: z.record(z.any()) }, outputSchema: { item: z.any() } },
    async ({ id, data }) => {
      const item = await wp.posts().id(id).update(data);
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_delete_post",
    { title: "Deletar post", description: "Deleta post", inputSchema: { id: z.number().int(), force: z.boolean().optional() }, outputSchema: { result: z.any() } },
    async ({ id, force = true }) => {
      const result = await wp.posts().id(id).delete({ force });
      const output = { result };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_list_pages",
    { title: "Listar páginas", description: "Lista páginas", inputSchema: { perPage: z.number().int().optional(), page: z.number().int().optional(), search: z.string().optional() }, outputSchema: { items: z.array(z.any()) } },
    async ({ perPage = 10, page = 1, search }) => {
      let q = wp.pages().perPage(perPage).page(page);
      if (search) q = q.search(search);
      const items = await q.get();
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_get_page",
    { title: "Obter página", description: "Obtém página", inputSchema: { id: z.number().int() }, outputSchema: { item: z.any() } },
    async ({ id }) => {
      const item = await wp.pages().id(id).get();
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_create_page",
    { title: "Criar página", description: "Cria página", inputSchema: { title: z.string(), content: z.string(), status: z.string().optional() }, outputSchema: { item: z.any() } },
    async ({ title, content, status = "draft" }) => {
      const item = await wp.pages().create({ title, content, status });
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_update_page",
    { title: "Atualizar página", description: "Atualiza página", inputSchema: { id: z.number().int(), data: z.record(z.any()) }, outputSchema: { item: z.any() } },
    async ({ id, data }) => {
      const item = await wp.pages().id(id).update(data);
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_delete_page",
    { title: "Deletar página", description: "Deleta página", inputSchema: { id: z.number().int(), force: z.boolean().optional() }, outputSchema: { result: z.any() } },
    async ({ id, force = true }) => {
      const result = await wp.pages().id(id).delete({ force });
      const output = { result };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_list_categories",
    { title: "Listar categorias", description: "Lista categorias", inputSchema: { perPage: z.number().int().optional(), page: z.number().int().optional() }, outputSchema: { items: z.array(z.any()) } },
    async ({ perPage = 10, page = 1 }) => {
      const items = await wp.categories().perPage(perPage).page(page).get();
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_get_category",
    { title: "Obter categoria", description: "Obtém categoria", inputSchema: { id: z.number().int() }, outputSchema: { item: z.any() } },
    async ({ id }) => {
      const item = await wp.categories().id(id).get();
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_create_category",
    { title: "Criar categoria", description: "Cria categoria", inputSchema: { name: z.string(), slug: z.string().optional(), description: z.string().optional() }, outputSchema: { item: z.any() } },
    async ({ name, slug, description }) => {
      const payload = { name };
      if (slug) payload.slug = slug;
      if (description) payload.description = description;
      const item = await wp.categories().create(payload);
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_update_category",
    { title: "Atualizar categoria", description: "Atualiza categoria", inputSchema: { id: z.number().int(), data: z.record(z.any()) }, outputSchema: { item: z.any() } },
    async ({ id, data }) => {
      const item = await wp.categories().id(id).update(data);
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_delete_category",
    { title: "Deletar categoria", description: "Deleta categoria", inputSchema: { id: z.number().int(), force: z.boolean().optional() }, outputSchema: { result: z.any() } },
    async ({ id, force = true }) => {
      const result = await wp.categories().id(id).delete({ force });
      const output = { result };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_list_tags",
    { title: "Listar tags", description: "Lista tags", inputSchema: { perPage: z.number().int().optional(), page: z.number().int().optional() }, outputSchema: { items: z.array(z.any()) } },
    async ({ perPage = 10, page = 1 }) => {
      const items = await wp.tags().perPage(perPage).page(page).get();
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_get_tag",
    { title: "Obter tag", description: "Obtém tag", inputSchema: { id: z.number().int() }, outputSchema: { item: z.any() } },
    async ({ id }) => {
      const item = await wp.tags().id(id).get();
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_create_tag",
    { title: "Criar tag", description: "Cria tag", inputSchema: { name: z.string(), slug: z.string().optional(), description: z.string().optional() }, outputSchema: { item: z.any() } },
    async ({ name, slug, description }) => {
      const payload = { name };
      if (slug) payload.slug = slug;
      if (description) payload.description = description;
      const item = await wp.tags().create(payload);
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_update_tag",
    { title: "Atualizar tag", description: "Atualiza tag", inputSchema: { id: z.number().int(), data: z.record(z.any()) }, outputSchema: { item: z.any() } },
    async ({ id, data }) => {
      const item = await wp.tags().id(id).update(data);
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_delete_tag",
    { title: "Deletar tag", description: "Deleta tag", inputSchema: { id: z.number().int(), force: z.boolean().optional() }, outputSchema: { result: z.any() } },
    async ({ id, force = true }) => {
      const result = await wp.tags().id(id).delete({ force });
      const output = { result };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_list_users",
    { title: "Listar usuários", description: "Lista usuários", inputSchema: { perPage: z.number().int().optional(), page: z.number().int().optional(), search: z.string().optional() }, outputSchema: { items: z.array(z.any()) } },
    async ({ perPage = 10, page = 1, search }) => {
      let q = wp.users().perPage(perPage).page(page);
      if (search) q = q.search(search);
      const items = await q.get();
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_get_user",
    { title: "Obter usuário", description: "Obtém usuário", inputSchema: { id: z.number().int() }, outputSchema: { item: z.any() } },
    async ({ id }) => {
      const item = await wp.users().id(id).get();
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_list_comments",
    { title: "Listar comentários", description: "Lista comentários", inputSchema: { perPage: z.number().int().optional(), page: z.number().int().optional(), post: z.number().int().optional() }, outputSchema: { items: z.array(z.any()) } },
    async ({ perPage = 10, page = 1, post }) => {
      let q = wp.comments().perPage(perPage).page(page);
      if (post) q = q.param("post", post);
      const items = await q.get();
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_get_comment",
    { title: "Obter comentário", description: "Obtém comentário", inputSchema: { id: z.number().int() }, outputSchema: { item: z.any() } },
    async ({ id }) => {
      const item = await wp.comments().id(id).get();
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_create_comment",
    { title: "Criar comentário", description: "Cria comentário", inputSchema: { post: z.number().int(), content: z.string() }, outputSchema: { item: z.any() } },
    async ({ post, content }) => {
      const item = await wp.comments().create({ post, content });
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_update_comment",
    { title: "Atualizar comentário", description: "Atualiza comentário", inputSchema: { id: z.number().int(), data: z.record(z.any()) }, outputSchema: { item: z.any() } },
    async ({ id, data }) => {
      const item = await wp.comments().id(id).update(data);
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_delete_comment",
    { title: "Deletar comentário", description: "Deleta comentário", inputSchema: { id: z.number().int(), force: z.boolean().optional() }, outputSchema: { result: z.any() } },
    async ({ id, force = true }) => {
      const result = await wp.comments().id(id).delete({ force });
      const output = { result };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_list_media",
    { title: "Listar mídia", description: "Lista mídia", inputSchema: { perPage: z.number().int().optional(), page: z.number().int().optional(), search: z.string().optional() }, outputSchema: { items: z.array(z.any()) } },
    async ({ perPage = 10, page = 1, search }) => {
      let q = wp.media().perPage(perPage).page(page);
      if (search) q = q.search(search);
      const items = await q.get();
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_get_media",
    { title: "Obter mídia", description: "Obtém mídia", inputSchema: { id: z.number().int() }, outputSchema: { item: z.any() } },
    async ({ id }) => {
      const item = await wp.media().id(id).get();
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_create_media",
    { title: "Criar mídia", description: "Cria mídia", inputSchema: { source_url: z.string(), data: z.record(z.any()).optional() }, outputSchema: { item: z.any() } },
    async ({ source_url, data }) => {
      const item = await wp.media().create({ source_url, ...(data||{}) });
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_update_media",
    { title: "Atualizar mídia", description: "Atualiza mídia", inputSchema: { id: z.number().int(), data: z.record(z.any()) }, outputSchema: { item: z.any() } },
    async ({ id, data }) => {
      const item = await wp.media().id(id).update(data);
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_delete_media",
    { title: "Deletar mídia", description: "Deleta mídia", inputSchema: { id: z.number().int(), force: z.boolean().optional() }, outputSchema: { result: z.any() } },
    async ({ id, force = true }) => {
      const result = await wp.media().id(id).delete({ force });
      const output = { result };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_list_types",
    { title: "Listar tipos", description: "Lista tipos de post", inputSchema: { }, outputSchema: { items: z.array(z.any()) } },
    async () => {
      const obj = await wp.types().get();
      const items = Object.values(obj || {});
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_list_statuses",
    { title: "Listar status", description: "Lista status", inputSchema: { }, outputSchema: { items: z.array(z.any()) } },
    async () => {
      const obj = await wp.statuses().get();
      const items = Object.values(obj || {});
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  server.registerTool(
    "wp_list_taxonomies",
    { title: "Listar taxonomias", description: "Lista taxonomias", inputSchema: { }, outputSchema: { items: z.array(z.any()) } },
    async () => {
      const obj = await wp.taxonomies().get();
      const items = Object.values(obj || {});
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );
}