import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowUpFromLine, BellRing, CheckCircle2, Clipboard, Clock3,
  Copy, DollarSign, History, Landmark, Link2, LockKeyhole, RefreshCw, TrendingUp, Upload, Users, WalletCards,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { uploadToCloudinary } from "../lib/cloudinary";
import { EmptyState, PageHeader, StatusBadge } from "../components/UI";
import { TradingViewChart } from "../components/TradingViewWidget";

const money = (value = 0) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const date = (value) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

export function UserDashboard() {
  const { user } = useAuth();
  const [symbol, setSymbol] = useState("BINANCE:BTCUSDT");
  const total = (user?.availableBalance || 0) + (user?.referralBalance || 0) + (user?.lockedBalance || 0);
  const cards = [
    ["Available balance", user?.availableBalance, WalletCards, "Ready to withdraw"],
    ["Referral balance", user?.referralBalance, Users, "Referral rewards"],
    ["Locked in plans", user?.lockedBalance, LockKeyhole, "Active capital"],
    ["Total portfolio", total, Landmark, "Combined value"],
  ];
  return (
    <div>
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/10 to-white p-5">
        <div className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-navy"><BellRing size={19} /></span><div><p className="font-display text-lg font-bold text-navy">Welcome to your private client portal</p><p className="mt-1 text-xs leading-5 text-slate-500">Phase 1 services are active. Explore your wallet, payments, and referral center.</p></div></div>
        <button className="hidden text-xs font-bold text-gold sm:block">Dismiss</button>
      </div>
      <PageHeader eyebrow="Portfolio overview" title={`Good day, ${user?.name?.split(" ")[0]}.`} description="A consolidated view of your Stonehaven relationship." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, note], index) => <div key={label} className={`glass-card p-5 ${index === 3 ? "bg-navy text-white" : ""}`}><div className="flex items-start justify-between"><div><p className={`text-[10px] font-bold uppercase tracking-[.16em] ${index === 3 ? "text-white/35" : "text-slate-400"}`}>{label}</p><p className={`display-title mt-3 text-3xl ${index === 3 ? "text-white" : "text-navy"}`}>{money(value)}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${index === 3 ? "bg-gold/15 text-gold" : "bg-gold/10 text-gold"}`}><Icon size={19} /></span></div><p className={`mt-5 text-[11px] ${index === 3 ? "text-white/35" : "text-slate-400"}`}>{note}</p></div>)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.55fr]">
        <div className="glass-card overflow-hidden p-3"><div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Market intelligence</p><p className="font-display text-xl font-bold text-navy">Live market chart</p></div><div className="flex gap-1 rounded-xl bg-stone p-1">{[["BINANCE:BTCUSDT", "BTC"], ["BINANCE:ETHUSDT", "ETH"], ["NASDAQ:AAPL", "AAPL"]].map(([value, label]) => <button key={value} onClick={() => setSymbol(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${symbol === value ? "bg-navy text-white" : "text-slate-400"}`}>{label}</button>)}</div></div><TradingViewChart symbol={symbol} /></div>
        <div className="glass-card p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Active investments</p><h2 className="display-title mt-1 text-2xl text-navy">Plan activity</h2></div><TrendingUp className="text-gold" /></div><div className="mt-8 rounded-xl border border-dashed border-slate-300 p-6 text-center"><Clock3 className="mx-auto text-slate-300" /><p className="mt-4 font-display text-lg font-bold text-navy">No active plans yet</p><p className="mt-2 text-xs leading-5 text-slate-400">Your Phase 2 investments and weekly progress will appear here.</p></div><div className="mt-5 rounded-xl bg-navy p-5 text-white"><p className="text-[10px] uppercase tracking-widest text-white/35">Portfolio readiness</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full bg-gold" /></div><p className="mt-3 text-xs text-white/50">Profile foundation complete</p></div></div>
      </div>
    </div>
  );
}

export function DepositPage() {
  const { user } = useAuth();
  const [methods, setMethods] = useState([]); const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState(""); const [hash, setHash] = useState(""); const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState("");
  const reference = useMemo(() => `SH-${user?.userId?.slice(-6).toUpperCase()}-GEN-W1`, [user]);
  useEffect(() => { dataService.list("depositMethods", user.adminId).then((items) => { const active = items.filter((item) => item.active); setMethods(active); setSelected(active[0] || null); }); }, [user.adminId]);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const proofUrl = await uploadToCloudinary(file);
      await dataService.create("deposits", { userId: user.userId, userName: user.name, adminId: user.adminId, methodId: selected.id, methodName: selected.name, amount: Number(amount), reference, transactionHash: hash, proofUrl, status: "pending" });
      await dataService.log({ userId: user.userId, adminId: user.adminId, type: "deposit_submitted", label: `Deposit submitted via ${selected.name}`, amount: Number(amount), status: "pending" });
      setDone(true);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  if (done) return <div><PageHeader eyebrow="Funding" title="Deposit submitted" /><div className="glass-card mx-auto max-w-xl p-10 text-center"><CheckCircle2 className="mx-auto text-forest" size={46} /><h2 className="display-title mt-5 text-3xl text-navy">Awaiting administrator review</h2><p className="mt-3 text-sm leading-6 text-slate-500">Your deposit reference <strong>{reference}</strong> is now in the approval queue.</p><button onClick={() => { setDone(false); setAmount(""); setHash(""); setFile(null); }} className="btn-primary mt-7">Submit another deposit</button></div></div>;
  return (
    <div><PageHeader eyebrow="Funding" title="Make a deposit" description="Choose an approved funding method and submit traceable payment evidence." />
      {!methods.length ? <EmptyState icon={Landmark} title="No funding methods available" text="Your account administrator has not activated a deposit method yet." /> :
      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-3">{methods.map((method) => <button key={method.id} onClick={() => setSelected(method)} className={`glass-card w-full p-5 text-left transition ${selected?.id === method.id ? "border-gold ring-4 ring-gold/10" : ""}`}><div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-navy text-gold">{method.iconUrl ? <img src={method.iconUrl} className="h-full w-full object-cover" /> : <Landmark size={20} />}</span><div><p className="font-bold text-navy">{method.name}</p><p className="mt-1 text-xs text-slate-400">{method.type} · {method.label}</p></div></div></button>)}</div>
        <form onSubmit={submit} className="glass-card p-6 md:p-8">
          {error && <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="rounded-xl bg-navy p-5 text-white"><p className="text-[10px] uppercase tracking-widest text-white/35">Send payment to</p><div className="mt-3 flex items-center justify-between gap-3"><code className="break-all text-sm text-gold">{selected?.details}</code><button type="button" onClick={() => navigator.clipboard.writeText(selected?.details)} className="shrink-0 rounded-lg bg-white/10 p-2"><Copy size={16} /></button></div><p className="mt-4 text-xs leading-5 text-white/45">{selected?.extraInfo}</p></div>
          <div className="mt-5"><label className="label">Deposit reference</label><div className="relative"><input className="field bg-slate-50 pr-12" readOnly value={reference} /><Clipboard className="absolute right-4 top-3.5 text-slate-400" size={18} /></div></div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2"><div><label className="label">Amount sent (USD)</label><input className="field" type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div><div><label className="label">Transaction hash / reference</label><input className="field" required value={hash} onChange={(e) => setHash(e.target.value)} /></div></div>
          <label className="mt-5 block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-gold"><Upload className="mx-auto text-gold" size={24} /><p className="mt-3 text-sm font-bold text-navy">{file ? file.name : "Upload payment proof"}</p><p className="mt-1 text-xs text-slate-400">PNG, JPG, or WEBP</p><input hidden type="file" accept="image/*" required onChange={(e) => setFile(e.target.files[0])} /></label>
          <button disabled={busy} className="btn-primary mt-6 w-full">{busy ? "Submitting securely..." : "Submit deposit for review"} <ArrowDownToLine size={17} /></button>
        </form>
      </div>}
    </div>
  );
}

export function WithdrawalPage() {
  const { user } = useAuth(); const [type, setType] = useState("investment"); const [amount, setAmount] = useState(""); const [method, setMethod] = useState("Bank transfer"); const [details, setDetails] = useState(""); const [done, setDone] = useState(false); const [error, setError] = useState("");
  const balance = type === "investment" ? user.availableBalance : user.referralBalance;
  async function submit(event) {
    event.preventDefault(); setError(""); const numeric = Number(amount);
    if (numeric > balance) return setError("The requested amount exceeds your available balance.");
    await dataService.create("withdrawals", { userId: user.userId, userName: user.name, adminId: user.adminId, type, amount: numeric, method, accountDetails: details, status: "pending" });
    await dataService.log({ userId: user.userId, adminId: user.adminId, type: "withdrawal_requested", label: `${type === "investment" ? "Investment" : "Referral"} withdrawal requested`, amount: numeric, status: "pending" });
    setDone(true);
  }
  return (
    <div><PageHeader eyebrow="Distributions" title="Request a withdrawal" description="Investment and referral earnings remain separate throughout review and settlement." />
      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div className="space-y-4">{[["investment", "Available balance", user.availableBalance, ArrowUpFromLine], ["referral", "Referral balance", user.referralBalance, Users]].map(([value, label, balanceValue, Icon]) => <button key={value} onClick={() => { setType(value); setDone(false); }} className={`glass-card w-full p-6 text-left ${type === value ? "border-gold ring-4 ring-gold/10" : ""}`}><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="display-title mt-2 text-3xl text-navy">{money(balanceValue)}</p></div><Icon className="text-gold" /></div></button>)}</div>
      <div className="glass-card p-6 md:p-8">{done ? <div className="py-12 text-center"><CheckCircle2 className="mx-auto text-forest" size={44} /><h2 className="display-title mt-5 text-3xl text-navy">Request received</h2><p className="mt-3 text-sm text-slate-500">Your funds remain in your balance until the request is approved.</p></div> : <form onSubmit={submit} className="space-y-5">{error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="rounded-xl bg-gold/10 p-4 text-xs leading-5 text-slate-600"><strong>Balance protection:</strong> Stonehaven deducts funds only after an administrator approves your request.</div><div><label className="label">Amount</label><input className="field" type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Up to ${money(balance)}`} /></div><div><label className="label">Payment method</label><select className="field" value={method} onChange={(e) => setMethod(e.target.value)}><option>Bank transfer</option><option>USDT (TRC20)</option><option>Bitcoin</option><option>Mobile money</option></select></div><div><label className="label">Account or wallet details</label><textarea className="field min-h-28 resize-none" required value={details} onChange={(e) => setDetails(e.target.value)} /></div><button className="btn-primary w-full">Submit withdrawal request <ArrowUpFromLine size={17} /></button></form>}</div></div>
    </div>
  );
}

export function ReferralsPage() {
  const { user } = useAuth(); const [users, setUsers] = useState([]); const [copied, setCopied] = useState(false);
  useEffect(() => { dataService.listUsers(user.adminId).then((items) => setUsers(items.filter((item) => item.referredBy === user.referralCode))); }, [user]);
  const link = `${window.location.origin}/register?ref=${user.referralCode}&admin=${user.adminId}`;
  function copy() { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div><PageHeader eyebrow="Introductions" title="Referral center" description="Invite people you trust and follow their account activation progress." />
      <div className="rounded-2xl bg-navy p-7 text-white shadow-heritage"><p className="text-xs font-bold uppercase tracking-widest text-white/35">Your private invitation link</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input readOnly className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm text-gold outline-none" value={link} /><button onClick={copy} className="btn-primary"><Copy size={16} /> {copied ? "Copied" : "Copy link"}</button></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">{[["Total referred", users.length, Users], ["Active referrals", users.filter((item) => item.status === "active").length, CheckCircle2], ["Referral earnings", money(user.referralBalance), DollarSign]].map(([label, value, Icon]) => <div key={label} className="glass-card p-6"><Icon className="text-gold" /><p className="display-title mt-5 text-3xl text-navy">{value}</p><p className="mt-1 text-xs uppercase tracking-widest text-slate-400">{label}</p></div>)}</div>
      <div className="glass-card mt-6 overflow-hidden"><div className="border-b border-slate-200 p-6"><h2 className="display-title text-2xl text-navy">Your introductions</h2></div>{users.length ? <div className="table-scroll overflow-x-auto"><table className="w-full min-w-[600px]"><thead><tr className="bg-stone text-left text-[10px] uppercase tracking-widest text-slate-400"><th className="px-6 py-4">Client</th><th>Status</th><th>Joined</th><th>Bonus status</th></tr></thead><tbody>{users.map((item) => <tr key={item.userId} className="border-t border-slate-100 text-sm"><td className="px-6 py-4 font-bold text-navy">{item.name}</td><td><StatusBadge status={item.status} /></td><td>{date(item.createdAt)}</td><td className="text-slate-400">Activates after Week 1 approval</td></tr>)}</tbody></table></div> : <div className="p-10 text-center text-sm text-slate-400">Share your invitation link to begin building your referral network.</div>}</div>
    </div>
  );
}

export function TransactionsPage() {
  const { user } = useAuth(); const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { dataService.listForUser("transactions", user.userId).then((result) => { setItems(result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))); setLoading(false); }); }, [user.userId]);
  return (
    <div><PageHeader eyebrow="Audit trail" title="Transaction history" description="A chronological record of every financial event on your account." action={<button onClick={() => window.location.reload()} className="btn-secondary bg-white text-navy"><RefreshCw size={15} /> Refresh</button>} />
      {loading ? <div className="glass-card grid h-56 place-items-center"><RefreshCw className="animate-spin text-gold" /></div> : items.length ? <div className="glass-card table-scroll overflow-x-auto"><table className="w-full min-w-[700px]"><thead><tr className="bg-navy text-left text-[10px] uppercase tracking-widest text-white/50"><th className="px-6 py-5">Event</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b border-slate-100 text-sm last:border-0"><td className="px-6 py-5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-gold/10 text-gold"><History size={16} /></span><div><p className="font-bold text-navy">{item.label}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{item.type.replaceAll("_", " ")}</p></div></div></td><td className="font-bold text-navy">{money(item.amount)}</td><td><StatusBadge status={item.status} /></td><td className="text-slate-500">{date(item.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={History} title="No transactions yet" text="Deposits, withdrawals, referral bonuses, and administrative adjustments will be recorded here." />}
    </div>
  );
}
