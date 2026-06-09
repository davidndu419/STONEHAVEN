import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { dataService } from "../lib/dataService";

const money = (value) => `$${Number(value || 0).toLocaleString()}`;
const normalizedType = (value) => String(value || "").toLowerCase();

export function ManagedInvestmentCalculator() {
  const [plans, setPlans] = useState([]);
  const [type, setType] = useState("");
  const [planId, setPlanId] = useState("");
  const [capital, setCapital] = useState(0);

  useEffect(() => {
    dataService.listPublic("investmentCalculatorPlans").then((items) => {
      const sorted = items.sort((a, b) => Number(a.displayOrder) - Number(b.displayOrder));
      setPlans(sorted);
      const firstType = normalizedType(sorted[0]?.planType);
      setType(firstType);
      setPlanId(sorted[0]?.id || "");
      setCapital(Number(sorted[0]?.defaultCapital || 0));
    });
  }, []);

  const types = useMemo(() => [...new Set(plans.map((item) => normalizedType(item.planType)))], [plans]);
  const typePlans = plans.filter((item) => normalizedType(item.planType) === type);
  const selected = typePlans.find((item) => item.id === planId) || typePlans[0];
  const projected = Number(selected?.projectedReturn || 0);
  const profit = projected - Number(capital || 0);
  const roi = capital > 0 ? (profit / capital) * 100 : 0;

  function selectType(nextType) {
    const first = plans.find((item) => normalizedType(item.planType) === nextType);
    setType(nextType);
    setPlanId(first?.id || "");
    setCapital(Number(first?.defaultCapital || 0));
  }

  function selectPlan(nextId) {
    const next = plans.find((item) => item.id === nextId);
    setPlanId(nextId);
    setCapital(Number(next?.defaultCapital || 0));
  }

  return (
    <section className="bg-navy px-5 py-28 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.75fr_1.25fr]">
        <div className="max-w-2xl">
          <p className="section-kicker">Investment calculator</p>
          <h2 className="display-title mt-3 text-3xl sm:text-4xl md:text-5xl">Model your plan before you begin.</h2>
          <p className="mt-4 text-sm leading-7 text-white/55 md:text-base">Review the active plan schedule and projected outcome before creating your account.</p>
        </div>
        <div className="dark-glass p-7">
          {plans.length ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><label className="mb-2 block text-[10px] uppercase tracking-widest text-white/35">Plan type</label><select className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3" value={type} onChange={(event) => selectType(event.target.value)}>{types.map((item) => <option className="text-navy" key={item} value={item}>{item}</option>)}</select></div>
                <div><label className="mb-2 block text-[10px] uppercase tracking-widest text-white/35">Plan</label><select className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3" value={selected?.id || ""} onChange={(event) => selectPlan(event.target.value)}>{typePlans.map((item) => <option className="text-navy" key={item.id} value={item.id}>{item.displayLabel || item.planName}</option>)}</select></div>
                <div><label className="mb-2 block text-[10px] uppercase tracking-widest text-white/35">Capital</label><input className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3" type="number" min={selected?.minCapital || 0} max={selected?.maxCapital || undefined} value={capital} onChange={(event) => setCapital(Number(event.target.value))} /></div>
              </div>
              {selected?.description && <p className="mt-4 text-sm leading-6 text-white/50">{selected.description}</p>}
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-5">
                {[["Capital", money(capital)], ["Duration", `${selected?.durationValue} ${selected?.durationType}`], ["Projected return", money(projected)], ["Profit", money(profit)], ["ROI", `${roi.toFixed(1)}%`]].map(([label, value]) => <div key={label} className="bg-navy p-4"><p className="text-[9px] uppercase tracking-widest text-white/35">{label}</p><p className="mt-2 font-display text-lg font-bold text-gold">{value}</p></div>)}
              </div>
              <Link to={`/register?planType=${encodeURIComponent(type)}&capital=${encodeURIComponent(capital)}`} className="btn-primary mt-6 w-full">Start earning now <ArrowRight size={16} /></Link>
            </>
          ) : <p className="rounded-xl border border-white/10 bg-white/[.04] p-6 text-sm text-white/55">Calculator plans are being updated. Please check back shortly.</p>}
        </div>
      </div>
    </section>
  );
}

export function ManagedInvestmentPlans() {
  const [plans, setPlans] = useState([]);
  const [type, setType] = useState("crypto");

  useEffect(() => {
    dataService.listPublic("landingInvestmentPlans").then((items) => {
      setPlans(items.sort((a, b) => Number(a.displayOrder) - Number(b.displayOrder)));
    });
  }, []);

  const visible = plans.filter((item) => {
    const itemType = normalizedType(item.planType);
    return itemType === type || itemType === "both";
  });

  return (
    <section id="plans" className="bg-white px-5 py-28">
      <div className="mx-auto max-w-6xl">
        <p className="section-kicker">Investment plans</p>
        <h2 className="display-title mt-3 text-3xl text-navy sm:text-4xl md:text-5xl">Clarity at every horizon.</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">Select a weekly capital commitment and review the projected maturity value before you begin.</p>
        <div className="mt-8 flex gap-2">
          {["crypto", "stock"].map((item) => <button key={item} onClick={() => setType(item)} className={`rounded-full px-5 py-2 text-xs font-bold capitalize ${type === item ? "bg-navy text-white" : "bg-stone text-slate-500"}`}>{item}</button>)}
        </div>
        {visible.length ? (
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((plan) => (
              <article key={plan.id} className="glass-card relative flex flex-col p-4 sm:p-5">
                {plan.badgeLabel && <span className="mb-3 w-fit rounded-full bg-gold/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-gold">{plan.badgeLabel}</span>}
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Weekly Capital</p>
                <p className="font-display text-xl font-bold text-navy sm:text-2xl">{money(plan.weeklyCapital)}</p>
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <div><p className="text-[9px] uppercase tracking-wider text-slate-400">2 Months (8 Weeks)</p><p className="font-display font-semibold text-slate-700">{money(plan.twoMonthReturn)}</p></div>
                  <div><p className="text-[9px] uppercase tracking-wider text-slate-400">3 Months (13 Weeks)</p><p className="font-display font-semibold text-slate-700">{money(plan.threeMonthReturn)}</p></div>
                </div>
                {plan.description && <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{plan.description}</p>}
                <Link to={`/register?planType=${encodeURIComponent(type)}&weeklyCapital=${encodeURIComponent(plan.weeklyCapital)}`} className="btn-primary mt-auto pt-3">Select</Link>
              </article>
            ))}
          </div>
        ) : <p className="mt-8 rounded-xl bg-stone p-6 text-sm text-slate-500">No active {type} plans are currently published.</p>}
        <p className="mt-4 text-xs leading-5 text-slate-400">Illustrative plan values are subject to the applicable plan agreement and risk disclosures.</p>
      </div>
    </section>
  );
}
