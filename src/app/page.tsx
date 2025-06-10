// Updated DashboardPage to match visual mock more accurately with polish pass
export default function Dashboard() {
  return (
    <>
      {/* Top Row: Title, Stats, Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12 items-start">
        <div className="col-span-3">
          <h1 className="text-page-headline font-bold mb-6">Dashboard Overview UI</h1>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-steel-grey p-6 rounded-lg text-center border border-gridlines-grey">
              <p className="text-5xl font-bold text-soft-white">5</p>
              <p className="text-lg text-alloy-silver">ECUs</p>
            </div>
            <div className="bg-steel-grey p-6 rounded-lg text-center border border-gridlines-grey">
              <p className="text-5xl font-bold text-soft-white">12</p>
              <p className="text-lg text-alloy-silver">Maps</p>
            </div>
            <div className="bg-steel-grey p-6 rounded-lg text-center border border-gridlines-grey">
              <p className="text-5xl font-bold text-soft-white">40k</p>
              <p className="text-lg text-alloy-silver">Installs</p>
            </div>
          </div>
        </div>

        {/* Profile Block */}
        <div className="col-span-1 flex justify-end">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-32 h-32 rounded-full border border-gridlines-grey flex items-center justify-center shadow-[0_0_0_2px_#4EFFB0] hover:shadow-[0_0_8px_2px_#4EFFB0] transition-shadow">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-20 h-20 text-alloy-silver"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0"
                />
              </svg>
            </div>
            <p className="text-soft-white text-2xl font-bold leading-tight">John Doe</p>
            <button className="text-electric-blue text-lg font-semibold tracking-wide px-4 py-2 border border-electric-blue rounded-lg hover:bg-electric-blue hover:text-carbon-black transition font-bold">
              Manage Profile
            </button>
          </div>
        </div>
      </div>

      {/* Recent Maps Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-section-title font-bold">Recent Maps</h2>
          <span className="bg-dyno-green/10 text-dyno-green font-semibold text-xs px-3 py-1 rounded-full border border-dyno-green">
            Avg. Power +25%
          </span>
        </div>
        <ul className="divide-y divide-gridlines-grey border border-gridlines-grey rounded-lg overflow-hidden">
          {[
            {
              name: 'A123 Boost Targets',
              time: '2h ago',
              highlight: true,
            },
            {
              name: 'EDC15V Fueling',
              time: '5h ago',
            },
            {
              name: 'EDC16 Injection Start',
              time: '1 day ago',
            },
          ].map(({ name, time, highlight }) => (
            <li
              key={name}
              className="bg-steel-grey px-4 py-3 grid grid-cols-12 items-center hover:bg-carbon-black transition-colors cursor-pointer group"
            >
              <span
                className={`col-span-6 font-medium ${highlight ? 'text-alert-amber font-bold' : 'text-soft-white'}`}
              >
                {name}
              </span>
              <span className="text-alloy-silver text-right col-span-5">{time}</span>
              <span className="text-alloy-silver text-right col-span-1 flex justify-end items-center text-xl transform transition-transform group-hover:translate-x-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-alloy-silver group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button className="bg-carbon-black text-dyno-green px-6 py-3 rounded-lg font-bold border border-dyno-green hover:bg-dyno-green hover:text-carbon-black transition">
          Upload
        </button>
        <button className="bg-carbon-black text-electric-blue px-6 py-3 rounded-lg font-bold border border-electric-blue hover:bg-electric-blue hover:text-carbon-black transition">
          Browse
        </button>
        <button className="bg-carbon-black text-electric-blue px-6 py-3 rounded-lg font-bold border border-electric-blue hover:bg-electric-blue hover:text-carbon-black transition">
          AI Assist
        </button>
      </div>
    </>
  );
}
