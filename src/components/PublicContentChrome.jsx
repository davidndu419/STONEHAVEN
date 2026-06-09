import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Brand } from "./UI";

const links = [
  ["/", "Home"],
  ["/#plans", "Plans"],
  ["/faq", "FAQ"],
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
];

export function PublicContentHeader({ title }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 px-4 text-white shadow-lg backdrop-blur-xl sm:px-5">
      <div className="mx-auto grid min-h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-2 sm:min-h-20 sm:gap-4">
        <Link to="/" aria-label="Stonehaven home" className="w-fit"><Brand compact light /></Link>
        <p className="truncate text-center font-display text-sm font-bold sm:text-lg">{title}</p>
        <Link to="/" className="inline-flex min-h-11 items-center justify-center gap-1.5 justify-self-end rounded-xl border border-gold/40 px-3 text-[11px] font-bold text-gold transition hover:bg-gold hover:text-navy sm:gap-2 sm:px-4 sm:text-xs">
          <ArrowLeft size={15} /> <span className="hidden xs:inline">Back </span>Home
        </Link>
      </div>
    </header>
  );
}

export function PublicContentFooter() {
  return (
    <footer className="bg-[#090f1c] px-5 py-10 text-white/55">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Brand light />
        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {links.map(([to, label]) => <Link key={to} to={to} className="transition hover:text-gold">{label}</Link>)}
        </nav>
      </div>
    </footer>
  );
}

export function PublicContentLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-stone">
      <PublicContentHeader title={title} />
      {children}
      <PublicContentFooter />
    </div>
  );
}
