import { LoaderCircle, Landmark } from "lucide-react";

export function Brand({ compact = false, light = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/40 bg-gold/10 text-gold">
        <Landmark size={21} strokeWidth={1.7} />
      </div>
      {!compact && (
        <div className={light ? "text-white" : "text-navy"}>
          <div className="font-display text-lg font-bold leading-none tracking-wide">STONEHAVEN</div>
          <div className="mt-1 text-[8px] font-bold tracking-[0.28em] text-gold">INVESTMENT GROUP</div>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow && <p className="section-kicker mb-2">{eyebrow}</p>}
        <h1 className="display-title text-3xl text-navy md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize status-${status}`}>
      {status}
    </span>
  );
}

export function EmptyState({ icon: Icon = Landmark, title, text }) {
  return (
    <div className="glass-card grid min-h-56 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold/10 text-gold"><Icon size={22} /></div>
        <h3 className="mt-4 font-display text-xl font-bold text-navy">{title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

export function LoadingScreen() {
  return <div className="grid min-h-screen place-items-center bg-navy text-gold"><LoaderCircle className="animate-spin" size={34} /></div>;
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-navy/70 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-stone p-6 shadow-heritage" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="display-title text-2xl text-navy">{title}</h2>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-200">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
