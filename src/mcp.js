import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  listCategories,
  listTags,
} from "./wordpress.js";

let server;

function buildServer() {
  const s = new McpServer({ name: "mcp-wordpress", version: "0.1.0" });

  s.registerTool(
    "wp_list_posts",
    {
      title: "Listar posts",
      description: "Lista posts do WordPress",
      inputSchema: { perPage: z.number().int().optional(), page: z.number().int().optional(), search: z.string().optional() },
      outputSchema: { items: z.array(z.any()) },
    },
    async ({ perPage = 10, page = 1, search }) => {
      const items = await listPosts({ perPage, page, search });
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  s.registerTool(
    "wp_get_post",
    {
      title: "Obter post",
      description: "Obtém um post pelo ID",
      inputSchema: { id: z.number().int() },
      outputSchema: { item: z.any() },
    },
    async ({ id }) => {
      const item = await getPost({ id });
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  s.registerTool(
    "wp_create_post",
    {
      title: "Criar post",
      description: "Cria um novo post",
      inputSchema: { title: z.string(), content: z.string(), status: z.string().optional(), categories: z.array(z.number().int()).optional(), tags: z.array(z.number().int()).optional() },
      outputSchema: { item: z.any() },
    },
    async ({ title, content, status = "draft", categories, tags }) => {
      const item = await createPost({ title, content, status, categories, tags });
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  s.registerTool(
    "wp_update_post",
    {
      title: "Atualizar post",
      description: "Atualiza um post existente",
      inputSchema: { id: z.number().int(), data: z.record(z.any()) },
      outputSchema: { item: z.any() },
    },
    async ({ id, data }) => {
      const item = await updatePost({ id, data });
      const output = { item };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  s.registerTool(
    "wp_delete_post",
    {
      title: "Deletar post",
      description: "Deleta um post",
      inputSchema: { id: z.number().int(), force: z.boolean().optional() },
      outputSchema: { result: z.any() },
    },
    async ({ id, force = true }) => {
      const result = await deletePost({ id, force });
      const output = { result };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  s.registerTool(
    "wp_list_categories",
    {
      title: "Listar categorias",
      description: "Lista categorias",
      inputSchema: { perPage: z.number().int().optional(), page: z.number().int().optional() },
      outputSchema: { items: z.array(z.any()) },
    },
    async ({ perPage = 10, page = 1 }) => {
      const items = await listCategories({ perPage, page });
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  s.registerTool(
    "wp_list_tags",
    {
      title: "Listar tags",
      description: "Lista tags",
      inputSchema: { perPage: z.number().int().optional(), page: z.number().int().optional() },
      outputSchema: { items: z.array(z.any()) },
    },
    async ({ perPage = 10, page = 1 }) => {
      const items = await listTags({ perPage, page });
      const output = { items };
      return { content: [{ type: "text", text: JSON.stringify(output) }], structuredContent: output };
    }
  );

  return s;
}

export function getServer() {
  if (!server) server = buildServer();
  return server;
}