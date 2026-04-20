export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const { pathname } = url;

  // Compatibility rewrite for stale relative chunk URLs from older cached HTML.
  // Example: /admin/assets/x.js or /a/b/c/assets/x.js -> /assets/x.js
  const assetsToken = "/assets/";
  const tokenIndex = pathname.indexOf(assetsToken);
  if (tokenIndex > 0) {
    const assetSuffix = pathname.slice(tokenIndex + assetsToken.length);
    if (assetSuffix) {
      const rewritten = new URL(request.url);
      rewritten.pathname = `/assets/${assetSuffix}`;
      return next(new Request(rewritten, request));
    }
  }

  // Compatibility rewrite for stale HTML that requests chunk files without /assets prefix
  // e.g. /admin/dashboard/index-XXXX.js -> /assets/index-XXXX.js
  const fileName = pathname.split("/").pop() || "";
  const looksLikeChunk =
    /-[A-Za-z0-9_-]{6,}\.(js|css|mjs)$/i.test(fileName) &&
    !pathname.startsWith("/assets/");

  if (looksLikeChunk) {
    const rewritten = new URL(request.url);
    rewritten.pathname = `/assets/${fileName}`;
    return next(new Request(rewritten, request));
  }

  const response = await next();
  const contentType = response.headers.get("content-type") || "";

  // Never cache HTML entry documents. Cached HTML can reference old hashed assets
  // after a deploy, which then fall back to SPA HTML and trigger MIME errors.
  if (contentType.includes("text/html")) {
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}
