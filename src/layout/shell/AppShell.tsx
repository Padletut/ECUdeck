import type { ReactNode } from 'react';

export default function AppShell({
  children,
}: Readonly<{
  children: ReactNode;
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
              { href: '#', label: 'Maps' },
              { href: '#', label: 'ECUs' },
              { href: '#', label: 'Tuning' },
            ].map((item) => (
              <a key={item.label} href={item.href} className="nav-link">
                {item.label}
              </a>
            ))}
          </nav>
          <button className="rounded-lg border border-electric-blue px-4 py-2 text-base font-semibold text-electric-blue transition-colors hover:bg-electric-blue hover:text-soft-white">
            Create <span>&gt;</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
