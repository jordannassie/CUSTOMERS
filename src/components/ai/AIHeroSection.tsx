"use client";

import { useState, useEffect, useRef } from "react";

const IMAGES = [
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/AI/heroimages/91d7e343-2366-4f2e-849b-9991d5b15d75.png",
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/AI/heroimages/0b013d4c-160b-4f4b-96dd-6cf1a75695b0.png",
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/AI/heroimages/43c0d4ff-9bba-4557-97fa-f81e9e13d9ef.png",
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
            alt={`AI Receptionist — slide ${i + 1}`}
            loading="eager"
            decoding="async"
            className="w-full h-auto block absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{
              opacity: i === slide ? 1 : 0,
              position: i === 0 ? "relative" : "absolute",
              maxHeight: "90vh",
            }}
          />
        ))}
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
