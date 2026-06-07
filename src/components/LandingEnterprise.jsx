import { useEffect, useState } from "react";
import { Activity, MapPin, X } from "lucide-react";
import { dataService } from "../lib/dataService";
import { getPlatformSettings } from "../lib/enterprise";

export function TestimonialToast() {
  const [items, setItems] = useState([]); const [current, setCurrent] = useState(null); const [visible, setVisible] = useState(false); const [settings, setSettings] = useState(null);
  useEffect(() => { Promise.all([dataService.list("testimonials", "GLOBAL", true), getPlatformSettings()]).then(([results, config]) => { setItems(results.filter((item) => item.active)); setSettings(config); }); }, []);
  useEffect(() => {
    if (!settings?.testimonialEnabled || !items.length) return undefined;
    let showTimer; let hideTimer;
    const schedule = () => {
      const delay = (Math.floor(Math.random() * ((settings.testimonialMaxInterval || 15) - (settings.testimonialMinInterval || 8) + 1)) + (settings.testimonialMinInterval || 8)) * 1000;
      showTimer = setTimeout(() => {
        setCurrent(items[Math.floor(Math.random() * items.length)]); setVisible(true);
        hideTimer = setTimeout(() => { setVisible(false); schedule(); }, 6000);
      }, delay);
    };
    schedule(); return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [items, settings]);
  if (!current) return null;
  return <div className={`fixed bottom-5 left-5 z-[70] w-[min(360px,calc(100vw-40px))] rounded-2xl border border-gold/25 bg-navy p-4 text-white shadow-heritage transition-all duration-500 ${visible ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0"}`}><button onClick={() => setVisible(false)} className="absolute right-3 top-3 text-white/30"><X size={15} /></button><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold font-display font-bold text-navy">{current.name[0]}</span><div><p className="text-sm font-bold">{current.name}</p><p className="mt-1 text-xs leading-5 text-white/60">{current.message}</p><p className="mt-2 flex items-center gap-1 text-[9px] uppercase tracking-widest text-gold"><MapPin size={10} /> {current.country}</p></div></div></div>;
}

export function LiveActivityFeed() {
  const [items, setItems] = useState([]);
  useEffect(() => { dataService.list("testimonials", "GLOBAL", true).then((results) => setItems(results.filter((item) => item.active).slice(0, 12))); }, []);
  return <section className="bg-white px-5 py-24"><div className="mx-auto max-w-6xl"><div className="text-center"><p className="section-kicker">Live client activity</p><h2 className="display-title mt-3 text-4xl text-navy">A global community in motion.</h2></div><div className="glass-card table-scroll mt-10 max-h-96 overflow-y-auto"><div className="divide-y divide-slate-100">{items.map((item) => <div key={item.id} className="flex items-center gap-4 p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold"><Activity size={18} /></span><div className="min-w-0 flex-1"><p className="text-sm text-slate-600"><strong className="text-navy">{item.name}</strong> {item.message}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">{item.country} · just now</p></div><span className="h-2 w-2 rounded-full bg-forest" /></div>)}</div></div></div></section>;
}
