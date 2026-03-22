const API_ORIGIN = 'https://vantrangedu-api.bangachieu2.workers.dev';

function buildTargetUrl(requestUrl) {
  const incomingUrl = new URL(requestUrl);
  const proxyPath = incomingUrl.pathname.replace(/^\/api/, '') || '/';
  return new URL(`${proxyPath}${incomingUrl.search}`, API_ORIGIN).toString();
}

export async function onRequest(context) {
  const { request } = context;
  const targetUrl = buildTargetUrl(request.url);
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.set('x-forwarded-host', new URL(request.url).host);
  headers.set('x-forwarded-proto', new URL(request.url).protocol.replace(':', ''));

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    const response = await fetch(targetUrl, init);
    return new Response(response.body, response);
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: 'API upstream is unavailable',
        detail: error instanceof Error ? error.message : 'Unknown proxy error',
      },
      { status: 502 }
    );
  }
}
