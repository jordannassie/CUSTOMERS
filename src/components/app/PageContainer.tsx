// Standard padding and width for app pages; the Overview sets its own.
export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[1200px] p-5 sm:p-8">{children}</div>;
}
