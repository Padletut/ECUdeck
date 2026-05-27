import type { ReactNode } from 'react';

export type AppShellPage = 'dashboard' | 'plugins';

export default function AppShell({
  children,
  activePage,
  onNavigate,
}: Readonly<{
  children: ReactNode;
  activePage: AppShellPage;
  onNavigate: (page: AppShellPage) => void;
}>) {
  return (
    <div className="min-h-screen bg-carbon-black font-sans text-alloy-silver antialiased">
      <header className="border-b border-gridlines-grey bg-steel-grey">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
          <div className="flex items-center">
            <img src="/logo.png" alt="ECUDeck logo" className="h-10 w-auto object-contain" />
          </div>
          <nav className="nav-container flex space-x-10 text-lg font-semibold text-alloy-silver">
            {[
              { key: 'dashboard' as const, label: 'Dashboard' },
              { key: 'plugins' as const, label: 'Plugins' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`nav-link border-0 bg-transparent p-0 ${activePage === item.key ? 'nav-link-active text-electric-blue' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => onNavigate('plugins')}
            className="rounded-lg border border-electric-blue px-4 py-2 text-base font-semibold text-electric-blue transition-colors hover:bg-electric-blue hover:text-soft-white"
          >
            Open Plugins <span>&gt;</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
