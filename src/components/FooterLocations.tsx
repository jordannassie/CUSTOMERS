import { Building2, MapPin, Sun } from "lucide-react";

const LOCATIONS = [
  { name: "Dallas, TX", icon: Building2 },
  { name: "Newport Beach, CA", icon: MapPin },
  { name: "Miami, FL", icon: Sun },
];

export default function FooterLocations() {
  return (
    <div className="mt-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">
        Office Locations
      </p>
      <ul className="flex flex-col gap-2">
        {LOCATIONS.map(({ name, icon: Icon }) => (
          <li
            key={name}
            className="flex items-center gap-2 text-sm text-white/50"
          >
            <Icon size={14} className="text-[#60A5FA]" aria-hidden="true" />
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
