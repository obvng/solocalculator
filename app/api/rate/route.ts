import { NextRequest, NextResponse } from "next/server";

const currencyPattern = /^[A-Z]{3}$/;

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from")?.toUpperCase() ?? "";
  const to = request.nextUrl.searchParams.get("to")?.toUpperCase() ?? "";
  if (!currencyPattern.test(from) || !currencyPattern.test(to)) return NextResponse.json({ error: "Invalid currency code" }, { status: 400 });
  if (from === to) return NextResponse.json({ rate: 1, date: new Date().toISOString().slice(0, 10) });
  try {
    const response = await fetch(`https://api.frankfurter.dev/v2/rate/${from}/${to}`, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`Rate service returned ${response.status}`);
    const data = await response.json() as { rate?: number; date?: string };
    if (typeof data.rate !== "number") throw new Error("Rate missing");
    return NextResponse.json({ rate: data.rate, date: data.date ?? new Date().toISOString().slice(0, 10) });
  } catch {
    return NextResponse.json({ error: "Rate unavailable" }, { status: 503 });
  }
}
