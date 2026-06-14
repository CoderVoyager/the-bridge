import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Grade } from '@/lib/types';

const SYSTEM_INSTRUCTION = `You are an expert product-condition grader for a resale marketplace. Look at the photos of a used product and return ONLY a JSON object (no prose, no markdown fences) with these keys: condition (one of 'like_new','good','fair','damaged'), defects (array of short strings), summary (one plain-language sentence), confidence (a number 0 to 1). Grade only from what is visible. If the photos are insufficient, lower the confidence.`;

function parseGradeJSON(text: string): Grade {
  // Strip markdown fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  // Try to extract JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }
  const parsed = JSON.parse(jsonMatch[0]);

  // Validate and normalize
  const validConditions = ['like_new', 'good', 'fair', 'damaged'] as const;
  if (!validConditions.includes(parsed.condition)) {
    parsed.condition = 'fair'; // fallback
  }
  if (!Array.isArray(parsed.defects)) {
    parsed.defects = [];
  }
  if (typeof parsed.summary !== 'string') {
    parsed.summary = 'Unable to determine condition.';
  }
  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
    parsed.confidence = 0.5;
  }

  return parsed as Grade;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured. Add it to your .env file and restart the dev server.' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { photos } = body as { photos: string[] };

  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: 'No photos provided. Please capture images first.' }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build content parts: system instruction + images
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: SYSTEM_INSTRUCTION + '\n\nPlease grade this product based on the following photos:' },
    ];

    for (const photo of photos) {
      // Extract base64 data and mime type from data URL
      const match = photo.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    if (parts.length === 1) {
      return NextResponse.json(
        { error: 'Could not parse any valid images from the uploaded photos. Try recapturing.' },
        { status: 400 }
      );
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
    });

    const text = response.text ?? '';
    if (!text.trim()) {
      return NextResponse.json(
        { error: 'AI returned an empty response. Try recapturing with clearer photos.' },
        { status: 500 }
      );
    }

    const grade = parseGradeJSON(text);

    return NextResponse.json({ grade });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Grading error:', message);

    // Friendly error messages for known failure modes
    if (message.includes('API_KEY') || message.includes('401') || message.includes('403')) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is invalid or expired. Check your .env file.' },
        { status: 500 }
      );
    }
    if (message.includes('429') || message.includes('quota')) {
      return NextResponse.json(
        { error: 'Gemini API rate limit hit. Wait a moment and try again.' },
        { status: 429 }
      );
    }
    if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND') || message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Cannot reach Gemini API. Check your internet connection.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Grading failed: ' + message }, { status: 500 });
  }
}
