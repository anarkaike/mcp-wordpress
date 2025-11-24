import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import wordpress from "./wordpress.js";
import whatsapp from "./whatsapp.js";

const registry = {
  wordpress,
  whatsapp,
};

export function createServerForProvider(providerKey, cfg) {
  const mod = registry[providerKey];
  if (!mod) throw new Error("provider_not_supported");
  const server = new McpServer({ name: `mcp-${providerKey}`, version: "0.1.0" });
  mod(server, cfg, z);
  return server;
}