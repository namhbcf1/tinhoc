const FALLBACK_API_ORIGIN = 'https://vantrangedu-api.bangachieu2.workers.dev';
const INTERNAL_API_ORIGIN = 'https://internal.vantrangedu';

function buildProxyPath(requestUrl) {
  const incomingUrl = new URL(requestUrl);
  const proxyPath = incomingUrl.pathname.replace(/^\/api/, '') || '/';
  return `${proxyPath}${incomingUrl.search}`;
}

function buildTargetUrl(requestUrl, apiOrigin) {
  return new URL(buildProxyPath(requestUrl), apiOrigin).toString();
}

function cloneRequestInit(request, requestUrl) {
  const headers = new Headers(request.headers);
  const incomingUrl = new URL(requestUrl);

  headers.delete('host');
  headers.set('x-forwarded-host', incomingUrl.host);
  headers.set('x-forwarded-proto', incomingUrl.protocol.replace(':', ''));

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  return init;
}

export async function onRequest(context) {
  const { request, env } = context;
  const init = cloneRequestInit(request, request.url);

  try {
    if (env.API && typeof env.API.fetch === 'function') {
      const internalRequest = new Request(
        buildTargetUrl(request.url, INTERNAL_API_ORIGIN),
        init,
      );
      const response = await env.API.fetch(internalRequest);
      return new Response(response.body, response);
    }

    const response = await fetch(buildTargetUrl(request.url, FALLBACK_API_ORIGIN), init);
    return new Response(response.body, response);
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: 'API upstream is unavailable',
        detail: error instanceof Error ? error.message : 'Unknown proxy error',
      },
      { status: 502 },
    );
  }
}
