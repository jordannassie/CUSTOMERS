import { PhoneCall, Users } from "lucide-react";

const year = new Date().getFullYear();

export default function MainFooter() {
  return (
    <footer className="bg-[#0F172A] text-white px-4 pt-16 pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Sales CTA banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 mb-14">
          <div>
            <p className="font-bold text-white">
              Interested in selling Customers Direct?
            </p>
            <p className="text-sm text-white/50 mt-0.5">
              Join our sales program and earn commissions helping businesses grow.
            </p>
          </div>
          <a
            href="/sales"
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-3 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm shrink-0"
          >
            <Users size={15} aria-hidden="true" />
            Join Our Sales Team
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="/" aria-label="Customers.Direct — Home" className="inline-block mb-4">
              <span className="text-white font-black text-[26px] tracking-tight">
                Customers.Direct
              </span>
            </a>
            <p className="text-sm text-white/50 leading-relaxed">
              Customer Acquisition + AI Receptionist for growing businesses.
            </p>
            {/* Social icons */}
            <div className="flex gap-4 mt-5">
              <a
                href="https://www.instagram.com/customersdirect"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61592851422075"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Customers Direct */}
          <div>
            <h4 className="font-bold text-xs text-white/50 uppercase tracking-widest mb-4">
              Customers Direct
            </h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: "Customer Acquisition", href: "/#how-it-works" },
                { label: "AI Phone", href: "/ai-phone" },
                { label: "How It Works", href: "/#how-it-works" },
                { label: "Pricing", href: "/#pricing" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-sm text-white/50 hover:text-white transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold text-xs text-white/50 uppercase tracking-widest mb-4">
              Company
            </h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: "Contact", href: "/#strategy-call" },
                { label: "Book a Call", href: "/#strategy-call" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-sm text-white/50 hover:text-white transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Sales */}
          <div>
            <h4 className="font-bold text-xs text-white/50 uppercase tracking-widest mb-4">
              Sales
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a href="/sales" className="text-sm font-bold text-[#2563EB] hover:text-[#60a5fa] transition-colors">
                  Join Sales Program →
                </a>
              </li>
              <li>
                <a href="/sales/dashboard" className="text-sm text-white/50 hover:text-white transition-colors">
                  Sales Login
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-xs text-white/50 uppercase tracking-widest mb-4">
              Legal
            </h4>
            <ul className="flex flex-col gap-2.5">
              <li><span className="text-sm text-white/30 cursor-default">Privacy Policy</span></li>
              <li><span className="text-sm text-white/30 cursor-default">Terms of Service</span></li>
            </ul>
          </div>
        </div>

        {/* Call CTA */}
        <div className="flex justify-center mb-10">
          <a
            href="tel:9498102010"
            className="inline-flex items-center justify-center gap-3 bg-[#2563EB] text-white font-bold text-lg px-8 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors shadow-lg"
            aria-label="Call Customers.Direct at (949) 810-2010"
          >
            <PhoneCall size={22} aria-hidden="true" />
            Call (949) 810-2010
          </a>
        </div>

        {/* Bottom bar */}
        <hr className="border-white/10 mb-6" />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-white/40">
            © {year} Customers.Direct. All rights reserved.
          </p>
          <a
            href="/admin"
            className="text-xs text-white/20 hover:text-white/50 transition-colors"
          >
            Admin
          </a>
        </div>
      </div>
    </footer>
  );
}
