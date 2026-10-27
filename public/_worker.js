// Cloudflare Pages Worker (Advanced Mode)
// Handles SPA rewrites and ensures URLs with query parameters (?db=...) never 404
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Strip query string so Cloudflare Asset matching finds index.html or physical static files
    const assetUrl = new URL(request.url);
    assetUrl.search = "";

    let response = await env.ASSETS.fetch(new Request(assetUrl, request));

    // 2. SPA Fallback: If 404 and not a physical static file (like .js, .css, .ico), serve index.html
    const lastSegment = url.pathname.split("/").pop();
    if (response.status === 404 && !lastSegment.includes(".")) {
      const indexUrl = new URL("/", request.url);
      response = await env.ASSETS.fetch(new Request(indexUrl, request));
    }

    return response;
  }
};
