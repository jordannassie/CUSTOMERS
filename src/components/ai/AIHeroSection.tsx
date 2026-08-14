"use client";

import { useState, useEffect, useRef } from "react";

const IMAGES = [
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/AIPHONE/ChatGPT%20Image%20Aug%2012,%202026,%2002_02_33%20PM%20(7).png",
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/AIPHONE/ChatGPT%20Image%20Aug%2012,%202026,%2002_02_33%20PM%20(8).png",
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/AIPHONE/ChatGPT%20Image%20Aug%2012,%202026,%2002_02_32%20PM%20(3).png",
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/AIPHONE/ChatGPT%20Image%20Aug%2012,%202026,%2002_02_33%20PM%20(6).png",
];

const SLIDE_INTERVAL = 5000;

export default function AIHeroSection() {
  const [slide, setSlide]   = useState(0);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Eagerly preload all slide images
  useEffect(() => {
    IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Auto-advance slides
  useEffect(() => {
    slideTimer.current = setTimeout(() => {
      setSlide((s) => (s + 1) % IMAGES.length);
    }, SLIDE_INTERVAL);
    return () => {
      if (slideTimer.current) clearTimeout(slideTimer.current);
    };
  }, [slide]);

  return (
    <section className="relative w-full bg-black overflow-hidden">
      {/* Slides */}
      <div className="relative w-full overflow-hidden" style={{ maxHeight: "90vh" }}>
        {IMAGES.map((src, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={src}
            src={src}
            alt={`AI Employee helping a service business answer customer calls — slide ${i + 1}`}
            loading="eager"
            decoding="async"
            className="w-full h-auto block absolute inset-0 h-full object-cover transition-opacity duration-700"
            style={{
              opacity: i === slide ? 1 : 0,
              position: i === 0 ? "relative" : "absolute",
              maxHeight: "90vh",
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 z-[5] flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none">
        <div className="w-full max-w-6xl mx-auto px-6 sm:px-10 pb-14 sm:pb-16">
          <p className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-blue-300 mb-3">
            Customers Direct AI Employee
          </p>
          <h1 className="max-w-3xl text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[0.98] tracking-tight">
            Never Miss Another Customer
          </h1>
          <p className="max-w-2xl mt-4 text-base sm:text-xl text-white/90 leading-relaxed">
            Every call gets answered. Your AI Employee works alongside your staff,
            keeps your existing business number, and takes over after hours or
            when your team is busy—capturing, qualifying, and booking new leads.
          </p>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === slide ? 24 : 8,
              height: 8,
              background: i === slide ? "white" : "rgba(255,255,255,0.45)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
