import { CheckoutButton } from "./CheckoutButton";

export function AdsFinalCta({ checkoutReady }: { checkoutReady: boolean }) {
  return (
    <section className="pb-20 sm:pb-24">
      <div className="mx-auto max-w-[calc(1120px*var(--px,1))] px-4 sm:px-6">
        <div className="rounded-2xl bg-[#171717] px-6 py-14 text-center sm:px-12">
          <h2 className="text-[length:calc(32px*var(--px,1))] font-bold tracking-tight text-white sm:text-[length:calc(40px*var(--px,1))]">
            Your Next Great Ad Starts at $99.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[length:calc(16px*var(--px,1))] leading-relaxed text-white/70">
            Stop waiting for expensive production. Get fresh AI-powered video creative for your brand.
          </p>
          <div className="mt-8">
            <CheckoutButton packageId="starter" label="Create My Video Ad" checkoutReady={checkoutReady} variant="primary" />
          </div>
        </div>
      </div>
    </section>
  );
}
