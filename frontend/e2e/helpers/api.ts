import type { Page, Request, Route } from '@playwright/test';

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export type ApiRouteHandler = {
  method: string;
  pathname: string | RegExp;
  handle: (context: {
    route: Route;
    request: Request;
    url: URL;
    json: JsonValue;
  }) => Promise<void> | void;
};

function matchesPath(pathname: string, matcher: string | RegExp) {
  if (typeof matcher === 'string') {
    return pathname === matcher;
  }
  return matcher.test(pathname);
}

export async function parseJsonRequest(request: Request): Promise<JsonValue> {
  const rawBody = request.postData();
  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody) as JsonValue;
  } catch {
    return rawBody;
  }
}

export async function fulfillJson(route: Route, body: JsonValue, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  });
}

export function ok<T extends JsonValue>(data: T, extra: Record<string, unknown> = {}) {
  return {
    success: true,
    data,
    ...extra,
  };
}

export async function installApiMock(page: Page, handlers: ApiRouteHandler[]) {
  await page.route('**/api/**', async (route, request) => {
    const url = new URL(request.url());

    for (const handler of handlers) {
      if (request.method() === handler.method && matchesPath(url.pathname, handler.pathname)) {
        await handler.handle({
          route,
          request,
          url,
          json: await parseJsonRequest(request),
        });
        return;
      }
    }

    throw new Error(`Unhandled API request: ${request.method()} ${url.pathname}${url.search}`);
  });
}

