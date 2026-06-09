import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Check, ChevronRight, CircleDollarSign, Clock3, FileText, History,
  LifeBuoy, LockKeyhole, MessageSquare, RefreshCw, ShieldCheck, Snowflake,
  TrendingUp, UserRound, Users, WalletCards, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { EmptyState, Modal, StatusBadge } from "../components/UI";
import { Timeline } from "../components/InvestmentUI";
import { dataService } from "../lib/dataService";
import { createNotification } from "../lib/enterprise";
import { reviewKyc } from "../lib/securityApi";
import {
  calculateLiveLockedBalance, calculateTotalLockedBalance, calculateTotalPortfolio,
} from "../lib/lockedBalance";
import { useCurrency } from "../lib/currency";
import { approveInvestmentFunding, declineInvestmentFunding, reviewFinancialRequest } from "../lib/approvalWorkflow";

const tabs = [
  "Overview", "Balances", "Investments", "Deposits", "Withdrawals",
  "Transactions", "Admin History", "Referrals", "KYC", "Support Tickets", "Admin Notes",
];
const now = () => new Date().toISOString();
const dateTime = (value) => value ? new Date(value).toLocaleString() : "Not recorded";
const date = (value) => value ? new Date(value).toLocaleDateString() : "Not recorded";
const activeInvestment = (status) => ["active", "flash active", "frozen", "paused"].includes(status);
const investmentStatusRank = (status) => {
  if (["active", "flash active"].includes(status)) return 0;
  if (["frozen", "paused"].includes(status)) return 1;
  return 2;
};

function StatCard({ label, value, note, icon: Icon = CircleDollarSign }) {
  return <div className="glass-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="display-title mt-3 text-2xl text-navy">{value}</p>{note && <p className="mt-2 text-xs text-slate-400">{note}</p>}</div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold"><Icon size={18} /></span></div></div>;
}

function DetailGrid({ items }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map(([label, value]) => <div key={label} className="rounded-xl bg-stone p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><div className="mt-2 break-words text-sm font-bold text-navy">{value ?? "Not recorded"}</div></div>)}</div>;
}

function ActionModal({ action, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(action?.defaultAmount ?? "");
  const [message, setMessage] = useState(action?.defaultMessage || "");
  const [busy, setBusy] = useState(false);
  if (!action) return null;
  async function submit(event) {
    event.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await onSubmit({ reason: reason.trim(), amount: Number(amount), message: message.trim() });
      onClose();
    } finally {
      setBusy(false);
    }
  }
  return <Modal open title={action.title} onClose={onClose}><form onSubmit={submit} className="space-y-4">
    <p className="text-sm leading-6 text-slate-500">{action.description}</p>
    {action.confirmation && <div className="rounded-xl border border-gold/25 bg-gold/[.07] p-4 text-sm font-semibold leading-6 text-navy">{action.confirmation}</div>}
    {action.amount && <div><label className="label">{action.amountLabel || "Amount"}</label><input className="field" type="number" min={action.min ?? (action.allowZero ? 0 : 0.01)} step={action.step ?? "0.01"} required value={amount} onChange={(event) => setAmount(event.target.value)} /></div>}
    {action.message && <div><label className="label">{action.messageLabel || "Message"}</label><textarea className="field min-h-28" required value={message} onChange={(event) => setMessage(event.target.value)} /></div>}
    <div><label className="label">Reason <span className="text-red-500">*</span></label><textarea className="field min-h-28" required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record the operational reason for this action." /></div>
    <button disabled={busy || !reason.trim()} className="btn-primary w-full">{busy ? "Saving..." : action.confirmLabel || "Confirm action"}</button>
  </form></Modal>;
}

function RecordsList({ items, emptyTitle, render }) {
  if (!items.length) return <EmptyState title={emptyTitle} text="No records are available for this user." />;
  return <div className="space-y-4">{items.map(render)}</div>;
}

export function UserControlCenter() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const actor = useAuth()?.user;
  const { format: money } = useCurrency();
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState({
    investments: [], deposits: [], withdrawals: [], transactions: [],
    referrals: [], kyc: [], tickets: [], notes: [],
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [action, setAction] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [error, setError] = useState("");
  const tabSeenKey = actor ? `stonehaven-admin-tab-seen:${actor.userId}:${userId}` : "";
  const [tabSeen, setTabSeen] = useState(() => {
    if (!actor) return {};
    try {
      return JSON.parse(localStorage.getItem(`stonehaven-admin-tab-seen:${actor.userId}:${userId}`) || "{}");
    } catch {
      return {};
    }
  });

  const load = useCallback(async (silent = false) => {
    if (!actor) return;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const target = await dataService.getUser(userId);
      if (!target) throw new Error("User not found.");
      setProfile(target);
      const results = await Promise.allSettled([
        dataService.listForUser("investments", userId),
        dataService.listForUser("deposits", userId),
        dataService.listForUser("withdrawals", userId),
        dataService.listForUser("transactions", userId),
        dataService.listUsers(actor.adminId, actor.role === "superadmin"),
        dataService.listForUser("kycSubmissions", userId),
        dataService.listForUser("supportTickets", userId),
        dataService.listForUser("adminNotes", userId),
      ]);
      const value = (index) => results[index].status === "fulfilled" ? results[index].value : [];
      const [investments, deposits, withdrawals, transactions, users, kyc, tickets, notes] =
        results.map((_, index) => value(index));
      const unavailable = results
        .map((result, index) => result.status === "rejected" ? tabs[index + 2] || "Admin Notes" : null)
        .filter(Boolean);
      setProfile(target);
      setRecords({
        investments, deposits, withdrawals, transactions,
        referrals: users.filter((item) => item.referredBy && item.referredBy === target.referralCode),
        kyc, tickets: tickets.filter((item) => !item.archivedForAdmin),
        notes,
      });
      if (unavailable.length) {
        setError(`Some sections are temporarily unavailable: ${unavailable.join(", ")}. Deploy the latest Firestore rules to enable them.`);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [actor, userId]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  const lockedBalance = useMemo(() => calculateTotalLockedBalance(records.investments), [records.investments]);
  const portfolio = useMemo(() => profile ? calculateTotalPortfolio(profile, records.investments) : 0, [profile, records.investments]);
  const sorted = (items) => [...items].sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
  const sortedInvestments = [...records.investments].sort((a, b) =>
    investmentStatusRank(a.status) - investmentStatusRank(b.status)
    || new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0)
  );

  async function audit(type, label, { amount = 0, status = "completed", reason = "", targetId = "" } = {}) {
    const payload = {
      userId, adminId: profile.adminId, type, label, amount: Number(amount || 0),
      status, reason, adminActorId: actor.userId, adminActorName: actor.name, targetId,
      visibility: "admin_only",
      createdAt: now(),
    };
    await Promise.all([
      dataService.log(payload),
      dataService.create("adminAuditRecords", payload),
    ]);
  }

  async function notify(type, title, message) {
    await createNotification({ userId, adminId: profile.adminId, type, title, message });
  }

  function openAction(config) {
    setError("");
    setAction(config);
  }

  async function submitAction(input) {
    try {
      if (action.kind === "freeze-withdrawal") {
        await dataService.updateUser(userId, {
          freezeWithdrawal: true, withdrawalFreezeMessage: input.message,
          withdrawalFrozenAt: now(), withdrawalFrozenBy: actor.userId,
        });
        await audit("withdrawal_frozen", "Withdrawals frozen", { reason: input.reason });
        await notify("withdrawal", "Withdrawals temporarily frozen", input.message);
      }
      if (action.kind === "unfreeze-withdrawal") {
        await dataService.updateUser(userId, {
          freezeWithdrawal: false, withdrawalFreezeMessage: "",
          withdrawalUnfrozenAt: now(), withdrawalUnfrozenBy: actor.userId,
        });
        await audit("withdrawal_unfrozen", "Withdrawals unfrozen", { reason: input.reason });
        await notify("withdrawal", "Withdrawals restored", "Your withdrawal access has been restored.");
      }
      if (action.kind === "status") {
        await dataService.updateUser(userId, {
          status: action.status, statusChangedAt: now(), statusChangedBy: actor.userId,
          statusReason: input.reason,
        });
        await audit(action.status === "active" ? "user_reactivated" : "user_suspended", `Account ${action.status}`, { reason: input.reason, status: action.status });
        await notify("account", `Account ${action.status}`, input.reason);
      }
      if (action.kind === "balance") {
        if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Enter a valid amount.");
        const latestProfile = await dataService.getUser(userId);
        const current = Number(latestProfile?.availableBalance || 0);
        const next = action.direction === "add" ? current + input.amount : current - input.amount;
        if (next < 0) throw new Error("This adjustment would reduce the balance below zero.");
        const entry = {
          userId,
          adminId: profile.adminId,
          type: action.direction === "add" ? "manual_balance_credit" : "manual_balance_debit",
          label: action.direction === "add" ? "Available balance added" : "Available balance reduced",
          direction: action.direction === "add" ? "credit" : "debit",
          amount: input.amount,
          balanceType: "available",
          reason: input.reason,
          status: "completed",
          createdAt: now(),
          createdBy: actor.userId,
          createdByRole: actor.role,
          adminActorId: actor.userId,
          adminActorName: actor.name,
          beforeBalance: current,
          afterBalance: next,
          visibility: "admin_only",
        };
        await dataService.updateUser(userId, { availableBalance: next });
        await Promise.all([
          dataService.log(entry),
          dataService.create("adminAuditRecords", entry),
        ]);
      }
      if (action.kind === "deposit") {
        await reviewFinancialRequest({
          collection: "deposits",
          item: action.item,
          status: action.status,
          reason: input.reason,
          actor,
        });
      }
      if (action.kind === "withdrawal") {
        await reviewFinancialRequest({
          collection: "withdrawals",
          item: action.item,
          status: action.status,
          reason: input.reason,
          actor,
        });
      }
      if (action.kind === "investment-status") {
        const investment = action.item;
        const changes = {
          status: action.status || "deleted",
          lockedEarned: 0,
          lastActivatedAt: null,
          nextDueAt: null,
          updatedAt: now(),
        };
        await dataService.update("investments", investment.id, changes);
        await audit("investment_deleted", `${investment.planName || "Investment"} deleted/cancelled`, { reason: input.reason, targetId: investment.id });
      }
      if (action.kind === "investment-approve") {
        await approveInvestmentFunding({ investmentId: action.item.id, actor });
      }
      if (action.kind === "investment-decline") {
        await declineInvestmentFunding({ investmentId: action.item.id, reason: input.reason, actor });
      }
      if (action.kind === "investment-return") {
        if (!Number.isFinite(input.amount) || input.amount < 0) throw new Error("Enter a valid projected return.");
        const previousReturn = Number(action.item.projectedReturn || 0);
        await dataService.update("investments", action.item.id, { projectedReturn: input.amount, updatedAt: now(), updatedBy: actor.userId, statusReason: input.reason });
        await audit("investment_return_edited", `${action.item.planName} projected return edited from ${previousReturn} to ${input.amount}`, { amount: input.amount, reason: input.reason, targetId: action.item.id });
      }
      if (action.kind === "investment-extend") {
        if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Enter a valid number of weeks.");
        const extraWeeks = input.amount;
        const newTotalWeeks = Number(action.item.totalWeeks || 0) + extraWeeks;
        const currentMaturity = new Date(action.item.maturityAt || Date.now());
        const newMaturity = new Date(currentMaturity.getTime() + extraWeeks * 7 * 86400000).toISOString();

        await dataService.update("investments", action.item.id, {
          totalWeeks: newTotalWeeks,
          maturityAt: newMaturity,
          updatedAt: now(),
          updatedBy: actor.userId,
          statusReason: input.reason
        });
        await audit("investment_extended", `${action.item.planName} extended by ${extraWeeks} weeks`, { reason: input.reason, targetId: action.item.id });
      }
      if (action.kind === "investment-complete") {
        const returnAmount = Number(action.item.projectedReturn || 0);
        await dataService.updateUser(userId, { availableBalance: Number(profile.availableBalance || 0) + returnAmount });
        await dataService.update("investments", action.item.id, { status: action.item.type === "flash" ? "flash done" : "completed", completedAt: now(), completedBy: actor.userId, statusReason: input.reason, lockedEarned: 0, lastActivatedAt: null, nextDueAt: null });
        
        await dataService.log({
          userId,
          adminId: profile.adminId,
          type: "investment_completed",
          label: "Investment Completed",
          amount: returnAmount,
          status: "completed",
          visibility: "user",
          createdAt: now(),
        });
        await audit("investment_force_completed", `${action.item.planName} force completed`, { amount: returnAmount, reason: input.reason, targetId: action.item.id });
      }
      if (action.kind === "kyc") {
        const storedStatus = action.status === "more-info" ? "rejected" : action.status;
        await reviewKyc({ submissionId: action.item.id, userId, status: storedStatus, rejectionReason: action.status === "rejected" ? input.reason : "", requestDetails: action.status === "more-info" ? input.reason : "" });
        await dataService.update("kycSubmissions", action.item.id, { reviewedBy: actor.userId, reviewedByName: actor.name });
        await audit("kyc_actions", `KYC ${action.status}`, { reason: input.reason, targetId: action.item.id });
        await notify("kyc", action.status === "approved" ? "KYC approved" : action.status === "more-info" ? "More KYC information required" : "KYC rejected", input.reason);
      }
      if (action.kind === "note") {
        await dataService.create("adminNotes", { userId, adminId: profile.adminId, note: input.message, reason: input.reason, adminActorId: actor.userId, adminActorName: actor.name });
        await dataService.create("adminAuditRecords", { userId, adminId: profile.adminId, type: "admin_note_added", label: "Admin note added", amount: 0, status: "completed", reason: input.reason, adminActorId: actor.userId, adminActorName: actor.name });
      }
      await load();
    } catch (actionError) {
      setError(actionError.message);
      throw actionError;
    }
  }

  if (loading) return <div className="glass-card grid min-h-72 place-items-center"><RefreshCw className="animate-spin text-gold" /></div>;
  if (!profile) return <EmptyState icon={UserRound} title="User unavailable" text={error || "This user could not be loaded."} />;

  const depositsApproved = records.deposits.filter((item) => item.status === "approved");
  const withdrawalsApproved = records.withdrawals.filter((item) => item.status === "approved");
  const latestKyc = sorted(records.kyc)[0];
  const isNewForTab = (tabName, item) => {
    const changedAt = new Date(item.updatedAt || item.createdAt || 0).getTime();
    return changedAt > Number(tabSeen[tabName] || 0);
  };
  const tabBadges = {
    Overview: [
      ...records.deposits.filter((item) => item.status === "pending"),
      ...records.withdrawals.filter((item) => item.status === "pending"),
      ...records.kyc.filter((item) => item.status === "pending"),
      ...records.tickets.filter((item) => item.adminUnread),
    ].filter((item) => isNewForTab("Overview", item)).length,
    Balances: profile.freezeWithdrawal
      && new Date(profile.withdrawalFrozenAt || 0).getTime() > Number(tabSeen.Balances || 0) ? 1 : 0,
    Investments: records.investments.filter((item) =>
      ["active", "flash active", "frozen", "paused"].includes(item.status)
      && isNewForTab("Investments", item)
    ).length,
    Deposits: records.deposits.filter((item) => item.status === "pending" && isNewForTab("Deposits", item)).length,
    Withdrawals: records.withdrawals.filter((item) => item.status === "pending" && isNewForTab("Withdrawals", item)).length,
    Transactions: records.transactions.filter((item) => item.visibility !== "admin_only" && isNewForTab("Transactions", item)).length,
    "Admin History": records.transactions.filter((item) => (item.visibility === "user" || item.visibility === "admin_only") && isNewForTab("Admin History", item)).length,
    Referrals: records.referrals.filter((item) => isNewForTab("Referrals", item)).length,
    KYC: records.kyc.filter((item) => item.status === "pending" && isNewForTab("KYC", item)).length,
    "Support Tickets": records.tickets.filter((item) => item.adminUnread && isNewForTab("Support Tickets", item)).length,
    "Admin Notes": records.notes.filter((item) => isNewForTab("Admin Notes", item)).length,
  };
  function openTab(tabName) {
    setTab(tabName);
    const next = { ...tabSeen, [tabName]: Date.now() };
    setTabSeen(next);
    if (tabSeenKey) localStorage.setItem(tabSeenKey, JSON.stringify(next));
  }
  const overview = <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Available balance" value={money(profile.availableBalance)} icon={WalletCards} />
      <StatCard label="Locked balance" value={money(lockedBalance)} icon={LockKeyhole} />
      <StatCard label="Referral balance" value={money(profile.referralBalance)} icon={Users} />
      <StatCard label="Total portfolio" value={money(portfolio)} icon={TrendingUp} />
    </div>
    <div className="glass-card p-6"><div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">{profile.profilePhotoUrl ? <img src={profile.profilePhotoUrl} alt="" className="h-24 w-24 rounded-2xl object-cover" /> : <span className="grid h-24 w-24 place-items-center rounded-2xl bg-navy font-display text-3xl font-bold text-gold">{profile.name?.charAt(0)}</span>}<div><h2 className="display-title text-2xl text-navy">Profile information</h2><p className="mt-1 text-sm text-slate-500">Updated by {profile.profileUpdatedBy === "user" ? "User" : profile.profileUpdatedBy || "system"} · {dateTime(profile.profileUpdatedAt)}</p>{profile.profileUpdateNotice && <p className="mt-2 text-xs font-bold text-gold">{profile.profileUpdateNotice}</p>}</div></div><DetailGrid items={[
      ["Full name", profile.name], ["Email", profile.email], ["Phone", profile.phone],
      ["Address", profile.address], ["Country", profile.country], ["State / Region", profile.state],
      ["City", profile.city], ["Role", <StatusBadge status={profile.role} />], ["Admin scope", profile.adminId],
      ["Account status", <StatusBadge status={profile.status} />], ["KYC status", <StatusBadge status={profile.kycStatus} />],
      ["User UID", <code className="break-all text-xs">{profile.userId}</code>],
      ["Date joined", dateTime(profile.createdAt)], ["Last login", dateTime(profile.lastLogin)],
      ["Withdrawal status", profile.freezeWithdrawal ? <span className="text-red-600">Frozen</span> : <span className="text-emerald-700">Enabled</span>],
      ["Referral code", profile.referralCode || "Not assigned"],
    ]} />{profile.profileChanges?.length > 0 && <details className="mt-5 rounded-xl border border-slate-200"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-navy">Profile change history ({profile.profileChanges.length})</summary><div className="divide-y divide-slate-100 border-t border-slate-200">{[...profile.profileChanges].reverse().map((change, index) => <div key={`${change.changedAt}-${change.fieldChanged}-${index}`} className="p-4 text-xs"><p className="font-bold capitalize text-navy">{change.fieldChanged.replaceAll("_", " ")}</p><p className="mt-1 break-words text-slate-500">{change.oldValue || "Empty"} → {change.newValue || "Empty"}</p><p className="mt-1 text-slate-400">{dateTime(change.changedAt)}</p></div>)}</div></details>}</div>
    {profile.freezeWithdrawal && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><strong>Withdrawal freeze message:</strong> {profile.withdrawalFreezeMessage}</div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Investments" value={records.investments.length} note={`${records.investments.filter((item) => activeInvestment(item.status)).length} active`} icon={TrendingUp} />
      <StatCard label="Deposits" value={money(depositsApproved.reduce((sum, item) => sum + Number(item.amount), 0))} note={`${records.deposits.length} requests`} />
      <StatCard label="Withdrawals" value={money(withdrawalsApproved.reduce((sum, item) => sum + Number(item.amount), 0))} note={`${records.withdrawals.length} requests`} icon={WalletCards} />
      <StatCard label="Support tickets" value={records.tickets.length} note={`${records.tickets.filter((item) => ["open", "in progress"].includes(item.status)).length} open`} icon={LifeBuoy} />
    </div>
  </div>;

  const balances = <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Available" value={money(profile.availableBalance)} />
      <StatCard label="Referral" value={money(profile.referralBalance)} icon={Users} />
      <StatCard label="Locked" value={money(lockedBalance)} icon={LockKeyhole} />
      <StatCard label="Portfolio" value={money(portfolio)} icon={TrendingUp} />
    </div>
    <div className="glass-card p-6"><h2 className="display-title text-2xl text-navy">Available balance adjustment</h2><p className="mt-2 text-sm text-slate-500">Internal adjustments are recorded in the admin ledger and audit history. They do not notify the user or change referral balance.</p><div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"><button onClick={() => openAction({ kind: "balance", direction: "add", title: "Add available balance", description: "Credit this user's available balance.", confirmation: "This will increase Available Balance only and create an internal admin record.", amount: true })} className="btn-primary w-full">Add available balance</button><button onClick={() => openAction({ kind: "balance", direction: "reduce", title: "Reduce available balance", description: "Debit this user's available balance. The balance cannot fall below zero.", confirmation: "This will reduce Available Balance only and create an internal admin record.", amount: true })} className="w-full rounded-xl bg-red-50 px-5 py-3 text-sm font-bold text-red-700">Reduce available balance</button></div></div>
  </div>;

  const investments = <RecordsList items={sortedInvestments} emptyTitle="No investments" render={(item) => {
    const metrics = calculateLiveLockedBalance(item);
    return <div key={item.id} className="glass-card p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status} /><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.type}</span></div>
      <h3 className="display-title mt-3 text-xl text-navy md:text-2xl">{item.planName || item.assetName || "Investment"}</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-stone p-3"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Asset</p><p className="mt-1 text-sm font-bold text-navy">{item.assetName || item.ticker || "N/A"}</p></div>
        <div className="rounded-xl bg-stone p-3"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Weekly capital</p><p className="mt-1 text-sm font-bold text-navy">{money(item.weeklyCapital || item.capital)}</p></div>
        <div className="rounded-xl bg-stone p-3"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Projected return</p><p className="mt-1 text-sm font-bold text-navy">{money(item.projectedReturn || item.expectedReturn)}</p></div>
        <div className="rounded-xl bg-stone p-3"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Progress</p><p className="mt-1 text-sm font-bold text-navy">{metrics.progressPercent.toFixed(1)}%</p></div>
      </div>
      <details className="group mt-4 rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-navy">View details <ChevronRight className="transition group-open:rotate-90" size={17} /></summary>
        <div className="border-t border-slate-100 p-4">
          <DetailGrid items={[
            ["Duration", item.durationMonths ? `${item.durationMonths} months` : item.durationHours ? `${item.durationHours} hours` : `${item.totalWeeks || 0} weeks`],
            ["Current week", `${item.currentWeek || item.completedWeeks || 0} / ${item.totalWeeks || 1}`],
            ["Locked balance", money(metrics.lockedEarned)], ["Next deposit due", dateTime(item.nextDueAt)],
            ["Started", dateTime(item.startedAt)], ["Maturity", dateTime(item.maturityAt)],
          ]} />
          <div className="mt-4 flex flex-wrap gap-2">
            {["active", "flash active", "completed", "flash done", "deleted", "cancelled", "frozen", "paused"].includes(item.status) && (
              <button onClick={() => setTimeline(item)} className="btn-secondary bg-white py-2 text-xs text-navy">View timeline</button>
            )}

            {item.status === "awaiting_funding" && (
              <button
                onClick={() =>
                  openAction({
                    kind: "investment-status",
                    item,
                    status: "deleted",
                    title: "Delete Investment",
                    description: "Are you sure you want to delete/cancel this investment? This action cannot be undone. Enter deletion reason:"
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
                  onClick={async () => {
                    if (window.confirm(`Approve funding for ${item.planName}?`)) {
                      try {
                        await approveInvestmentFunding({ investmentId: item.id, actor });
                        await load();
                      } catch (err) {
                        window.alert(err.message);
                      }
                    }
                  }}
                  className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    openAction({
                      kind: "investment-decline",
                      item,
                      title: "Decline Funding Request",
                      description: "Enter reason to decline this investment funding request:"
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
                    openAction({
                      kind: "investment-return",
                      item,
                      title: "Edit Projected Return",
                      description: "Set a new projected return for this investment:",
                      amount: true,
                      defaultAmount: item.projectedReturn
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold hover:bg-slate-50"
                >
                  Edit return
                </button>
                <button
                  onClick={() =>
                    openAction({
                      kind: "investment-extend",
                      item,
                      title: "Extend Investment",
                      description: "Extend the maturity date by adding extra weeks:",
                      amount: true,
                      amountLabel: "Extra Weeks",
                      min: 1,
                      step: 1,
                      defaultAmount: 2
                    })
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold hover:bg-slate-50"
                >
                  Extend
                </button>
                <button
                  onClick={() =>
                    openAction({
                      kind: "investment-complete",
                      item,
                      title: "Force Complete Investment",
                      description: "Immediately complete this investment and credit its projected return to available balance:"
                    })
                  }
                  className="btn-primary py-2 text-xs"
                >
                  Force complete
                </button>
                <button
                  onClick={() =>
                    openAction({
                      kind: "investment-status",
                      item,
                      status: "deleted",
                      title: "Cancel/Delete Active Investment",
                      description: "Are you sure you want to delete/cancel this active investment? Accumulated locked earnings will disappear and no payout will occur. Enter reason:"
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
      </details>
    </div>;
  }} />;

  const deposits = <RecordsList items={sorted(records.deposits)} emptyTitle="No deposits" render={(item) => <div key={item.id} className="glass-card p-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><div className="flex items-center gap-2"><StatusBadge status={item.status} /><span className="text-xs text-slate-400">{dateTime(item.createdAt)}</span></div><h3 className="mt-3 font-bold text-navy">{item.methodName || "Deposit"} · {money(item.amount)}</h3><p className="mt-1 text-xs text-slate-500">{item.reference || item.transactionHash || "No reference"}</p>{item.declineReason && <p className="mt-2 text-xs text-red-600">Reason: {item.declineReason}</p>}</div>{item.status === "pending" && <div className="flex gap-2"><button onClick={() => openAction({ kind: "deposit", item, status: "approved", title: "Approve deposit", description: "Approve this deposit and apply any linked investment update." })} className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">Approve</button><button onClick={() => openAction({ kind: "deposit", item, status: "declined", title: "Decline Deposit", description: "Decline this deposit and send the reason to the user." })} className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700">Decline</button></div>}</div></div>} />;

  const withdrawals = <RecordsList items={sorted(records.withdrawals)} emptyTitle="No withdrawals" render={(item) => <div key={item.id} className="glass-card p-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><div className="flex items-center gap-2"><StatusBadge status={item.status} /><span className="rounded-full bg-stone px-2 py-1 text-[10px] font-bold uppercase text-slate-500">{item.type === "referral" ? "Referral Balance Withdrawal" : "Available Balance Withdrawal"}</span></div><h3 className="mt-3 font-bold text-navy">{money(item.amount)} · {item.method}</h3><p className="mt-1 text-xs text-slate-500">{item.accountDetails}</p><p className="mt-1 text-xs text-slate-400">{dateTime(item.createdAt)}</p>{item.declineReason && <p className="mt-2 text-xs text-red-600">Reason: {item.declineReason}</p>}</div>{item.status === "pending" && <div className="flex gap-2"><button onClick={() => openAction({ kind: "withdrawal", item, status: "approved", title: "Approve withdrawal", description: `Approve and deduct from ${item.type === "referral" ? "referral balance only" : "available balance only"}.` })} className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">Approve</button><button onClick={() => openAction({ kind: "withdrawal", item, status: "declined", title: "Decline Withdrawal", description: "Decline this withdrawal and send the reason to the user." })} className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700">Decline</button></div>}</div></div>} />;

  const transactions = <RecordsList items={sorted(records.transactions.filter((item) => item.visibility !== "admin_only"))} emptyTitle="No transactions" render={(item) => <div key={item.id} className="glass-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-navy">{item.label}</p></div><p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">{String(item.type || "").replaceAll("_", " ")} · {dateTime(item.createdAt)}</p>{item.reason && <p className="mt-2 text-xs text-slate-600">Reason: {item.reason}</p>}</div><div className="text-left sm:text-right">{Number(item.amount || 0) !== 0 && <p className="font-bold text-navy">{item.direction === "debit" ? "-" : item.direction === "credit" ? "+" : ""}{money(item.amount)}</p>}<StatusBadge status={item.status} /></div></div>} />;

  const adminHistory = <RecordsList items={sorted(records.transactions)} emptyTitle="No admin history" render={(item) => <div key={item.id} className="glass-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-navy">{item.label}</p>{item.visibility === "admin_only" && <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-700">Internal</span>}</div><p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">{String(item.type || "").replaceAll("_", " ")} · {dateTime(item.createdAt)}</p>{item.reason && <p className="mt-2 text-xs text-slate-600">Reason: {item.reason}</p>}{item.adminActorName && <p className="mt-1 text-xs text-slate-400">Admin: {item.adminActorName}</p>}{item.visibility === "admin_only" && <p className="mt-1 text-xs text-slate-400">Available balance: {money(item.beforeBalance)} to {money(item.afterBalance)}</p>}</div><div className="text-left sm:text-right">{Number(item.amount || 0) !== 0 && <p className="font-bold text-navy">{item.direction === "debit" ? "-" : item.direction === "credit" ? "+" : ""}{money(item.amount)}</p>}<StatusBadge status={item.status} /></div></div>} />;

  const referrals = <div className="space-y-6"><div className="glass-card p-6"><DetailGrid items={[
    ["Referral code", profile.referralCode || "Not assigned"],
    ["Referral link", `${window.location.origin}/register?ref=${profile.referralCode || ""}&admin=${profile.adminId}`],
    ["Total referred", records.referrals.length],
    ["Active referred", records.referrals.filter((item) => item.status === "active").length],
    ["Referral earnings", money(profile.referralBalance)],
    ["Referral withdrawals", records.withdrawals.filter((item) => item.type === "referral").length],
  ]} /></div><RecordsList items={records.referrals} emptyTitle="No referred users" render={(item) => <div key={item.userId} className="glass-card flex items-center justify-between gap-4 p-5"><div><p className="font-bold text-navy">{item.name}</p><p className="text-xs text-slate-400">{item.email} · Joined {date(item.createdAt)}</p></div><div className="text-right"><StatusBadge status={item.status} /><p className="mt-2 text-[10px] text-slate-400">Bonus status: {item.referralBonusPaid ? "paid" : "pending"}</p></div></div>} /></div>;

  const kyc = latestKyc ? <div className="glass-card p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="display-title text-2xl text-navy">KYC submission</h2><p className="mt-1 text-xs text-slate-400">Submitted {dateTime(latestKyc.createdAt)}</p></div><StatusBadge status={latestKyc.status} /></div><div className="mt-5"><DetailGrid items={[
    ["Legal name", latestKyc.legalName], ["ID type", latestKyc.idType], ["Submitted date", dateTime(latestKyc.createdAt)],
    ["Reviewed date", dateTime(latestKyc.reviewedAt)], ["Reviewer", latestKyc.reviewedByName || latestKyc.reviewedBy],
    ["Rejection reason", latestKyc.rejectionReason || latestKyc.requestDetails || "None"],
  ]} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(latestKyc.documents || {}).map(([key, url]) => <a key={key} href={url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 p-4 text-xs font-bold capitalize text-navy">{key.replace(/([A-Z])/g, " $1")}<span className="mt-1 block text-gold">View document</span></a>)}</div><div className="mt-6 flex flex-wrap gap-2"><button onClick={() => openAction({ kind: "kyc", item: latestKyc, status: "approved", title: "Approve KYC", description: "Approve this identity verification." })} className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">Approve</button><button onClick={() => openAction({ kind: "kyc", item: latestKyc, status: "rejected", title: "Reject KYC", description: "Reject this verification and provide the user-visible reason." })} className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-700">Reject</button><button onClick={() => openAction({ kind: "kyc", item: latestKyc, status: "more-info", title: "Request more information", description: "Describe the additional document or information required." })} className="rounded-xl bg-gold/15 px-4 py-2 text-xs font-bold text-navy">Request more</button></div></div> : <EmptyState icon={ShieldCheck} title="No KYC submission" text="This user has not submitted identity documents." />;

  const tickets = <RecordsList items={sorted(records.tickets)} emptyTitle="No support tickets" render={(item) => {
    const last = item.messages?.[item.messages.length - 1];
    return <button key={item.id} onClick={() => navigate(`${actor.role === "superadmin" ? "/superadmin" : "/admin"}/support?ticket=${item.id}`)} className="glass-card flex w-full flex-col justify-between gap-4 p-5 text-left sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><StatusBadge status={item.status} /><span className="text-xs text-slate-400">{item.ticketId}</span></div><p className="mt-3 font-bold text-navy">{item.subject}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{last?.message || "No messages"}</p><p className="mt-2 text-[10px] uppercase tracking-widest text-slate-400">Created {dateTime(item.createdAt)} · Updated {dateTime(item.updatedAt || item.createdAt)}</p></div><div className="flex items-center gap-2 text-xs font-bold text-gold">{item.adminUnread && <span className="rounded-full bg-red-50 px-2 py-1 text-red-600">Unread</span>}Open ticket <ChevronRight size={15} /></div></button>;
  }} />;

  const notes = <div className="space-y-5"><button onClick={() => openAction({ kind: "note", title: "Add admin note", description: "This internal note is visible to administrators only.", message: true, messageLabel: "Admin note" })} className="btn-primary"><MessageSquare size={16} /> Add note</button><RecordsList items={sorted(records.notes)} emptyTitle="No admin notes" render={(item) => <div key={item.id} className="glass-card p-5"><p className="text-sm leading-6 text-slate-700">{item.note}</p><p className="mt-3 text-[10px] uppercase tracking-widest text-slate-400">{item.adminActorName} · {dateTime(item.createdAt)}</p><p className="mt-1 text-xs text-slate-400">Reason: {item.reason}</p></div>} /></div>;

  const content = {
    Overview: overview, Balances: balances, Investments: investments, Deposits: deposits,
    Withdrawals: withdrawals, Transactions: transactions, "Admin History": adminHistory, Referrals: referrals, KYC: kyc,
    "Support Tickets": tickets, "Admin Notes": notes,
  }[tab];

  return <div>
    <button onClick={() => navigate(actor.role === "superadmin" ? "/superadmin/users" : "/admin/users")} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-navy"><ArrowLeft size={17} /> Back to users</button>
    <div className="rounded-2xl bg-navy p-6 text-white shadow-heritage md:p-8"><div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={profile.status} /><StatusBadge status={profile.kycStatus} />{profile.freezeWithdrawal && <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-200">Withdrawals frozen</span>}</div><h1 className="display-title mt-4 text-3xl md:text-4xl">{profile.name}</h1><p className="mt-2 text-sm text-white/50">{profile.email} · {profile.adminId}</p></div><div className="flex flex-wrap gap-2"><button onClick={load} className="rounded-xl bg-white/10 px-4 py-3 text-xs font-bold"><RefreshCw className="mr-2 inline" size={14} />Refresh</button>{profile.freezeWithdrawal ? <button onClick={() => openAction({ kind: "unfreeze-withdrawal", title: "Unfreeze withdrawals", description: "Restore withdrawal access for this user." })} className="rounded-xl bg-emerald-500/20 px-4 py-3 text-xs font-bold text-emerald-200">Unfreeze withdrawals</button> : <button onClick={() => openAction({ kind: "freeze-withdrawal", title: "Freeze withdrawals", description: "Block all withdrawal forms and show the user a custom message.", message: true, messageLabel: "User-facing freeze message", defaultMessage: "Your withdrawal is temporarily paused while we complete account review. Please contact support." })} className="rounded-xl bg-blue-500/20 px-4 py-3 text-xs font-bold text-blue-200"><Snowflake className="mr-1 inline" size={14} />Freeze withdrawals</button>}{profile.status === "active" ? <button onClick={() => openAction({ kind: "status", status: "suspended", title: "Suspend account", description: "Suspend this account and record the reason." })} className="rounded-xl bg-red-500/20 px-4 py-3 text-xs font-bold text-red-200">Suspend</button> : <button onClick={() => openAction({ kind: "status", status: "active", title: "Reactivate account", description: "Restore active account access." })} className="rounded-xl bg-emerald-500/20 px-4 py-3 text-xs font-bold text-emerald-200">Reactivate</button>}</div></div></div>
    {error && <div className="mt-5 flex items-start justify-between gap-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button onClick={() => setError("")}><X size={16} /></button></div>}
    <div className="sticky top-0 z-20 -mx-2 mt-6 overflow-x-auto bg-stone/95 px-2 py-3 backdrop-blur"><div className="flex min-w-max gap-2">{tabs.map((item) => <button key={item} onClick={() => openTab(item)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${tab === item ? "bg-navy text-white" : "bg-white text-slate-500"}`}>{item}{tabBadges[item] > 0 && <span className={`grid min-h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-black ${tab === item ? "bg-red-500 text-white" : "bg-red-50 text-red-600"}`}>{tabBadges[item] > 99 ? "99+" : tabBadges[item]}</span>}</button>)}</div></div>
    <div className="mt-5">{content}</div>
    <ActionModal action={action} onClose={() => setAction(null)} onSubmit={submitAction} />
    <Modal open={Boolean(timeline)} onClose={() => setTimeline(null)} title={timeline?.planName || "Investment timeline"}>{timeline && <Timeline investment={timeline} />}</Modal>
  </div>;
}
