"use client";

import { useEffect, useRef, useState } from "react";

const IMAGES = [
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/DM/ChatGPT%20Image%20Aug%2012,%202026,%2002_03_22%20PM%20(6).png",
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/DM/ChatGPT%20Image%20Aug%2012,%202026,%2002_03_25%20PM%20(10).png",
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/DM/ChatGPT%20Image%20Aug%2012,%202026,%2002_03_24%20PM%20(9).png",
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/DM/ChatGPT%20Image%20Aug%2012,%202026,%2002_03_23%20PM%20(7).png",
];

const SLIDE_INTERVAL = 5000;

export default function Hero2Section() {
  const [slide, setSlide] = useState(0);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    IMAGES.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

  useEffect(() => {
    slideTimer.current = setTimeout(() => {
      setSlide((current) => (current + 1) % IMAGES.length);
    }, SLIDE_INTERVAL);

    return () => {
      if (slideTimer.current) clearTimeout(slideTimer.current);
    };
  }, [slide]);

  return (
    <section className="relative w-full bg-black overflow-hidden">
      <div
        className="relative w-full overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        {IMAGES.map((src, index) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={src}
            src={src}
            alt={`Customers.Direct customer acquisition — slide ${index + 1}`}
            loading="eager"
            decoding="async"
            className="w-full h-auto block absolute inset-0 h-full object-cover transition-opacity duration-700"
            style={{
              opacity: index === slide ? 1 : 0,
              position: index === 0 ? "relative" : "absolute",
              maxHeight: "90vh",
            }}
          />
        ))}
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {IMAGES.map((_, index) => (
          <button
            key={index}
            onClick={() => setSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            className="transition-all duration-300 rounded-full"
            style={{
              width: index === slide ? 24 : 8,
              height: 8,
              background:
                index === slide ? "white" : "rgba(255,255,255,0.45)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
