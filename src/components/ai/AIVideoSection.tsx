export default function AIVideoSection() {
  return (
    <section className="bg-white px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        <div
          className="rounded-3xl overflow-hidden border border-gray-100"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/AI/Video/0812%20(1)%20Ai.mov"
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-auto block"
            aria-label="Customers Direct AI Receptionist — product overview"
          />
        </div>
      </div>
    </section>
  );
}
