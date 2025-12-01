/**
 * Next.js API Route for 1inch API Proxy
 * 
 * Proxies requests to 1inch API to avoid CORS issues
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get("endpoint");
    const apiKey = process.env.NEXT_PUBLIC_1INCH_API_KEY;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint parameter is required" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { 
          error: "1inch API key is required. Set NEXT_PUBLIC_1INCH_API_KEY in .env.local",
          help: "Get your API key from https://portal.1inch.dev/"
        },
        { status: 401 }
      );
    }

    // Build the full URL
    const url = new URL(`https://api.1inch.dev${endpoint}`);
    
    // Copy all query parameters except 'endpoint'
    searchParams.forEach((value, key) => {
      if (key !== "endpoint") {
        url.searchParams.append(key, value);
      }
    });

    // Make request to 1inch API
    const headers: HeadersInit = {
      "Accept": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      return NextResponse.json(
        { error: errorText || response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("1inch API proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, params } = body;
    const apiKey = process.env.NEXT_PUBLIC_1INCH_API_KEY;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint parameter is required" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { 
          error: "1inch API key is required. Set NEXT_PUBLIC_1INCH_API_KEY in .env.local",
          help: "Get your API key from https://portal.1inch.dev/"
        },
        { status: 401 }
      );
    }

    // Build the full URL
    const url = new URL(`https://api.1inch.dev${endpoint}`);
    
    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // Make request to 1inch API
    const headers: HeadersInit = {
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      return NextResponse.json(
        { error: errorText || response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("1inch API proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

