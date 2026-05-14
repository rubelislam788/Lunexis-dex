import { NextRequest, NextResponse } from "next/server";

const CIRCLE_API_BASE_URL = "https://api.circle.com";
const ALLOWED_PREFIX = "v1/stablecoinKits/";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyCircleRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const joinedPath = path.join("/");

  if (!joinedPath.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json({ error: "Circle API path is not allowed." }, { status: 403 });
  }

  const targetUrl = new URL(`/${joinedPath}`, CIRCLE_API_BASE_URL);
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const userAgent = request.headers.get("x-user-agent");

  if (authorization) headers.set("authorization", authorization);
  if (contentType) headers.set("content-type", contentType);
  if (userAgent) headers.set("x-user-agent", userAgent);

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Circle Stablecoin Service is unreachable from the deployment server." },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyCircleRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyCircleRequest(request, context);
}
