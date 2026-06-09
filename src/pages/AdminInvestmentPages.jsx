import { useCallback, useEffect, useState } from "react";
import { Edit3, Plus, RefreshCw, Trash2, TrendingUp, Upload } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { uploadToCloudinary } from "../lib/cloudinary";
import { EmptyState, Modal, PageHeader, StatusBadge } from "../components/UI";
import { money, Timeline } from "../components/InvestmentUI";
import { reconcileInvestmentTimers } from "../lib/investmentEngine";
import { DepositMethodsPage } from "./AdminPages";

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
    <PageHeader eyebrow="Investment configuration" title="Investment Library" description="Manage flash settings, crypto assets, stock assets, and funding methods from one place." />
    <div className="mb-6 grid gap-2 rounded-2xl bg-white p-2 shadow-sm sm:inline-grid sm:min-w-[680px] sm:grid-cols-4">
      <button onClick={() => setActive("flash")} className={`rounded-xl px-4 py-3 text-sm font-bold ${active === "flash" ? "bg-navy text-white" : "text-slate-500"}`}>Flash settings</button>
      <button onClick={() => setActive("coins")} className={`rounded-xl px-4 py-3 text-sm font-bold ${active === "coins" ? "bg-navy text-white" : "text-slate-500"}`}>Coin library</button>
      <button onClick={() => setActive("stocks")} className={`rounded-xl px-4 py-3 text-sm font-bold ${active === "stocks" ? "bg-navy text-white" : "text-slate-500"}`}>Stock library</button>
      <button onClick={() => setActive("methods")} className={`rounded-xl px-4 py-3 text-sm font-bold ${active === "methods" ? "bg-navy text-white" : "text-slate-500"}`}>Deposit methods</button>
    </div>
    {active === "flash" && <FlashAdminPage />}
    {active === "coins" && <CoinLibraryPage />}
    {active === "stocks" && <StockLibraryPage />}
    {active === "methods" && <DepositMethodsPage embedded />}
  </div>;
}

import { approveInvestmentFunding, declineInvestmentFunding } from "../lib/approvalWorkflow";

function ActionModal({ action, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(action?.defaultAmount ?? "");
  const [extraWeeks, setExtraWeeks] = useState("");
  const [busy, setBusy] = useState(false);

  if (!action) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({
        reason: reason.trim(),
        amount: Number(amount),
        extraWeeks: Number(extraWeeks),
      });
      onClose();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open title={action.title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm leading-6 text-slate-500">{action.description}</p>
        
        {action.showAmount && (
          <div>
            <label className="label">{action.amountLabel || "Amount"}</label>
            <input
              className="field"
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        )}

        {action.showExtraWeeks && (
          <div>
            <label className="label">Extra Weeks</label>
            <input
              className="field"
              type="number"
              min="1"
              step="1"
              required
              value={extraWeeks}
              onChange={(e) => setExtraWeeks(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>
        )}

        <div>
          <label className="label">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            className="field min-h-28"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Record the operational reason for this action."
          />
        </div>

        <button
          disabled={busy || !reason.trim()}
          className="btn-primary w-full"
        >
          {busy ? "Saving..." : action.confirmLabel || "Confirm"}
        </button>
      </form>
    </Modal>
  );
}

export function AdminInvestmentsPage() {
  const { items, load, user: actor } = useScoped("investments");
  const [detail, setDetail] = useState(null);
  const [actionModal, setActionModal] = useState(null);

  const openActionModal = (config) => setActionModal(config);

  const getStatusOrder = (status) => {
    if (status === "pending") return 1;
    if (status === "awaiting_funding") return 2;
    if (["active", "flash active", "paused", "frozen"].includes(status)) return 3;
    if (["completed", "flash done"].includes(status)) return 4;
    if (["deleted", "cancelled"].includes(status)) return 5;
    return 6;
  };

  const sortedItems = [...items].sort((a, b) => {
    const orderA = getStatusOrder(a.status);
    const orderB = getStatusOrder(b.status);
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  async function handleApprove(item) {
    if (!window.confirm(`Approve funding for ${item.planName}?`)) return;
    try {
      await approveInvestmentFunding({ investmentId: item.id, actor });
      load();
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function handleActionSubmit({ reason, amount, extraWeeks }) {
    const { kind, item } = actionModal;
    const nowStr = new Date().toISOString();

    try {
      if (kind === "delete" || kind === "delete-active") {
        await dataService.update("investments", item.id, {
          status: "deleted",
          lockedEarned: 0,
          lastActivatedAt: null,
          nextDueAt: null,
          updatedAt: nowStr,
        });

        await dataService.log({
          userId: item.userId,
          adminId: item.adminId,
          type: "investment_deleted",
          label: `${item.planName} deleted/cancelled`,
          amount: 0,
          status: "deleted",
          reason: reason,
          adminActorId: actor.userId,
          adminActorName: actor.name,
          targetId: item.id,
          visibility: "admin_only",
        });
      }

      if (kind === "decline") {
        await declineInvestmentFunding({ investmentId: item.id, reason, actor });
      }

      if (kind === "edit-return") {
        const previousReturn = Number(item.projectedReturn || 0);
        await dataService.update("investments", item.id, {
          projectedReturn: amount,
          previousProjectedReturn: previousReturn,
          updatedAt: nowStr,
        });

        await dataService.log({
          userId: item.userId,
          adminId: item.adminId,
          type: "investment_return_edited",
          label: `${item.planName} projected return edited from ${previousReturn} to ${amount}`,
          amount: amount,
          status: "completed",
          reason: reason,
          adminActorId: actor.userId,
          adminActorName: actor.name,
          targetId: item.id,
          visibility: "admin_only",
        });
      }

      if (kind === "extend") {
        const newTotalWeeks = Number(item.totalWeeks || 0) + extraWeeks;
        const currentMaturity = new Date(item.maturityAt || Date.now());
        const newMaturity = new Date(currentMaturity.getTime() + extraWeeks * 7 * 86400000).toISOString();

        await dataService.update("investments", item.id, {
          totalWeeks: newTotalWeeks,
          maturityAt: newMaturity,
          updatedAt: nowStr,
        });

        await dataService.log({
          userId: item.userId,
          adminId: item.adminId,
          type: "investment_extended",
          label: `${item.planName} extended by ${extraWeeks} weeks`,
          amount: 0,
          status: "completed",
          reason: reason,
          adminActorId: actor.userId,
          adminActorName: actor.name,
          targetId: item.id,
          visibility: "admin_only",
        });
      }

      if (kind === "force-complete") {
        const user = await dataService.getUser(item.userId);
        const returnAmount = Number(item.projectedReturn || 0);

        await dataService.updateUser(user.userId, {
          availableBalance: Number(user.availableBalance || 0) + returnAmount,
        });

        await dataService.update("investments", item.id, {
          status: item.type === "flash" ? "flash done" : "completed",
          completedAt: nowStr,
          completedBy: actor.userId,
          lockedEarned: 0,
          lastActivatedAt: null,
          nextDueAt: null,
          updatedAt: nowStr,
        });

        await dataService.log({
          userId: item.userId,
          adminId: item.adminId,
          type: "investment_completed",
          label: "Investment Completed",
          amount: returnAmount,
          status: "completed",
          visibility: "user",
          createdAt: nowStr,
        });

        await dataService.log({
          userId: item.userId,
          adminId: item.adminId,
          type: "investment_force_completed",
          label: `${item.planName} force completed`,
          amount: returnAmount,
          status: "completed",
          reason: reason,
          adminActorId: actor.userId,
          adminActorName: actor.name,
          targetId: item.id,
          visibility: "admin_only",
          createdAt: nowStr,
        });
      }

      load();
    } catch (err) {
      window.alert(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Plan operations"
        title="Investment controls"
        description="Manage plans within your admin scope. Super-admin views automatically span every scope."
        action={
          <button onClick={load} className="btn-secondary bg-white text-navy">
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      {sortedItems.length ? (
        <div className="space-y-4">
          {sortedItems.map((item) => {
            const isPending = item.status === "pending";
            return (
              <div
                key={item.id}
                className={`glass-card p-6 transition-all duration-300 ${
                  isPending
                    ? "border-2 border-gold bg-gold/[.03] shadow-md ring-2 ring-gold/10"
                    : ""
                }`}
              >
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      {isPending ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                          Pending Approval
                        </span>
                      ) : (
                        <StatusBadge status={item.status} />
                      )}
                      <span className="text-[10px] uppercase tracking-widest text-slate-400">
                        {item.type}
                      </span>
                    </div>
                    <h2 className="display-title mt-3 text-2xl text-navy">
                      {item.planName}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.userName} · {item.ticker} · {item.completedWeeks || 0}/{item.totalWeeks} weeks · {money(item.projectedReturn)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["active", "flash active", "completed", "flash done", "deleted", "cancelled", "frozen", "paused"].includes(item.status) && (
                      <button
                        onClick={() => setDetail(item)}
                        className="btn-secondary bg-white text-navy"
                      >
                        Timeline
                      </button>
                    )}

                    {item.status === "awaiting_funding" && (
                      <button
                        onClick={() =>
                          openActionModal({
                            kind: "delete",
                            item,
                            title: "Delete Investment",
                            description: "Are you sure you want to delete/cancel this investment? This action cannot be undone. Enter deletion reason:",
                            confirmLabel: "Delete/Cancel Investment",
                          })
                        }
                        className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                      >
                        Delete / Cancel
                      </button>
                    )}

                    {item.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(item)}
                          className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            openActionModal({
                              kind: "decline",
                              item,
                              title: "Decline Funding Request",
                              description: "Enter reason to decline this investment funding request:",
                              confirmLabel: "Decline Funding",
                            })
                          }
                          className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {["active", "flash active", "frozen", "paused"].includes(item.status) && (
                      <>
                        <button
                          onClick={() =>
                            openActionModal({
                              kind: "edit-return",
                              item,
                              title: "Edit Projected Return",
                              description: "Set a new projected return for this investment:",
                              showAmount: true,
                              defaultAmount: item.projectedReturn,
                              confirmLabel: "Save Return",
                            })
                          }
                          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold hover:bg-slate-50"
                        >
                          Edit return
                        </button>
                        <button
                          onClick={() =>
                            openActionModal({
                              kind: "extend",
                              item,
                              title: "Extend Investment",
                              description: "Extend the maturity date by adding extra weeks:",
                              showExtraWeeks: true,
                              confirmLabel: "Extend Investment",
                            })
                          }
                          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold hover:bg-slate-50"
                        >
                          Extend
                        </button>
                        <button
                          onClick={() =>
                            openActionModal({
                              kind: "force-complete",
                              item,
                              title: "Force Complete Investment",
                              description: "Immediately complete this investment and credit its projected return to available balance:",
                              confirmLabel: "Force complete",
                            })
                          }
                          className="btn-primary py-2 text-xs"
                        >
                          Force complete
                        </button>
                        <button
                          onClick={() =>
                            openActionModal({
                              kind: "delete-active",
                              item,
                              title: "Cancel/Delete Active Investment",
                              description: "Are you sure you want to delete/cancel this active investment? Accumulated locked earnings will disappear and no payout will occur.",
                              confirmLabel: "Cancel/Delete",
                            })
                          }
                          className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          Cancel/Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="No investment plans"
          text="New client plans will appear here after they select an investment tier."
        />
      )}
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.planName || "Timeline"}>
        {detail && <Timeline investment={detail} />}
      </Modal>
      <ActionModal action={actionModal} onClose={() => setActionModal(null)} onSubmit={handleActionSubmit} />
    </div>
  );
}
