export function AppBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 animate-subtlePan"
        style={{
          backgroundImage:
            "radial-gradient(1200px 800px at 18% 8%, rgba(239, 189, 99, 0.11), transparent 62%), radial-gradient(980px 720px at 86% 86%, rgba(145, 213, 232, 0.075), transparent 66%), linear-gradient(160deg, #1b1712 0%, #0d0b09 48%, #050403 100%)",
          backgroundSize: "120% 120%",
          backgroundPosition: "50% 50%",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0.08), rgba(0,0,0,0.6)), linear-gradient(180deg, rgba(255,250,239,0.035), rgba(0,0,0,0.38))",
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
