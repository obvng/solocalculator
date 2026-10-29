import { ImageResponse } from "next/og";

export function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px", background: "linear-gradient(135deg, #d7efff, #f6faff 55%, #e5dcff)", color: "#07164f", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#006cff", marginBottom: 45 }}>SOLOCALCULATOR.COM</div>
      <div style={{ display: "flex", fontSize: 68, fontWeight: 700 }}>Everyday numbers.</div>
      <div style={{ display: "flex", fontSize: 68, fontWeight: 700, color: "#006cff" }}>Clear answers.</div>
      <div style={{ display: "flex", fontSize: 28, marginTop: 35 }}>Free calculators for maths, dates, time and money.</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
