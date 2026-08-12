export default function MobileCallBar() {
  return (
    <a
      href="tel:9498102010"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-3 bg-[#2563EB] text-white font-bold text-base"
      style={{ paddingTop: 14, paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))" }}
      aria-label="Call Customers.Direct at (949) 810-2010"
    >
      {/* Phone icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.09 1.2 2 2 0 012.07 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11l-1.27 1.27a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
      Call (949) 810-2010
    </a>
  );
}
