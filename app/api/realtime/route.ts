import { NextResponse } from "next/server";

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing on the server" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: "gpt-realtime-2.1",
            audio: {
              output: {
                voice: "marin",
              },
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI Realtime error:", data);

      return NextResponse.json(
        {
          error: data?.error?.message || "OpenAI Realtime session failed",
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      value: data.value,
    });
  } catch (error) {
    console.error("Realtime route error:", error);

    return NextResponse.json(
      { error: "Server failed to create Realtime session" },
      { status: 500 }
    );
  }
}