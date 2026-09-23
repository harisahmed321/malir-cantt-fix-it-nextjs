const stats = [
  { label: 'Reports resolved', value: '2.4K+' },
  { label: 'Active volunteers', value: '480' },
  { label: 'Response time', value: '< 48h' },
];

const issues = [
  {
    title: 'Streetlights & safety',
    description: 'Report broken lights, unsafe corners, and poor visibility in public spaces.',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Drainage & water',
    description: 'Highlight blocked drains, overflowing channels, and waterlogging hotspots.',
    accent: 'from-cyan-500 to-sky-500',
  },
  {
    title: 'Waste & cleanliness',
    description: 'Flag illegal dumping, garbage buildup, and sanitation issues in residential zones.',
    accent: 'from-amber-500 to-orange-500',
  },
];

const steps = [
  'Submit a photo-backed issue in under a minute.',
  'Local volunteers verify and route it to the right team.',
  'Track progress, resolution, and public accountability.',
];

const impact = [
  'Civic issue reporting for Malir Cantt residents',
  'Transparent city service coordination',
  'Community-powered neighborhood accountability',
];

export default function HomePage() {
  return (
    <main>
      <header className="border-b border-slate-200/80 bg-white/60 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-lg font-bold text-white shadow-lg shadow-emerald-200">
              M
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-slate-900">Malir Cantt</p>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Fix It</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 md:flex">
            <a href="/services">Find a provider</a>
            <a href="#how-it-works">How it works</a>
            <a href="/admin">Admin portal</a>
          </nav>

          <a href="/services" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700">Find a service</a>
        </div>
      </header>

      <section className="container grid items-center gap-12 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
        <div>
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Community-first civic platform
          </span>
          <h1 className="mt-6 max-w-xl text-5xl font-black tracking-tight text-slate-900 md:text-6xl">
            Build a cleaner, safer Malir Cantt together.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Report municipal issues, coordinate neighborhood action, and stay informed on what is being fixed across your community.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a href="/services" className="rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-500">Find a local expert</a>
            <a href="#issues" className="rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Explore services</a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
                <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-emerald-200/80 via-teal-100/70 to-sky-100/80 blur-2xl" />
          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm">
            <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Community feed</p>
                  <h2 className="mt-2 text-2xl font-bold">Live issue tracker</h2>
                </div>
                <div className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                  24 open
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  ['Broken streetlight', 'North Avenue', 'In progress'],
                  ['Blocked drain', 'Malir 15', 'Verified'],
                  ['Garbage pileup', 'Mohammad Ali Road', 'Awaiting team'],
                ].map(([title, area, status]) => (
                  <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{title}</p>
                        <p className="mt-1 text-sm text-slate-400">{area}</p>
                      </div>
                      <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                        {status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="issues" className="bg-slate-900 py-20 text-white">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">What we solve</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight">Everyday issues that affect quality of life.</h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {issues.map((issue) => (
              <div key={issue.title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className={`mb-5 h-12 w-12 rounded-2xl bg-gradient-to-br ${issue.accent}`} />
                <h3 className="text-xl font-bold">{issue.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{issue.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600">How it works</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900">Fast reporting. Faster action.</h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step} className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-sm">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">
                  0{index + 1}
                </div>
                <p className="text-lg leading-8 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="impact" className="pb-20">
        <div className="container overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-12">
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600">Impact</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900">A visible, accountable city service system.</h2>
            </div>

            <div className="space-y-4">
              {impact.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
                    ✓
                  </div>
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
