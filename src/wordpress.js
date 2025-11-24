import WPAPIPkg from "wpapi";

let wpClient;

function resolveWPAPI() {
  return WPAPIPkg.default || WPAPIPkg;
}

export function getWpClient() {
  if (wpClient) return wpClient;
  const env = process.env;
  const baseUrl = (env.WP_URL ?? env.WP_Url ?? env.wp_url ?? "").trim();
  const username = (env.WP_USERNAME ?? env.WP_Username ?? env.wp_username ?? "").trim() || undefined;
  const password = (env.WP_APP_PASSWORD ?? env.WP_App_Password ?? env.wp_app_password ?? "").trim() || undefined;
  if (!baseUrl) throw new Error("WP_URL ausente");
  const WPAPI = resolveWPAPI();
  const endpoint = baseUrl.endsWith("/wp-json") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/wp-json`;
  wpClient = new WPAPI({ endpoint, username, password, auth: Boolean(username && password) });
  return wpClient;
}

export async function listPosts({ perPage = 10, page = 1, search } = {}) {
  const wp = getWpClient();
  let q = wp.posts().perPage(perPage).page(page);
  if (search) q = q.search(search);
  return q.get();
}

export async function getPost({ id }) {
  const wp = getWpClient();
  return wp.posts().id(id).get();
}

export async function createPost({ title, content, status = "draft", categories, tags }) {
  const wp = getWpClient();
  const payload = { title, content, status };
  if (categories) payload.categories = categories;
  if (tags) payload.tags = tags;
  return wp.posts().create(payload);
}

export async function updatePost({ id, data }) {
  const wp = getWpClient();
  return wp.posts().id(id).update(data);
}

export async function deletePost({ id, force = true }) {
  const wp = getWpClient();
  return wp.posts().id(id).delete({ force });
}

export async function listCategories({ perPage = 10, page = 1 } = {}) {
  const wp = getWpClient();
  return wp.categories().perPage(perPage).page(page).get();
}

export async function listTags({ perPage = 10, page = 1 } = {}) {
  const wp = getWpClient();
  return wp.tags().perPage(perPage).page(page).get();
}