import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST() {
  try {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt:
        "一只高级感白色智能手表商业摄影，极简背景，苹果风产品摄影，柔光，高级电商视觉",
      size: "1024x1024",
      response_format: "b64_json",
    });

    const image = response.data[0]?.b64_json;

    if (!image) {
      return NextResponse.json({ error: "No image returned from OpenAI" });
    }

    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
