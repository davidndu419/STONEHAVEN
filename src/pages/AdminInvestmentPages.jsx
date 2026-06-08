import { useCallback, useEffect, useState } from "react";
import { Edit3, Plus, RefreshCw, Snowflake, Trash2, TrendingUp, Upload } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { uploadToCloudinary } from "../lib/cloudinary";
import { EmptyState, Modal, PageHeader, StatusBadge } from "../components/UI";
import { money, Timeline } from "../components/InvestmentUI";
import { approveInvestmentDeposit, reconcileInvestmentTimers } from "../lib/investmentEngine";
import { calculateLiveLockedBalance, snapshotInvestmentProgress } from "../lib/lockedBalance";
import { createNotification } from "../lib/enterprise";

const defaultTiers = [
  [200, 87000, 88000], [300, 87000, 108000], [400, 107000, 128000], [500, 127000, 148000],
  [600, 147000, 168000], [700, 167000, 188000], [800, 187000, 208000], [1000, 227000, 248000],
].map(([weeklyCapital, return2Months, return3Months]) => ({ weeklyCapital, return2Months, return3Months, active: true }));

function useScoped(name) {
  const { user } = useAuth(); const [items, setItems] = useState([]);
  const load = useCallback(async () => {
    let result = await dataService.list(name, user.adminId, user.role === "superadmin");
    if (name === "investments") {
      await reconcileInvestmentTimers(result);
      result = await dataService.list(name, user.adminId, user.role === "superadmin");
    }
    setItems(result);
  }, [name, user.adminId, user.role]);
  useEffect(() => { load(); }, [load]);
  return { items, load, user };
}

export function FlashAdminPage() {
  const { items: settingsItems, load: loadSettings, user } = useScoped("flashSettings"); const { items: tiers, load: loadTiers } = useScoped("flashTiers");
  const settings = settingsItems[0]; const [name, setName] = useState(""); const [hours, setHours] = useState(24); const [tier, setTier] = useState({ capital: "", returnAmount: "" });
  useEffect(() => { if (settings) { setName(settings.name); setHours(settings.durationHours); } }, [settings]);
  async function saveSettings() { if (settings) await dataService.update("flashSettings", settings.id, { name, durationHours: Number(hours) }); else await dataService.create("flashSettings", { adminId: user.adminId === "GLOBAL" ? "HERITAGE-HQ" : user.adminId, name, durationHours: Number(hours), active: true }); loadSettings(); }
  async function addTier(event) { event.preventDefault(); await dataService.create("flashTiers", { adminId: user.adminId === "GLOBAL" ? "HERITAGE-HQ" : user.adminId, capital: Number(tier.capital), returnAmount: Number(tier.returnAmount), active: true }); setTier({ capital: "", returnAmount: "" }); loadTiers(); }
  async function updateTier(item, changes) { await dataService.update("flashTiers", item.id, changes); loadTiers(); }
  return <div><PageHeader eyebrow="Flash configuration" title="Flash investment settings" description="Changes apply only to new plans. Existing investments retain their original snapshots." /><div className="grid gap-6 xl:grid-cols-[.7fr_1.3fr]"><div className="glass-card p-6"><h2 className="display-title text-2xl text-navy">Program settings</h2><div className="mt-5 space-y-4"><div><label className="label">Plan name</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></div><div><label className="label">Duration in hours</label><input className="field" type="number" min="1" value={hours} onChange={(e) => setHours(e.target.value)} /></div><label className="flex items-center justify-between rounded-xl bg-stone p-4 text-sm font-bold text-navy">Flash investment active<input type="checkbox" checked={settings?.active ?? true} onChange={async () => { if (settings) { await dataService.update("flashSettings", settings.id, { active: !settings.active }); loadSettings(); } }} className="h-5 w-5 accent-[#C8A55A]" /></label><button onClick={saveSettings} className="btn-primary w-full">Save settings</button></div></div><div className="glass-card overflow-hidden"><div className="border-b border-slate-200 p-6"><h2 className="display-title text-2xl text-navy">Flash tiers</h2></div><div className="table-scroll overflow-x-auto"><table className="w-full min-w-[600px]"><thead><tr className="bg-navy text-left text-[10px] uppercase tracking-widest text-white/45"><th className="px-6 py-4">Capital</th><th>Return</th><th>Status</th><th /></tr></thead><tbody>{tiers.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="px-6 py-4"><input className="field max-w-32" type="number" defaultValue={item.capital} onBlur={(e) => updateTier(item, { capital: Number(e.target.value) })} /></td><td><input className="field max-w-32" type="number" defaultValue={item.returnAmount} onBlur={(e) => updateTier(item, { returnAmount: Number(e.target.value) })} /></td><td><button onClick={() => updateTier(item, { active: !item.active })}><StatusBadge status={item.active ? "active" : "suspended"} /></button></td><td className="pr-5 text-right"><button onClick={async () => { await dataService.remove("flashTiers", item.id); loadTiers(); }} className="rounded-lg bg-red-50 p-2 text-red-600"><Trash2 size={15} /></button></td></tr>)}</tbody></table></div><form onSubmit={addTier} className="grid gap-3 border-t border-slate-200 p-5 sm:grid-cols-[1fr_1fr_auto]"><input className="field" type="number" required placeholder="Capital" value={tier.capital} onChange={(e) => setTier({ ...tier, capital: e.target.value })} /><input className="field" type="number" required placeholder="Return" value={tier.returnAmount} onChange={(e) => setTier({ ...tier, returnAmount: e.target.value })} /><button className="btn-primary"><Plus size={16} /> Add tier</button></form></div></div></div>;
}

function TierEditor({ tiers, onChange }) {
  function update(index, field, value) { onChange(tiers.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: field === "active" ? value : Number(value) } : item)); }
  return <div className="table-scroll overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[620px]"><thead><tr className="bg-stone text-left text-[9px] uppercase tracking-widest text-slate-400"><th className="px-3 py-3">Weekly</th><th>2-month return</th><th>3-month return</th><th>Active</th></tr></thead><tbody>{tiers.map((tier, index) => <tr key={index} className="border-t border-slate-100"><td className="p-2"><input className="field" type="number" value={tier.weeklyCapital} onChange={(e) => update(index, "weeklyCapital", e.target.value)} /></td><td className="p-2"><input className="field" type="number" value={tier.return2Months} onChange={(e) => update(index, "return2Months", e.target.value)} /></td><td className="p-2"><input className="field" type="number" value={tier.return3Months} onChange={(e) => update(index, "return3Months", e.target.value)} /></td><td className="p-2 text-center"><input type="checkbox" checked={tier.active} onChange={(e) => update(index, "active", e.target.checked)} className="accent-[#C8A55A]" /></td></tr>)}</tbody></table><button type="button" onClick={() => onChange([...tiers, { weeklyCapital: 200, return2Months: 0, return3Months: 0, active: true }])} className="m-3 text-xs font-bold text-gold">+ Add plan tier</button></div>;
}

function AssetLibraryPage({ kind }) {
  const collection = kind === "crypto" ? "coins" : "stocks"; const { items, load, user } = useScoped(collection); const [open, setOpen] = useState(false); const [editing, setEditing] = useState(null); const [busy, setBusy] = useState(false);
  const empty = { name: "", ticker: "", tradingViewSymbol: "", sector: "", active: true, logoUrl: "", file: null, marketCap: "", weekHigh: "", weekLow: "", peRatio: "", about: "", whyInvest: "", historicalReturns: "", referencePrice: "", tiers: defaultTiers };
  const [form, setForm] = useState(empty);
  function start(item = null) { setEditing(item); setForm(item ? { ...item, file: null, tiers: item.tiers || defaultTiers } : { ...empty, tiers: defaultTiers.map((tier) => ({ ...tier })) }); setOpen(true); }
  async function save(event) { event.preventDefault(); setBusy(true); const logoUrl = form.file ? await uploadToCloudinary(form.file) : form.logoUrl; const targetAdminId = editing?.adminId || (user.adminId === "GLOBAL" ? "HERITAGE-HQ" : user.adminId); let payload; if (kind === "crypto") { payload = { adminId: targetAdminId, name: form.name, ticker: form.ticker.toUpperCase(), tradingViewSymbol: form.tradingViewSymbol, active: form.active, logoUrl, tiers: form.tiers }; } else { payload = { adminId: targetAdminId, name: form.name, ticker: form.ticker.toUpperCase(), tradingViewSymbol: form.tradingViewSymbol, sector: form.sector || "", active: form.active, logoUrl, marketCap: form.marketCap || "", weekHigh: form.weekHigh || "", weekLow: form.weekLow || "", peRatio: form.peRatio || "", about: form.about || "", whyInvest: form.whyInvest || "", historicalReturns: form.historicalReturns || "", referencePrice: Number(form.referencePrice || 0), tiers: form.tiers }; } if (editing) await dataService.update(collection, editing.id, payload); else await dataService.create(collection, payload); setBusy(false); setOpen(false); load(); }
  async function toggle(item) { if (kind === "stock" && !item.active && items.filter((stock) => stock.active).length >= 10) return window.alert("A maximum of 10 stocks can be active."); await dataService.update(collection, item.id, { active: !item.active }); load(); }
  return <div><PageHeader eyebrow={`${kind} library`} title={kind === "crypto" ? "Coin management" : "Stock management"} description={`Manage ${kind} research, availability, and weekly investment tiers for your own users.`} action={<button onClick={() => start()} className="btn-primary"><Plus size={16} /> Add {kind === "crypto" ? "coin" : "stock"}</button>} /><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <div key={item.id} className="glass-card p-6"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-navy font-display text-lg font-bold text-gold">{item.logoUrl ? <img src={item.logoUrl} className="h-full w-full object-cover" /> : item.ticker[0]}</span><button onClick={() => toggle(item)}><StatusBadge status={item.active ? "active" : "suspended"} /></button></div><h2 className="display-title mt-5 text-2xl text-navy">{item.name}</h2><p className="text-xs text-slate-400">{item.ticker}{item.sector ? ` · ${item.sector}` : ""}</p><p className="mt-4 text-xs text-slate-500">{item.tiers?.filter((tier) => tier.active).length || 0} active plan tiers</p><div className="mt-5 flex gap-2"><button onClick={() => start(item)} className="btn-secondary flex-1 bg-white text-navy"><Edit3 size={15} /> Edit</button><button onClick={async () => { if (window.confirm(`Delete ${item.name}?`)) { await dataService.remove(collection, item.id); load(); } }} className="rounded-xl bg-red-50 p-3 text-red-600"><Trash2 size={16} /></button></div></div>)}</div><Modal open={open} onClose={() => setOpen(false)} title={`${editing ? "Edit" : "Add"} ${kind === "crypto" ? "coin" : "stock"}`}><form onSubmit={save} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Name</label><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div><label className="label">Ticker</label><input className="field" required value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} /></div></div><div><label className="label">TradingView symbol</label><input className="field" required value={form.tradingViewSymbol} onChange={(e) => setForm({ ...form, tradingViewSymbol: e.target.value })} placeholder={kind === "crypto" ? "BINANCE:BTCUSDT" : "NASDAQ:AAPL"} /></div>{kind === "stock" && <><div className="grid gap-3 sm:grid-cols-2"><input className="field" placeholder="Sector" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} /><input className="field" type="number" placeholder="Reference price" value={form.referencePrice} onChange={(e) => setForm({ ...form, referencePrice: e.target.value })} /><input className="field" placeholder="Market cap" value={form.marketCap} onChange={(e) => setForm({ ...form, marketCap: e.target.value })} /><input className="field" placeholder="P/E ratio" value={form.peRatio} onChange={(e) => setForm({ ...form, peRatio: e.target.value })} /><input className="field" placeholder="52-week high" value={form.weekHigh} onChange={(e) => setForm({ ...form, weekHigh: e.target.value })} /><input className="field" placeholder="52-week low" value={form.weekLow} onChange={(e) => setForm({ ...form, weekLow: e.target.value })} /></div><textarea className="field" placeholder="About company" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} /><textarea className="field" placeholder="Why invest" value={form.whyInvest} onChange={(e) => setForm({ ...form, whyInvest: e.target.value })} /><textarea className="field" placeholder="Historical returns" value={form.historicalReturns} onChange={(e) => setForm({ ...form, historicalReturns: e.target.value })} /></>}<label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-4 text-center"><Upload className="mx-auto text-gold" /><span className="mt-2 block text-xs font-bold">{form.file?.name || "Upload logo"}</span><input hidden type="file" accept="image/*" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} /></label><div><label className="label">Investment tiers</label><TierEditor tiers={form.tiers} onChange={(tiers) => setForm({ ...form, tiers })} /></div><button disabled={busy} className="btn-primary w-full">{busy ? "Saving..." : `Save ${kind}`}</button></form></Modal></div>;
}

export const CoinLibraryPage = () => <AssetLibraryPage kind="crypto" />;
export const StockLibraryPage = () => <AssetLibraryPage kind="stock" />;

export function InvestmentLibraryPage() {
  const [active, setActive] = useState("flash");
  return <div>
    <PageHeader eyebrow="Investment configuration" title="Investment Library" description="Manage flash settings, crypto assets, and stock assets from one place." />
    <div className="mb-6 grid gap-2 rounded-2xl bg-white p-2 shadow-sm sm:inline-grid sm:min-w-[520px] sm:grid-cols-3">
      <button onClick={() => setActive("flash")} className={`rounded-xl px-4 py-3 text-sm font-bold ${active === "flash" ? "bg-navy text-white" : "text-slate-500"}`}>Flash settings</button>
      <button onClick={() => setActive("coins")} className={`rounded-xl px-4 py-3 text-sm font-bold ${active === "coins" ? "bg-navy text-white" : "text-slate-500"}`}>Coin library</button>
      <button onClick={() => setActive("stocks")} className={`rounded-xl px-4 py-3 text-sm font-bold ${active === "stocks" ? "bg-navy text-white" : "text-slate-500"}`}>Stock library</button>
    </div>
    {active === "flash" && <FlashAdminPage />}
    {active === "coins" && <CoinLibraryPage />}
    {active === "stocks" && <StockLibraryPage />}
  </div>;
}

export function AdminInvestmentsPage() {
  const { items, load } = useScoped("investments"); const [detail, setDetail] = useState(null);
  async function updateStatus(investment, status, reason = "") {
    if (status === "active" && investment.type === "flash") status = "flash active";
    const now = Date.now();
    const changes = { status, statusReason: reason, updatedAt: new Date(now).toISOString() };
    if (status === "frozen" && ["active", "flash active"].includes(investment.status)) {
      Object.assign(changes, snapshotInvestmentProgress(investment, now), {
        pausedAt: new Date(now).toISOString(),
        lastActivatedAt: null,
      });
    }
    if (["active", "flash active"].includes(status) && investment.status === "frozen") {
      const metrics = calculateLiveLockedBalance(investment, now);
      const pausedSeconds = Math.max(0, (now - new Date(investment.pausedAt || now).getTime()) / 1000);
      Object.assign(changes, {
        activeElapsedSeconds: metrics.activeElapsedSeconds,
        lockedEarned: metrics.lockedEarned,
        lastActivatedAt: new Date(now).toISOString(),
        lastLockedCalculationAt: new Date(now).toISOString(),
        totalPausedSeconds: Number(investment.totalPausedSeconds || 0) + pausedSeconds,
        maturityAt: investment.maturityAt
          ? new Date(new Date(investment.maturityAt).getTime() + pausedSeconds * 1000).toISOString()
          : null,
        pausedAt: null,
      });
    }
    await dataService.update("investments", investment.id, changes);
    await dataService.log({ userId: investment.userId, adminId: investment.adminId, type: `investment_${status.replace(" ", "_")}`, label: `${investment.planName} ${status}`, amount: 0, status });
    await createNotification({ userId: investment.userId, adminId: investment.adminId, type: "investment", title: `Investment ${status}`, message: reason || `${investment.planName} is now ${status}.` });
    load();
  }
  async function forceComplete(investment) { const user = await dataService.getUser(investment.userId); await dataService.updateUser(user.userId, { availableBalance: Number(user.availableBalance || 0) + Number(investment.projectedReturn) }); await dataService.update("investments", investment.id, { status: investment.type === "flash" ? "flash done" : "completed", completedAt: new Date().toISOString(), lockedEarned: 0, lastActivatedAt: null, nextDueAt: null }); await dataService.log({ userId: investment.userId, adminId: investment.adminId, type: "investment_matured", label: `${investment.planName} force completed`, amount: investment.projectedReturn, status: "completed" }); load(); }
  async function markWeek(investment) { const week = investment.completedWeeks + 1; if (week > investment.totalWeeks) return; await approveInvestmentDeposit({ id: `manual-${Date.now()}`, investmentId: investment.id, adminId: investment.adminId, userId: investment.userId, amount: investment.weeklyCapital, week, createdAt: new Date().toISOString() }); load(); }
  return <div><PageHeader eyebrow="Plan operations" title="Investment controls" description="Manage plans within your admin scope. Super-admin views automatically span every scope." action={<button onClick={load} className="btn-secondary bg-white text-navy"><RefreshCw size={15} /> Refresh</button>} />{items.length ? <div className="space-y-4">{items.map((item) => <div key={item.id} className="glass-card p-6"><div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center"><div><div className="flex items-center gap-3"><StatusBadge status={item.status} /><span className="text-[10px] uppercase tracking-widest text-slate-400">{item.type}</span></div><h2 className="display-title mt-3 text-2xl text-navy">{item.planName}</h2><p className="mt-1 text-xs text-slate-400">{item.userName} · {item.ticker} · {item.completedWeeks || 0}/{item.totalWeeks} weeks · {money(item.projectedReturn)}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setDetail(item)} className="btn-secondary bg-white text-navy">Timeline</button>{item.status === "frozen" ? <button onClick={() => updateStatus(item, "active")} className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">Unfreeze</button> : <button onClick={() => updateStatus(item, "frozen")} className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700"><Snowflake className="mr-1 inline" size={14} /> Freeze</button>}<button onClick={() => { const reason = window.prompt("Deletion reason"); if (reason) updateStatus(item, "deleted", reason); }} className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700">Delete</button><button onClick={() => { const value = window.prompt("New projected return", item.projectedReturn); if (value) { dataService.update("investments", item.id, { projectedReturn: Number(value) }).then(load); } }} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">Edit return</button><button onClick={() => { const days = Number(window.prompt("Extend by days", "7")); if (days) { const maturity = new Date(new Date(item.maturityAt || Date.now()).getTime() + days * 86400000).toISOString(); dataService.update("investments", item.id, { maturityAt: maturity, pausedDays: Number(item.pausedDays || 0) + days }).then(load); } }} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">Extend</button>{item.type !== "flash" && item.completedWeeks < item.totalWeeks && <button onClick={() => markWeek(item)} className="rounded-xl bg-gold/15 px-4 py-2 text-xs font-bold text-navy">Mark week paid</button>}{!["completed", "flash done"].includes(item.status) && <button onClick={() => forceComplete(item)} className="btn-primary">Force complete</button>}</div></div></div>)}</div> : <EmptyState icon={TrendingUp} title="No investment plans" text="New client plans will appear here after they select an investment tier." />}<Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.planName || "Timeline"}>{detail && <Timeline investment={detail} />}</Modal></div>;
}
