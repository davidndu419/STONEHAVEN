import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BarChart3, Check, ChevronDown, Globe2, Landmark, LockKeyhole,
  Menu, Quote, ShieldCheck, Sparkles, TrendingUp, X, Zap,
} from "lucide-react";
import { Brand } from "../components/UI";
import { TradingViewTicker } from "../components/TradingViewWidget";
import { LiveActivityFeed, TestimonialToast } from "../components/LandingEnterprise";
import { dataService } from "../lib/dataService";

const plans = [
  [200, 87000, 88000], [300, 87000, 108000], [400, 107000, 128000], [500, 127000, 148000],
  [600, 147000, 168000], [700, 167000, 188000], [800, 187000, 208000], [1000, 227000, 248000],
];

const testimonials = [
  ["Amelia R.", "United Kingdom", "Stonehaven brings the clarity and discipline I expected from a private wealth firm."],
  ["Daniel K.", "Canada", "The reporting is excellent. I always understand the position of my portfolio."],
  ["Nora A.", "United Arab Emirates", "A refined platform with attentive service and a genuinely global outlook."],
];

const defaultFaqs = [
  ["What investment products are available?", "Stonehaven provides flash, cryptocurrency, and stock investment products, each presented with its own terms and portfolio reporting."],
  ["How are deposits reviewed?", "Deposits are submitted with a transaction reference and payment proof, then reviewed by your assigned account administrator."],
  ["Can I use the platform internationally?", "Yes. Stonehaven is designed for a global membership, subject to local eligibility and compliance requirements."],
  ["When can I request a withdrawal?", "Available investment earnings and referral earnings have separate balances and can be requested independently from your dashboard."],
];

function SectionTitle({ kicker, title, text, center = false }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="section-kicker">{kicker}</p>
      <h2 className="display-title mt-3 text-4xl text-navy md:text-5xl">{title}</h2>
      {text && <p className="mt-4 text-sm leading-7 text-slate-500 md:text-base">{text}</p>}
    </div>
  );
}

function PublicCalculator() {
  const [type, setType] = useState("crypto"); const [capital, setCapital] = useState(200); const [duration, setDuration] = useState(3);
  const weekly = plans.find((item) => item[0] === Number(capital)) || plans[0];
  const flashPlans = [[50, 80], [100, 150], [200, 300], [300, 450], [500, 700], [1000, 1300]];
  const flash = flashPlans.find((item) => item[0] === Number(capital)) || flashPlans[0];
  const weeks = duration === 2 ? 8 : 13;
  const total = type === "flash" ? flash[0] : weekly[0] * weeks;
  const projected = type === "flash" ? flash[1] : duration === 2 ? weekly[1] : weekly[2];
  const profit = projected - total;
  const options = type === "flash" ? flashPlans.map((item) => item[0]) : plans.map((item) => item[0]);
  return <section className="bg-navy px-5 py-28 text-white"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.75fr_1.25fr]"><SectionTitle kicker="Investment calculator" title="Model your plan before you begin." text="Calculator values follow the current Stonehaven plan schedule. Final terms are snapshotted when a plan is created." /><div className="dark-glass p-7"><div className="grid gap-4 sm:grid-cols-3"><div><label className="mb-2 block text-[10px] uppercase tracking-widest text-white/35">Plan type</label><select className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3" value={type} onChange={(e) => { setType(e.target.value); setCapital(e.target.value === "flash" ? 50 : 200); }}><option className="text-navy" value="flash">Flash</option><option className="text-navy" value="crypto">Crypto</option><option className="text-navy" value="stock">Stock</option></select></div><div><label className="mb-2 block text-[10px] uppercase tracking-widest text-white/35">{type === "flash" ? "Capital" : "Weekly capital"}</label><select className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3" value={capital} onChange={(e) => setCapital(Number(e.target.value))}>{options.map((value) => <option className="text-navy" key={value} value={value}>${value.toLocaleString()}</option>)}</select></div><div><label className="mb-2 block text-[10px] uppercase tracking-widest text-white/35">Duration</label><select disabled={type === "flash"} className="w-full rounded-xl border border-white/10 bg-white/[.07] px-4 py-3 disabled:opacity-50" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{type === "flash" ? <option className="text-navy">24 hours</option> : <><option className="text-navy" value={2}>2 months</option><option className="text-navy" value={3}>3 months</option></>}</select></div></div><div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-4">{[["Total capital", total], ["Projected return", projected], ["Net profit", profit], ["ROI", `${((profit / total) * 100).toFixed(1)}%`]].map(([label, value]) => <div key={label} className="bg-navy p-4"><p className="text-[9px] uppercase tracking-widest text-white/35">{label}</p><p className="mt-2 font-display text-xl font-bold text-gold">{typeof value === "number" ? `$${value.toLocaleString()}` : value}</p></div>)}</div><Link to="/register" className="btn-primary mt-6 w-full">Start earning now <ArrowRight size={16} /></Link></div></div></section>;
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [testimonial, setTestimonial] = useState(0);
  const [faq, setFaq] = useState(0);
  const [faqItems, setFaqItems] = useState(defaultFaqs.map(([question, answer], index) => ({ id: `default-${index}`, question, answer, order: index, visible: true })));

  useEffect(() => {
    const timer = setInterval(() => setTestimonial((value) => (value + 1) % testimonials.length), 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { dataService.list("faqs", "GLOBAL", true).then((items) => { const visible = items.filter((item) => item.visible).sort((a, b) => a.order - b.order); if (visible.length) setFaqItems(visible); }); }, []);

  return (
    <div className="overflow-hidden bg-stone">
      <div className="fixed inset-x-0 top-0 z-50">
        <TradingViewTicker />
        <nav className="border-b border-white/10 bg-navy/90 px-5 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between">
            <Brand light />
            <div className="hidden items-center gap-8 text-sm text-white/65 lg:flex">
              <a href="#plans" className="hover:text-gold">Plans</a><a href="#how" className="hover:text-gold">How it works</a>
              <a href="#about" className="hover:text-gold">About</a><a href="#faq" className="hover:text-gold">FAQ</a>
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              <Link to="/login" className="btn-secondary text-white">Login</Link>
              <Link to="/register" className="btn-primary">Get started <ArrowRight size={16} /></Link>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-white lg:hidden">{menuOpen ? <X /> : <Menu />}</button>
          </div>
          {menuOpen && <div className="border-t border-white/10 py-5 text-white lg:hidden"><div className="flex flex-col gap-4"><a href="#plans">Plans</a><a href="#how">How it works</a><a href="#faq">FAQ</a><Link to="/login">Login</Link><Link to="/register" className="text-gold">Create account</Link></div></div>}
        </nav>
      </div>

      <section className="heritage-noise hero-grid relative flex min-h-[880px] items-center bg-navy px-5 pb-24 pt-44 text-white">
        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1.1fr_.9fr]">
          <div className="fade-up">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-xs font-semibold tracking-wide text-gold">
              <Sparkles size={14} /> Modern stewardship. Enduring value.
            </div>
            <h1 className="display-title max-w-4xl text-5xl leading-[.96] md:text-7xl lg:text-[82px]">Wealth built with <span className="text-gold">purpose.</span> Managed for generations.</h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-white/60 md:text-lg">A distinguished dual investment platform bringing institutional discipline to digital assets and global equities.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="btn-primary px-7 py-4">Begin your journey <ArrowRight size={17} /></Link>
              <a href="#plans" className="btn-secondary px-7 py-4">Explore investment plans</a>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-xs text-white/45">
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-gold" /> Secure client portal</span>
              <span className="flex items-center gap-2"><Globe2 size={16} className="text-gold" /> Global access</span>
              <span className="flex items-center gap-2"><Landmark size={16} className="text-gold" /> Private banking standard</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-10 rounded-full bg-gold/10 blur-3xl" />
            <div className="dark-glass relative overflow-hidden p-7">
              <div className="flex items-start justify-between border-b border-white/10 pb-6">
                <div><p className="text-xs uppercase tracking-[.2em] text-white/35">Global portfolio index</p><p className="mt-2 font-display text-4xl font-bold">$636,640</p></div>
                <span className="rounded-full bg-forest/30 px-3 py-1.5 text-xs text-emerald-300">+18.4%</span>
              </div>
              <div className="relative mt-8 h-52">
                <svg viewBox="0 0 500 200" className="h-full w-full overflow-visible">
                  <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C8A55A" stopOpacity=".35" /><stop offset="100%" stopColor="#C8A55A" stopOpacity="0" /></linearGradient></defs>
                  <path d="M0 170 C45 160, 55 120, 95 135 S160 160, 190 105 S245 145, 285 86 S340 110, 375 60 S430 75, 500 15 L500 200 L0 200Z" fill="url(#chartFill)" />
                  <path d="M0 170 C45 160, 55 120, 95 135 S160 160, 190 105 S245 145, 285 86 S340 110, 375 60 S430 75, 500 15" fill="none" stroke="#C8A55A" strokeWidth="3" />
                </svg>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[["Digital assets", "42%"], ["Global equity", "38%"], ["Private reserve", "20%"]].map(([label, value]) => <div key={label} className="rounded-xl bg-white/[.05] p-3"><p className="text-[9px] uppercase tracking-wider text-white/35">{label}</p><p className="mt-2 font-display text-xl font-bold text-gold">{value}</p></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-12 max-w-7xl px-5">
        <div className="glass-card grid divide-y divide-slate-200 p-3 md:grid-cols-4 md:divide-x md:divide-y-0">
          {[["$2.4B+", "Capital returned"], ["48,000+", "Global investors"], ["120+", "Countries served"], ["98.7%", "Client satisfaction"]].map(([value, label]) => <div key={label} className="px-6 py-7 text-center"><p className="display-title text-3xl text-navy">{value}</p><p className="mt-1 text-xs uppercase tracking-[.14em] text-slate-400">{label}</p></div>)}
        </div>
      </section>

      <section id="about" className="px-5 py-28">
        <div className="mx-auto max-w-7xl">
          <SectionTitle kicker="One institution, two markets" title="A considered approach to modern opportunity." text="Access curated digital asset and global equity strategies through one refined client experience." center />
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {[["Digital Asset Desk", "Navigate established crypto markets with structured plans, transparent milestones, and institutional-grade charting.", "BTC · ETH · SOL", TrendingUp], ["Global Equity Desk", "Build exposure to leading public companies through focused plans and research-led portfolio views.", "AAPL · NVDA · MSFT", BarChart3]].map(([title, text, assets, Icon], index) => (
              <div key={title} className={`group relative overflow-hidden rounded-2xl p-8 text-white shadow-heritage md:p-11 ${index ? "bg-charcoal" : "bg-navy"}`}>
                <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-gold/10 blur-3xl" />
                <Icon size={34} strokeWidth={1.4} className="text-gold" />
                <h3 className="display-title mt-12 text-3xl">{title}</h3><p className="mt-4 max-w-md text-sm leading-7 text-white/55">{text}</p>
                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6"><span className="text-xs tracking-widest text-gold">{assets}</span><Link to="/register" className="grid h-10 w-10 place-items-center rounded-full border border-white/20 transition group-hover:bg-gold group-hover:text-navy"><ArrowRight size={17} /></Link></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="bg-white px-5 py-28">
        <div className="mx-auto max-w-6xl">
          <SectionTitle kicker="Investment plans" title="Clarity at every horizon." text="Select a weekly capital commitment and review the projected maturity value before you begin." />
          <div className="glass-card table-scroll mt-12 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="bg-navy text-white"><tr><th className="px-7 py-5 text-xs uppercase tracking-widest">Weekly capital</th><th className="px-7 py-5 text-xs uppercase tracking-widest">After 2 months</th><th className="px-7 py-5 text-xs uppercase tracking-widest">After 3 months</th><th className="px-7 py-5" /></tr></thead>
              <tbody>{plans.map(([capital, two, three]) => <tr key={capital} className="border-b border-slate-100 last:border-0 hover:bg-gold/[.04]"><td className="px-7 py-5 font-bold text-navy">${capital.toLocaleString()}</td><td className="px-7 py-5 text-slate-600">${two.toLocaleString()}</td><td className="px-7 py-5 text-slate-600">${three.toLocaleString()}</td><td className="px-7 py-5 text-right"><Link to="/register" className="text-xs font-bold text-gold">Select plan →</Link></td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-400">Illustrative plan values are subject to the applicable plan agreement and risk disclosures.</p>
        </div>
      </section>

      <section id="how" className="px-5 py-28">
        <div className="mx-auto max-w-7xl">
          <SectionTitle kicker="The client journey" title="Designed to feel effortless." center />
          <div className="mt-14 grid gap-5 md:grid-cols-4">
            {[["01", "Create your account", "Join through our secure registration and establish your client profile."], ["02", "Choose your market", "Explore digital assets or global equities and select a suitable plan."], ["03", "Fund your plan", "Submit each deposit with a traceable reference and payment proof."], ["04", "Track your progress", "Follow approvals, portfolio milestones, and maturity from one dashboard."]].map(([number, title, text]) => <div key={number} className="glass-card p-7"><span className="font-display text-4xl font-bold text-gold/50">{number}</span><h3 className="mt-7 font-display text-xl font-bold text-navy">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{text}</p></div>)}
          </div>
        </div>
      </section>

      <PublicCalculator />

      <section className="bg-navy px-5 py-28 text-white">
        <div className="mx-auto max-w-7xl">
          <SectionTitle kicker="The Stonehaven standard" title="Confidence is built into every detail." />
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {[[LockKeyhole, "Secure by design"], [BarChart3, "Real-time market charts"], [Globe2, "Global client access"], [Zap, "Responsive approvals"], [ShieldCheck, "Role-based controls"], [Landmark, "Institutional reporting"]].map(([Icon, label]) => <div key={label} className="flex items-center gap-4 bg-navy p-7"><span className="grid h-11 w-11 place-items-center rounded-xl bg-gold/10 text-gold"><Icon size={20} /></span><span className="font-display text-lg font-bold">{label}</span></div>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-28">
        <div className="mx-auto max-w-4xl text-center">
          <Quote className="mx-auto text-gold" size={38} strokeWidth={1.3} />
          <blockquote className="display-title mt-8 text-3xl leading-tight text-navy md:text-5xl">“{testimonials[testimonial][2]}”</blockquote>
          <p className="mt-7 text-sm font-bold text-navy">{testimonials[testimonial][0]}</p><p className="mt-1 text-xs uppercase tracking-widest text-slate-400">{testimonials[testimonial][1]}</p>
          <div className="mt-8 flex justify-center gap-2">{testimonials.map((_, index) => <button aria-label={`Testimonial ${index + 1}`} key={index} onClick={() => setTestimonial(index)} className={`h-1.5 rounded-full transition-all ${testimonial === index ? "w-8 bg-gold" : "w-2 bg-slate-300"}`} />)}</div>
        </div>
      </section>

      <LiveActivityFeed />

      <section id="faq" className="bg-white px-5 py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <SectionTitle kicker="Frequently asked" title="The essentials, made clear." text="Our client service team remains available for questions specific to your account." />
          <div>{faqItems.map((item, index) => <div key={item.id || item.question} className="border-b border-slate-200"><button onClick={() => setFaq(faq === index ? -1 : index)} className="flex w-full items-center justify-between py-5 text-left font-display text-xl font-bold text-navy">{item.question}<ChevronDown className={`shrink-0 text-gold transition ${faq === index ? "rotate-180" : ""}`} /></button>{faq === index && <p className="pb-6 pr-10 text-sm leading-7 text-slate-500">{item.answer}</p>}</div>)}</div>
        </div>
      </section>

      <section className="px-5 py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-navy px-7 py-16 text-center text-white md:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,165,90,.24),transparent_35%)]" />
          <div className="relative"><p className="section-kicker">Your next chapter</p><h2 className="display-title mx-auto mt-4 max-w-3xl text-4xl md:text-6xl">Build wealth that outlives the moment.</h2><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/55">Join a global community investing with purpose, discipline, and a long-term view.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/register" className="btn-primary">Create your account <ArrowRight size={16} /></Link><Link to="/login" className="btn-secondary">Client login</Link></div></div>
        </div>
      </section>

      <footer className="bg-[#090f1c] px-5 py-14 text-white/50">
        <div className="mx-auto max-w-7xl"><div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-2"><div><Brand light /><p className="mt-5 max-w-sm text-sm leading-6">Building wealth for generations through considered strategy and modern technology.</p></div><div className="flex flex-wrap gap-10 md:justify-end"><a href="#plans">Plans</a><a href="#faq">FAQ</a><Link to="/company">Company</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></div></div><div className="mt-8 flex flex-col justify-between gap-5 text-[11px] leading-5 md:flex-row"><p>© 2026 Stonehaven Investment Group. All rights reserved.</p><p className="max-w-3xl md:text-right">Risk disclosure: All investment activity involves risk, including possible loss of capital. Projected values are illustrative and do not constitute a guarantee or financial advice.</p></div></div>
      </footer>
      <TestimonialToast />
    </div>
  );
}
