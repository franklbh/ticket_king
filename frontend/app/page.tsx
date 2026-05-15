const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-6 text-[#181916] sm:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-6 py-5 pb-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-lg font-bold">Ticket King</div>
          <nav
            className="flex gap-5 text-sm text-[#646761]"
            aria-label="Primary"
          >
            <a href="#booking">Booking</a>
            <a href="#admin">Admin</a>
            <a href="#reports">Reports</a>
          </nav>
        </header>

        <section className="grid items-center gap-10 py-6 md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] md:py-12">
          <div>
            <p className="mb-4 text-[13px] font-bold uppercase text-[#115e59]">
              VR venue ticketing
            </p>
            <h1 className="m-0 text-[46px] font-bold leading-none tracking-normal sm:text-[clamp(42px,6vw,76px)]">
              Ticket King
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-[#646761]">
              A starting point for online bookings, walk-in sales, ticket issuance,
              QR check-in, and admin operations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex min-h-11 items-center rounded-lg border border-[#0f766e] bg-[#0f766e] px-4 font-bold text-white"
                href="#booking"
              >
                Start booking flow
              </a>
              <a
                className="inline-flex min-h-11 items-center rounded-lg border border-[#dedfd7] px-4 font-bold"
                href="#admin"
              >
                Open admin panel
              </a>
            </div>
          </div>

          <aside
            className="rounded-lg border border-[#dedfd7] bg-white p-6"
            aria-label="Project status"
          >
            <h2 className="mb-5 text-lg font-bold">System baseline</h2>
            <div className="grid gap-4">
              <div className="flex justify-between gap-5 border-b border-[#dedfd7] pb-4">
                <span className="text-[#646761]">Frontend</span>
                <strong className="text-right">Next.js</strong>
              </div>
              <div className="flex justify-between gap-5 border-b border-[#dedfd7] pb-4">
                <span className="text-[#646761]">Backend</span>
                <strong className="text-right">FastAPI</strong>
              </div>
              <div className="flex justify-between gap-5">
                <span className="text-[#646761]">API base URL</span>
                <strong className="text-right">{apiBaseUrl}</strong>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
