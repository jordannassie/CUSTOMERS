export default function PromoBar() {
  return (
    <a
      href="#strategy-call"
      className="block w-full text-center text-white text-xs sm:text-sm font-medium py-2.5 hover:opacity-90 transition-opacity"
      style={{
        background: "linear-gradient(90deg, #1e40af 0%, #2563EB 50%, #3b82f6 100%)",
        letterSpacing: "0.01em",
      }}
    >
      Book a call and get $200 off your 1st month:&nbsp;
      <span className="font-black tracking-wide">CODE DEAL</span>
    </a>
  );
}
