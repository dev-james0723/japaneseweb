export function AppBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 animate-subtlePan"
        style={{
          backgroundImage:
            "radial-gradient(1200px 800px at 20% 10%, rgba(251, 191, 36, 0.10), transparent 60%), radial-gradient(900px 700px at 80% 90%, rgba(125, 211, 252, 0.08), transparent 65%), linear-gradient(160deg, #1a1410 0%, #0c0a09 45%, #050403 100%)",
          backgroundSize: "120% 120%",
          backgroundPosition: "50% 50%",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0.12), rgba(0,0,0,0.58)), linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.35))",
        }}
      />
      {/* subtle paper-grain noise */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />
    </div>
  );
}
