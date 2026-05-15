import { NextRequest, NextResponse } from "next/server";
import { ARC_TESTNET_RPC_URLS } from "@/lib/arc-kit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Cache-Control": "no-store",
};

function withCors(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  let lastError = "Arc RPC request failed";

  for (const url of ARC_TESTNET_RPC_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        cache: "no-store",
        signal: controller.signal,
      });
      const text = await response.text();

      if (response.ok) {
        return withCors(new NextResponse(text, {
          status: 200,
          headers: { "content-type": response.headers.get("content-type") || "application/json" },
        }));
      }

      lastError = `Arc RPC ${url} returned ${response.status}`;
    } catch (error: any) {
      lastError = error?.name === "AbortError" ? `Arc RPC ${url} timed out` : error?.message || lastError;
    } finally {
      clearTimeout(timeout);
    }
  }

  return withCors(NextResponse.json({ error: lastError }, { status: 502 }));
}
