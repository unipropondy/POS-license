// Cloudflare Worker entry point for Static Assets
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};
