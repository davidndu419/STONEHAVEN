import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PublicContentLayout } from "../components/PublicContentChrome";
import { dataService } from "../lib/dataService";

export function PublicFaqPage() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(0);

  useEffect(() => {
    dataService.list("faqs", "GLOBAL", true).then((result) => {
      setItems(result.filter((item) => item.visible).sort((a, b) => Number(a.order) - Number(b.order)));
    });
  }, []);

  return (
    <PublicContentLayout title="FAQ">
      <main className="px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <p className="section-kicker">Frequently asked</p>
          <h1 className="display-title mt-3 text-4xl text-navy sm:text-5xl">The essentials, made clear.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">Answers to common questions about Stonehaven accounts, investments, funding, and withdrawals.</p>
          <div className="glass-card mt-10 overflow-hidden px-5 sm:px-8">
            {items.map((item, index) => (
              <div key={item.id || item.question} className="border-b border-slate-200 last:border-0">
                <button onClick={() => setOpen(open === index ? -1 : index)} className="flex min-h-14 w-full items-center justify-between gap-4 py-5 text-left font-display text-lg font-bold text-navy sm:text-xl">
                  {item.question}
                  <ChevronDown className={`shrink-0 text-gold transition ${open === index ? "rotate-180" : ""}`} />
                </button>
                {open === index && <p className="pb-6 pr-8 text-sm leading-7 text-slate-500">{item.answer}</p>}
              </div>
            ))}
            {!items.length && <p className="py-10 text-sm text-slate-500">FAQ content is currently being updated.</p>}
          </div>
        </div>
      </main>
    </PublicContentLayout>
  );
}
