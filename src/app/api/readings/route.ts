// The API the Raspberry Pi talks to.
//   GET  /api/readings  → every reading stored so far (oldest first)
//   POST /api/readings  → store one new hourly reading
// See docs/API.md for copy-paste examples.

import { addReading, getReadings } from "@/lib/readingsStore";
import type { ApiError, ReadingsResponse } from "@/lib/types";
import { validateReading } from "@/lib/validateReading";

export async function GET() {
  const body: ReadingsResponse = { readings: getReadings() };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    const body: ApiError = {
      error: "Body is not valid JSON.",
      details: ['Send a JSON object and the header "Content-Type: application/json".'],
    };
    return Response.json(body, { status: 400 });
  }

  const result = validateReading(json);
  if (!result.ok) {
    const body: ApiError = { error: "Reading rejected.", details: result.errors };
    return Response.json(body, { status: 400 });
  }

  const { stored, replaced, count } = addReading(result.reading);
  // 201 Created for a new hour, 200 OK when an existing hour was replaced.
  return Response.json({ reading: stored, replaced, count }, { status: replaced ? 200 : 201 });
}
