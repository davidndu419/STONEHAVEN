import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  ArrowDownToLine, ArrowUpFromLine, BellRing, CheckCircle2, Clipboard, Clock3,
  Copy, DollarSign, History, Landmark, Link2, LockKeyhole, RefreshCw, TrendingUp, Upload, Users, WalletCards,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { uploadToCloudinary } from "../lib/cloudinary";
import { EmptyState, PageHeader, StatusBadge } from "../components/UI";
import { TradingViewChart } from "../components/TradingViewWidget";
import { InvestmentCard } from "../components/InvestmentUI";
import { processInvestmentTimers } from "../lib/investmentEngine";
import { getPlatformSettings } from "../lib/enterprise";
import { requestWithdrawalIntent, submitDepositIntent } from "../lib/securityApi";
import { INVESTMENT_MODES, investmentModeLabel } from "../lib/investmentMode";
import { loadTransactionHistory } from "../lib/transactionHistory";
import { calculateTotalLockedBalance, calculateTotalPortfolio } from "../lib/lockedBalance";
import { useCurrency, CURRENCIES } from "../lib/currency";
const date = (value) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
const dateTime = (value) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
}).format(new Date(value));

export function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { format: money } = useCurrency();
  const { activeAssetMode } = useOutletContext();
  const [symbol, setSymbol] = useState(activeAssetMode === "stocks" ? "NASDAQ:AAPL" : "BINANCE:BTCUSDT");
  const [investments, setInvestments] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => { 
    processInvestmentTimers(user.userId)
      .then((items) => 
        setInvestments(items.filter((item) => !["completed", "deleted", "cancelled", "flash done"].includes(item.status)))
      )
      .catch((err) => {
        console.error("Error processing investment timers:", err);
        setError("Unable to load active investments due to missing permissions.");
      }); 
  }, [user.userId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { 
    Promise.all([
      dataService.list("announcements", user.adminId), 
      dataService.list("announcements", "GLOBAL")
    ])
      .then((groups) => 
        setAnnouncement(groups.flat().filter((item) => item.status === "published").sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0] || null)
      )
      .catch((err) => {
        console.error("Failed to load announcements:", err);
      }); 
  }, [user.adminId]);

  useEffect(() => { 
    setSymbol(activeAssetMode === "stocks" ? "NASDAQ:AAPL" : "BINANCE:BTCUSDT"); 
  }, [activeAssetMode]);

  const visibleInvestments = investments.filter((item) => item.type === (activeAssetMode === "stocks" ? "stock" : "crypto")).slice(0, 2);
  
  const marketSymbols = activeAssetMode === "stocks"
    ? [["NASDAQ:AAPL", "AAPL"], ["NASDAQ:NVDA", "NVDA"], ["NASDAQ:MSFT", "MSFT"]]
    : [["BINANCE:BTCUSDT", "BTC"], ["BINANCE:ETHUSDT", "ETH"], ["BINANCE:SOLUSDT", "SOL"]];
  
  const lockedBalance = calculateTotalLockedBalance(investments, now);
  const total = calculateTotalPortfolio(user || {}, investments, now);
  
  const cards = [
    ["Available balance", user?.availableBalance, WalletCards, "Ready to withdraw"],
    ["Referral balance", user?.referralBalance, Users, "Referral rewards"],
    ["Locked in plans", lockedBalance, LockKeyhole, "Live accrued earnings"],
    ["Total portfolio", total, Landmark, "Combined value"],
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {announcement && (
        <div className="flex items-center justify-between rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/10 to-white p-5">
          <div className="flex gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-navy">
              <BellRing size={19} />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-navy">{announcement.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{announcement.message}</p>
            </div>
          </div>
          <button onClick={() => setAnnouncement(null)} className="hidden text-xs font-bold text-gold sm:block">
            Dismiss
          </button>
        </div>
      )}

      {/* Greeting and KYC Badge aligned to save space */}
      <PageHeader 
        eyebrow="Portfolio overview" 
        title={`Good day, ${user?.name?.split(" ")[0]}.`} 
        description="A consolidated view of your Stonehaven relationship." 
        action={
          <button 
            onClick={() => navigate("/dashboard/kyc")} 
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold capitalize transition-all hover:scale-105 ${
              user.kycStatus === "verified" ? "bg-emerald-100 text-emerald-800" : 
              user.kycStatus === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${
              user.kycStatus === "verified" ? "bg-emerald-500" : 
              user.kycStatus === "pending" ? "bg-amber-500" : "bg-red-500"
            }`} />
            KYC: {user.kycStatus}
          </button>
        }
      />

      {/* Premium Hero Wallet Card */}
      <div className="relative overflow-hidden rounded-[20px] border border-gold/25 bg-gradient-to-br from-[#0F172A] via-[#1A253C] to-[#0F172A] p-6 md:p-8 shadow-heritage backdrop-blur-xl transition-all duration-300 hover:border-gold/40">
        {/* Subtle decorative grid/blurs */}
        <div className="hero-grid absolute inset-0 opacity-[0.03] pointer-events-none" />
        <div className="absolute top-0 left-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Greeting & Microcopy */}
          <div className="space-y-2 lg:max-w-[300px]">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold/80">Command Center</span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
              Portfolio Command Center
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Manage your capital, pending investments, and available earnings from one place.
            </p>
          </div>

          {/* Middle: 2-Column Balance Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 flex-1 lg:px-8 border-t border-white/5 pt-6 lg:pt-0 lg:border-t-0 lg:border-x lg:border-white/5">
            {cards.map(([label, value, Icon, note]) => (
              <div key={label} className="group relative">
                <div className="flex items-center gap-1.5">
                  <Icon size={12} className="text-gold/60 group-hover:text-gold transition-colors duration-200" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 group-hover:text-slate-300 transition-colors duration-200">
                    {label}
                  </p>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl md:text-2xl font-bold tracking-tight text-white font-display">
                    {money(value)}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 font-medium">
                  {note}
                </p>
              </div>
            ))}
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[160px] border-t border-white/5 pt-6 lg:pt-0 lg:border-t-0">
            <button
              onClick={() => navigate("/dashboard/deposit")}
              className="btn-primary w-full text-center py-3 px-5 justify-center flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <ArrowDownToLine size={16} />
              <span>Deposit</span>
            </button>
            <button
              onClick={() => navigate("/dashboard/withdraw")}
              className="btn-secondary w-full text-center py-3 px-5 justify-center flex items-center gap-2 text-white border-white/10 hover:border-gold hover:bg-gold/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <ArrowUpFromLine size={16} />
              <span>Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid for Live Chart and Investments */}
      <div className="grid gap-6 xl:grid-cols-[1.45fr_.55fr]">
        <div className="glass-card overflow-hidden p-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {activeAssetMode === "stocks" ? "Equity intelligence" : "Digital asset intelligence"}
              </p>
              <p className="font-display text-xl font-bold text-navy">
                Live {activeAssetMode === "stocks" ? "stock" : "crypto"} chart
              </p>
            </div>
            <div className="flex gap-1 rounded-xl bg-stone p-1">
              {marketSymbols.map(([value, label]) => (
                <button 
                  key={value} 
                  onClick={() => setSymbol(value)} 
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                    symbol === value ? "bg-navy text-white" : "text-slate-400 hover:text-navy"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <TradingViewChart symbol={symbol} />
        </div>

        <div className="space-y-4">
          {visibleInvestments.length ? (
            visibleInvestments.map((investment) => (
              <InvestmentCard 
                key={investment.id} 
                investment={investment} 
                onDeposit={(item) => navigate(`/dashboard/deposit?investment=${item.id}&week=${(item.completedWeeks || 0) + 1}&amount=${item.capital || item.weeklyCapital}&asset=${item.ticker}`)} 
                onDetails={() => navigate("/dashboard/portfolio")} 
              />
            ))
          ) : (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Active {activeAssetMode === "stocks" ? "stock" : "crypto"} investments
                  </p>
                  <h2 className="display-title mt-1 text-2xl text-navy">Plan activity</h2>
                </div>
                <TrendingUp className="text-gold" />
              </div>
              <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-6 text-center">
                <Clock3 className="mx-auto text-slate-300" />
                <p className="mt-4 font-display text-lg font-bold text-navy">
                  No active {activeAssetMode === "stocks" ? "stock" : "crypto"} plans
                </p>
                <button 
                  onClick={() => navigate(activeAssetMode === "stocks" ? "/dashboard/stock-investment" : "/dashboard/crypto-investment")} 
                  className="btn-primary mt-5"
                >
                  Explore plans
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DepositPage() {
  const { user } = useAuth();
  const [methods, setMethods] = useState([]); const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState(""); const [hash, setHash] = useState(""); const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState("");
  const reference = useMemo(() => `SH-${user?.userId?.slice(-6).toUpperCase()}-WALLET-${Date.now().toString().slice(-6)}`, [user]);
  useEffect(() => { dataService.list("depositMethods", user.adminId).then((items) => { const active = items.filter((item) => item.active); setMethods(active); setSelected(active[0] || null); }); }, [user.adminId]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const proofUrl = file ? await uploadToCloudinary(file) : "";
      const localRecord = {
        userId: user.userId,
        userName: user.name,
        adminId: user.adminId,
        methodId: selected.id,
        methodName: selected.name,
        amount: Number(amount),
        reference,
        transactionHash: hash,
        proofUrl,
        status: "pending",
        depositType: "general",
      };
      const transaction = {
        userId: user.userId,
        adminId: user.adminId,
        type: "deposit_submitted",
        label: `Wallet deposit submitted via ${selected.name}`,
        amount: Number(amount),
        status: "pending"
      };
      await submitDepositIntent({
        methodId: selected.id,
        amount: Number(amount),
        reference,
        transactionHash: hash,
        proofUrl,
        label: transaction.label,
        localRecord,
        transaction
      });
      setDone(true);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  if (done) return <div><PageHeader eyebrow="Wallet funding" title="Deposit submitted" /><div className="glass-card mx-auto max-w-xl p-10 text-center"><CheckCircle2 className="mx-auto text-forest" size={46} /><h2 className="display-title mt-5 text-3xl text-navy">Awaiting administrator review</h2><p className="mt-3 text-sm leading-6 text-slate-500">After approval, this deposit will be credited to your available balance. Reference: <strong>{reference}</strong>.</p><button onClick={() => { setDone(false); setAmount(""); setHash(""); setFile(null); }} className="btn-primary mt-7">Deposit more funds</button></div></div>;
  return (
    <div><PageHeader eyebrow="Wallet funding" title="Deposit Funds" description="Add money to your wallet. This deposit is not tied to an investment plan." />
      {!methods.length ? <EmptyState icon={Landmark} title="No funding methods available" text="Your account administrator has not activated a deposit method yet." /> :
      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-3">{methods.map((method) => <button key={method.id} onClick={() => setSelected(method)} className={`glass-card w-full p-5 text-left transition ${selected?.id === method.id ? "border-gold ring-4 ring-gold/10" : ""}`}><div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-navy text-gold">{method.iconUrl ? <img src={method.iconUrl} className="h-full w-full object-cover" /> : <Landmark size={20} />}</span><div><p className="font-bold text-navy">{method.name}</p><p className="mt-1 text-xs text-slate-400">{method.type} · {method.label}</p></div></div></button>)}</div>
        <form onSubmit={submit} className="glass-card p-6 md:p-8">
          {error && <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="rounded-xl bg-navy p-5 text-white"><p className="text-[10px] uppercase tracking-widest text-white/35">Send payment to</p><div className="mt-3 flex items-center justify-between gap-3"><code className="break-all text-sm text-gold">{selected?.details}</code><button type="button" onClick={() => navigator.clipboard.writeText(selected?.details)} className="shrink-0 rounded-lg bg-white/10 p-2"><Copy size={16} /></button></div><p className="mt-4 text-xs leading-5 text-white/45">{selected?.extraInfo}</p></div>
          <div className="mt-5"><label className="label">Deposit reference</label><div className="relative"><input className="field bg-slate-50 pr-12" readOnly value={reference} /><Clipboard className="absolute right-4 top-3.5 text-slate-400" size={18} /></div></div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2"><div><label className="label">Amount sent (USD)</label><input className="field" type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div><div><label className="label">Transaction hash / reference</label><input className="field" required value={hash} onChange={(e) => setHash(e.target.value)} /></div></div>
          <label className="mt-5 block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-gold"><Upload className="mx-auto text-gold" size={24} /><p className="mt-3 text-sm font-bold text-navy">{file ? file.name : "Upload payment proof (Optional)"}</p><p className="mt-1 text-xs text-slate-400">PNG, JPG, or WEBP</p><input hidden type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} /></label>
          <button disabled={busy} className="btn-primary mt-6 w-full">{busy ? "Submitting securely..." : "Submit Wallet Deposit"} <ArrowDownToLine size={17} /></button>
        </form>
      </div>}
    </div>
  );
}

export function WithdrawalPage() {
  const { user } = useAuth(); const navigate = useNavigate(); const { format: money } = useCurrency(); const [amount, setAmount] = useState(""); const [method, setMethod] = useState("Bank transfer"); const [details, setDetails] = useState(""); const [done, setDone] = useState(false); const [error, setError] = useState(""); const [settings, setSettings] = useState(null);
  useEffect(() => { getPlatformSettings().then(setSettings); }, []);
  const balance = user.availableBalance;
  async function submit(event) {
    event.preventDefault(); setError(""); const numeric = Number(amount);
    if (user.freezeWithdrawal) return setError(user.withdrawalFreezeMessage || "Withdrawals are temporarily unavailable. Please contact support.");
    if (numeric > balance) return setError("The requested amount exceeds your available balance.");
    if (settings?.kycRequired && settings?.withdrawalLimitEnabled && user.kycStatus !== "verified" && numeric > Number(settings.unverifiedWithdrawalLimit || 500)) return setError(`Complete KYC to withdraw above ${money(settings.unverifiedWithdrawalLimit || 500)}.`);
    const localRecord = { userId: user.userId, userName: user.name, adminId: user.adminId, type: "investment", amount: numeric, method, accountDetails: details, status: "pending" };
    const transaction = { userId: user.userId, adminId: user.adminId, type: "withdrawal_requested", label: "Available balance withdrawal requested", amount: numeric, status: "pending" };
    await requestWithdrawalIntent({ type: "investment", amount: numeric, method, accountDetails: details, localRecord, transaction });
    setDone(true);
  }
  return (
    <div><PageHeader eyebrow="Wallet distributions" title="Withdraw Funds" description="Request a withdrawal from your available wallet balance only." />
      {user.freezeWithdrawal && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><strong>Withdrawals are temporarily paused.</strong><p className="mt-2 leading-6">{user.withdrawalFreezeMessage || "Please contact support for assistance."}</p><button onClick={() => navigate("/dashboard/support")} className="btn-primary mt-4">Contact Support</button></div>}
      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div className="glass-card h-fit p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Available balance</p><p className="display-title mt-2 text-3xl text-navy">{money(user.availableBalance)}</p></div><ArrowUpFromLine className="text-gold" /></div><p className="mt-4 text-xs leading-5 text-slate-500">Referral earnings and locked investment capital are excluded from this withdrawal flow.</p></div>
      <div className="glass-card p-6 md:p-8">{done ? <div className="py-12 text-center"><CheckCircle2 className="mx-auto text-forest" size={44} /><h2 className="display-title mt-5 text-3xl text-navy">Request received</h2><p className="mt-3 text-sm text-slate-500">Your funds remain in your balance until the request is approved.</p></div> : user.freezeWithdrawal ? <div className="grid min-h-72 place-items-center text-center"><div><LockKeyhole className="mx-auto text-red-400" size={42} /><h2 className="display-title mt-4 text-2xl text-navy">Withdrawal form locked</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{user.withdrawalFreezeMessage}</p></div></div> : <form onSubmit={submit} className="space-y-5">{error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}<button type="button" onClick={() => navigate("/dashboard/kyc")} className="mt-2 block font-bold underline">Complete KYC now</button></div>}<div className="rounded-xl bg-gold/10 p-4 text-xs leading-5 text-slate-600"><strong>Balance protection:</strong> Stonehaven deducts funds only after an administrator approves your request.{settings?.withdrawalLimitEnabled && user.kycStatus !== "verified" && ` Unverified limit: ${money(settings.unverifiedWithdrawalLimit || 500)}.`}</div><div><label className="label">Amount</label><input className="field" type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Up to ${money(balance)}`} /></div><div><label className="label">Payment method</label><select className="field" value={method} onChange={(e) => setMethod(e.target.value)}><option>Bank transfer</option><option>USDT (TRC20)</option><option>Bitcoin</option><option>Mobile money</option></select></div><div><label className="label">Account or wallet details</label><textarea className="field min-h-28 resize-none" required value={details} onChange={(e) => setDetails(e.target.value)} /></div><button className="btn-primary w-full">Submit withdrawal request <ArrowUpFromLine size={17} /></button></form>}</div></div>
    </div>
  );
}

export function ReferralsPage() {
  const { user } = useAuth(); const navigate = useNavigate(); const { format: money } = useCurrency(); const [users, setUsers] = useState([]); const [transactions, setTransactions] = useState([]); const [copied, setCopied] = useState(false);
  useEffect(() => {
    Promise.all([dataService.listUsers(user.adminId), dataService.listForUser("transactions", user.userId)])
      .then(([items, transactionItems]) => {
        setUsers(items.filter((item) => item.referredBy === user.referralCode));
        setTransactions(transactionItems.filter((item) =>
          item.visibility !== "admin_only"
          && (item.type?.startsWith("referral_") || (item.type === "withdrawal" && item.withdrawalType === "referral"))
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      });
  }, [user]);
  const link = `${window.location.origin}/register?ref=${user.referralCode}&admin=${user.adminId}`;
  function copy() { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <div><PageHeader eyebrow="Referral earnings" title="Referral Earnings" description="Referral rewards remain separate from wallet funds and investment capital." action={<button onClick={() => navigate("/dashboard/referral-withdrawal")} className="btn-primary"><ArrowUpFromLine size={16} /> Withdraw Referral Earnings</button>} />
      <div className="rounded-2xl bg-navy p-7 text-white shadow-heritage"><p className="text-xs font-bold uppercase tracking-widest text-white/35">Your private invitation link</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input readOnly className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm text-gold outline-none" value={link} /><button onClick={copy} className="btn-primary"><Copy size={16} /> {copied ? "Copied" : "Copy link"}</button></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">{[["Total referred", users.length, Users], ["Active referrals", users.filter((item) => item.status === "active").length, CheckCircle2], ["Available referral balance", money(user.referralBalance), DollarSign]].map(([label, value, Icon]) => <div key={label} className="glass-card p-6"><Icon className="text-gold" /><p className="display-title mt-5 text-3xl text-navy">{value}</p><p className="mt-1 text-xs uppercase tracking-widest text-slate-400">{label}</p></div>)}</div>
      <div className="glass-card mt-6 overflow-hidden"><div className="border-b border-slate-200 p-6"><h2 className="display-title text-2xl text-navy">Referral transactions</h2></div>{transactions.length ? <div className="divide-y divide-slate-100">{transactions.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 p-5"><div><p className="text-sm font-bold text-navy">{item.label}</p><p className="mt-1 text-xs text-slate-400">{dateTime(item.createdAt)}</p></div><div className="text-right"><p className="font-bold text-navy">{money(item.amount)}</p><StatusBadge status={item.status} /></div></div>)}</div> : <p className="p-8 text-center text-sm text-slate-400">Referral earnings and withdrawals will appear here.</p>}</div>
      <div className="glass-card mt-6 overflow-hidden"><div className="border-b border-slate-200 p-6"><h2 className="display-title text-2xl text-navy">Your introductions</h2></div>{users.length ? <div className="table-scroll overflow-x-auto"><table className="w-full min-w-[600px]"><thead><tr className="bg-stone text-left text-[10px] uppercase tracking-widest text-slate-400"><th className="px-6 py-4">Client</th><th>Status</th><th>Joined</th><th>Bonus status</th></tr></thead><tbody>{users.map((item) => <tr key={item.userId} className="border-t border-slate-100 text-sm"><td className="px-6 py-4 font-bold text-navy">{item.name}</td><td><StatusBadge status={item.status} /></td><td>{date(item.createdAt)}</td><td className="text-slate-400">Activates after Week 1 approval</td></tr>)}</tbody></table></div> : <div className="p-10 text-center text-sm text-slate-400">Share your invitation link to begin building your referral network.</div>}</div>
    </div>
  );
}

export function ReferralWithdrawalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { format: money } = useCurrency();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const numeric = Number(amount);
    setError("");
    if (user.freezeWithdrawal) return setError(user.withdrawalFreezeMessage || "Withdrawals are temporarily unavailable. Please contact support.");
    if (!Number.isFinite(numeric) || numeric <= 0) return setError("Enter a valid withdrawal amount.");
    if (numeric > Number(user.referralBalance || 0)) return setError("The requested amount exceeds your referral balance.");
    setBusy(true);
    try {
      const localRecord = { userId: user.userId, userName: user.name, adminId: user.adminId, type: "referral", amount: numeric, method, accountDetails: details, status: "pending" };
      const transaction = { userId: user.userId, adminId: user.adminId, type: "referral_withdrawal", label: "Referral withdrawal requested", amount: numeric, status: "pending" };
      await requestWithdrawalIntent({ type: "referral", amount: numeric, method, accountDetails: details, localRecord, transaction });
      setDone(true);
    } catch (withdrawalError) {
      setError(withdrawalError.message);
    } finally {
      setBusy(false);
    }
  }

  return <div><PageHeader eyebrow="Referral earnings" title="Withdraw Referral Earnings" description="This request can use only your available referral balance." />{user.freezeWithdrawal && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><strong>Withdrawals are temporarily paused.</strong><p className="mt-2 leading-6">{user.withdrawalFreezeMessage}</p><button onClick={() => navigate("/dashboard/support")} className="btn-primary mt-4">Contact Support</button></div>}<div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div className="glass-card h-fit p-6"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Referral balance</p><p className="display-title mt-2 text-4xl text-navy">{money(user.referralBalance)}</p><p className="mt-4 text-xs leading-5 text-slate-500">Available balance, locked capital, and investment returns are excluded.</p></div><div className="glass-card p-6 md:p-8">{done ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto text-forest" size={46} /><h2 className="display-title mt-5 text-3xl text-navy">Referral Withdrawal Submitted</h2><p className="mt-3 text-sm text-slate-500">Your referral balance will be deducted only after approval.</p></div> : user.freezeWithdrawal ? <div className="grid min-h-72 place-items-center text-center"><div><LockKeyhole className="mx-auto text-red-400" size={42} /><h2 className="display-title mt-4 text-2xl text-navy">Withdrawal form locked</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{user.withdrawalFreezeMessage}</p></div></div> : <form onSubmit={submit} className="space-y-5">{error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div><label className="label">Withdrawable amount</label><input className="field bg-slate-50" readOnly value={money(user.referralBalance)} /></div><div><label className="label">Withdrawal amount</label><input className="field" type="number" min="1" max={user.referralBalance} required value={amount} onChange={(event) => setAmount(event.target.value)} /></div><div><label className="label">Withdrawal method</label><select className="field" value={method} onChange={(event) => setMethod(event.target.value)}><option>Bank transfer</option><option>USDT (TRC20)</option><option>Bitcoin</option><option>Mobile money</option></select></div><div><label className="label">Account or wallet details</label><textarea className="field min-h-28 resize-none" required value={details} onChange={(event) => setDetails(event.target.value)} /></div><button disabled={busy} className="btn-primary w-full">{busy ? "Submitting..." : "Submit Referral Withdrawal"} <ArrowUpFromLine size={17} /></button></form>}</div></div></div>;
}

export function TransactionsPage() {
  const { user } = useAuth(); const { format: money } = useCurrency(); const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadTransactionHistory(user.userId).then((result) => {
      setItems(result);
      setLoading(false);
    });
  }, [user.userId]);
  return (
    <div><PageHeader eyebrow="Audit trail" title="Transaction history" description="A chronological record of every financial event on your account." action={<button onClick={() => window.location.reload()} className="btn-secondary bg-white text-navy"><RefreshCw size={15} /> Refresh</button>} />
      {loading ? <div className="glass-card grid h-56 place-items-center"><RefreshCw className="animate-spin text-gold" /></div> : items.length ? <div className="glass-card table-scroll overflow-x-auto"><table className="w-full min-w-[700px]"><thead><tr className="bg-navy text-left text-[10px] uppercase tracking-widest text-white/50"><th className="px-6 py-5">Event</th><th>Amount</th><th>Status</th><th>Date & time</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b border-slate-100 text-sm last:border-0"><td className="px-6 py-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold"><History size={16} /></span><div><p className="font-bold text-navy">{item.label}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{item.type.replaceAll("_", " ")}</p>{item.reason && <p className="mt-2 text-xs leading-5 text-red-600">Reason: {item.reason}</p>}</div></div></td><td className="font-bold text-navy">{money(item.amount)}</td><td><StatusBadge status={item.status} /></td><td className="whitespace-nowrap text-slate-500">{dateTime(item.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={History} title="No transactions yet" text="Deposits, withdrawals, referral bonuses, and administrative adjustments will be recorded here." />}
    </div>
  );
}

export function SettingsPage() {
  const { user, refresh } = useAuth();
  const { activeInvestmentMode, setActiveInvestmentMode } = useOutletContext();
  const [currency, setCurrency] = useState(user?.currency || "USD");

  async function saveCurrency(c) {
    setCurrency(c);
    await dataService.updateUser(user.userId, { currency: c });
    await refresh();
  }

  return <div><PageHeader eyebrow="Preferences" title="Dashboard settings" description="Choose the investment ecosystem shown across your dashboard, portfolio, and earnings." /><div className="glass-card max-w-3xl p-6 md:p-7 space-y-8">
    <div>
      <p className="label">Default investment mode</p>
      <div className="grid gap-3 sm:grid-cols-3">{INVESTMENT_MODES.map((mode) => <button key={mode.value} onClick={() => setActiveInvestmentMode(mode.value)} className={`min-h-28 rounded-xl border p-5 text-left ${activeInvestmentMode === mode.value ? "border-gold bg-gold/10 ring-4 ring-gold/10" : "border-slate-200"}`}><p className="font-bold text-navy">{mode.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{mode.value === "crypto" ? "Digital assets and structured crypto plans" : mode.value === "stock" ? "Global equities and stock investments" : "Short-horizon fixed-maturity plans"}</p></button>)}</div>
      <p className="mt-6 text-xs text-slate-400">{investmentModeLabel(activeInvestmentMode)} is saved as the investment preference for {user.email}.</p>
    </div>
    <div className="border-t border-slate-200 pt-8">
      <p className="label">Currency Preference</p>
      <p className="mt-1 mb-4 text-xs leading-5 text-slate-500">Choose how your balances are displayed across the platform.</p>
      <select className="field max-w-xs" value={currency} onChange={(e) => saveCurrency(e.target.value)}>
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
        ))}
      </select>
    </div>
  </div></div>;
}
