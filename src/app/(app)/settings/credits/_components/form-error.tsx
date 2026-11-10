export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-low-bg px-3 py-2 text-[length:calc(13px*var(--px,1))] text-low-text">
      {message}
    </p>
  );
}
