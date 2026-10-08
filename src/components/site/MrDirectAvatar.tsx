import Image from "next/image";

const MR_DIRECT_SRC =
  "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/Mr.Direct/mr.png";

export function MrDirectAvatar({
  alt = "Mr. Direct",
  className = "",
  priority = false,
}: {
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={MR_DIRECT_SRC}
      alt={alt}
      width={240}
      height={240}
      priority={priority}
      className={`rounded-full object-cover object-[center_22%] ${className}`}
    />
  );
}
