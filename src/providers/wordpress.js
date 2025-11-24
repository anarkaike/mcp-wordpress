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
}