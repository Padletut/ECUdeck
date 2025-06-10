import type { Metadata } from 'next';
import Image from 'next/image';
import './globals.css';

export const metadata: Metadata = {
  title: 'ECUdeck Dashboard',
  description: 'Dashboard for ECUdeck application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-carbon-black text-alloy-silver font-sans min-h-screen">
        {/* Header */}
        <header className="bg-steel-grey border-b border-gridlines-grey">
          <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
            {/* Logo */}
            <div className="flex items-center">
              <Image
                src="/logo.png"
                alt="ECUdeck Logo"
                width={230}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            {/* Navigation */}
            <nav className="flex space-x-10 text-alloy-silver font-semibold text-lg nav-container">
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
            {/* Create Button */}
            <button className="border border-electric-blue text-electric-blue px-4 py-2 rounded-lg font-semibold text-base hover:bg-electric-blue hover:text-soft-white transition-colors">
              Create <span>&gt;</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-6 py-8 max-w-7xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
