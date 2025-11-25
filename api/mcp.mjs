import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { resolveMcpServer } from "../src/handlers/mcp.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const env = process.env || {};
    const hasWpUrl = Boolean((env.WP_URL ?? env.WP_Url ?? env.wp_url ?? "").trim());
    const hasUsername = Boolean((env.WP_USERNAME ?? env.WP_Username ?? env.wp_username ?? "").trim());
    const hasPassword = Boolean((env.WP_APP_PASSWORD ?? env.WP_App_Password ?? env.wp_app_password ?? "").trim());
    res.status(200).json({ status: "ok", name: "mcp-wordpress", endpoint: "/api/mcp", transport: "streamable-http", env: { hasWpUrl, hasUsername, hasPassword } });
    return;
  }
  const providerParam = (req.query?.provider || req.params?.provider || "").toString().trim();
  const auth = req.headers?.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const tokenParam = (bearer || req.query?.token || "").toString().trim();
  const resolved = await resolveMcpServer(providerParam, tokenParam);
  if (resolved.error) return res.status(resolved.error.code).json(resolved.error.body);
  const server = resolved.server;
  const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });
  res.on("close", () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}