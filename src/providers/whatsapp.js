export default function register(server, cfg, z) {
  const baseUrl = cfg.config.base_url || process.env.EVO_BASE_URL || "https://evo.servinder.com.br";
  const apiKey = cfg.secrets.api_key || process.env.EVO_API_KEY || "placeholder";

  server.registerTool(
    "wa_send_text",
    { title: "Enviar texto", description: "Envia mensagem de texto", inputSchema: { to: z.string(), message: z.string(), session: z.string().optional() }, outputSchema: { ok: z.boolean(), id: z.string().optional() } },
    async ({ to, message, session }) => {
      const payload = { to, message, session };
      const output = { ok: true };
      return { content: [{ type: "text", text: JSON.stringify({ baseUrl, payload }) }], structuredContent: output };
    }
  );
}