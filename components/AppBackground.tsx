export function AppBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 animate-subtlePan"
        style={{
          backgroundImage:
            "linear-gradient(118deg, rgba(217, 246, 111, 0.12) 0%, transparent 32%), linear-gradient(248deg, rgba(139, 217, 238, 0.1) 0%, transparent 34%), linear-gradient(160deg, #172024 0%, #0b1215 48%, #050a0b 100%)",
          backgroundSize: "120% 120%",
          backgroundPosition: "50% 50%",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(247,251,246,0.045) 1px, transparent 1px), linear-gradient(180deg, rgba(247,251,246,0.035) 1px, transparent 1px), linear-gradient(180deg, rgba(247,251,246,0.04), rgba(4,9,10,0.52))",
          backgroundSize: "68px 68px, 68px 68px, auto",
        }}
      />
      <div
        className="absolute -left-36 top-16 h-[82vh] w-[42vw] min-w-[360px] -rotate-12 border border-white/[0.055] bg-white/[0.025]"
        style={{
          clipPath: "polygon(12% 0, 100% 0, 88% 100%, 0 100%)",
        }}
      />
      <div
        className="absolute right-[-6vw] top-10 hidden font-jp text-[18rem] font-black leading-none text-white/[0.022] lg:block"
      >
        あ
      </div>
      <div
        className="absolute bottom-[-7rem] left-[32vw] hidden font-jp text-[13rem] font-black leading-none md:block"
        style={{ color: "rgba(217, 246, 111, 0.03)" }}
      >
        話
      </div>
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
