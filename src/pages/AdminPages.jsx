import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownToLine, ArrowUpFromLine, Check, CircleDollarSign, Clock3, CreditCard,
  Link2, Plus, RefreshCw, ShieldCheck, Trash2, Upload, UserPlus, Users, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { uploadToCloudinary } from "../lib/cloudinary";
import { approveInvestmentDeposit, reconcileInvestmentTimers, rejectInvestmentDeposit } from "../lib/investmentEngine";
import { createNotification } from "../lib/enterprise";
import { createAdminInvitation, setManagedUserStatus } from "../lib/securityApi";
import { EmptyState, Modal, PageHeader, StatusBadge } from "../components/UI";
import { useCurrency } from "../lib/currency";
const date = (value) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

function useAdminData(collectionName) {
  const { user } = useAuth(); const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const result = collectionName === "users" ? await dataService.listUsers(user.adminId, user.role === "superadmin") : await dataService.list(collectionName, user.adminId, user.role === "superadmin"); setItems(result); setLoading(false); }, [collectionName, user.adminId, user.role]);
  useEffect(() => { load(); }, [load]);
  return { items, setItems, loading, load };
}

export function AdminDashboard({ superAdmin = false }) {
  const { user } = useAuth();
  const { format: money } = useCurrency();
  const [stats, setStats] = useState({ users: [], deposits: [], withdrawals: [], methods: [] });
  useEffect(() => {
    Promise.all([
      dataService.listUsers(user.adminId, superAdmin), dataService.list("deposits", user.adminId, superAdmin),
      dataService.list("withdrawals", user.adminId, superAdmin), dataService.list("depositMethods", user.adminId, superAdmin),
      dataService.list("investments", user.adminId, superAdmin),
    ]).then(async ([users, deposits, withdrawals, methods, investments]) => {
      await reconcileInvestmentTimers(investments);
      setStats({ users, deposits, withdrawals, methods });
    });
  }, [user.adminId, superAdmin]);
  const cards = [
    ["Total clients", stats.users.filter((item) => item.role === "user").length, Users, "Active relationships"],
    ["Pending deposits", stats.deposits.filter((item) => item.status === "pending").length, ArrowDownToLine, money(stats.deposits.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount, 0))],
    ["Pending withdrawals", stats.withdrawals.filter((item) => item.status === "pending").length, ArrowUpFromLine, money(stats.withdrawals.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount, 0))],
    ["Active methods", stats.methods.filter((item) => item.active).length, CreditCard, "Funding channels"],
  ];
  return (
    <div><PageHeader eyebrow={superAdmin ? "Platform intelligence" : "Advisor workspace"} title={superAdmin ? "Executive overview" : `Welcome, ${user.name.split(" ")[0]}.`} description={superAdmin ? "Consolidated operational visibility across the Stonehaven platform." : "Monitor your client book and respond to financial requests."} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon, note]) => <div key={label} className="glass-card p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="display-title mt-3 text-4xl text-navy">{value}</p></div><span className="grid h-11 w-11 place-items-center rounded-xl bg-gold/10 text-gold"><Icon size={20} /></span></div><p className="mt-5 text-xs text-slate-400">{note}</p></div>)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><div className="glass-card p-7"><div className="flex items-center justify-between"><div><p className="section-kicker">Capital activity</p><h2 className="display-title mt-2 text-2xl text-navy">Deposits vs. withdrawals</h2></div><span className="text-xs text-slate-400">Last 6 months</span></div><div className="mt-10 flex h-64 items-end justify-around gap-4">{[42, 66, 48, 82, 64, 91].map((height, index) => <div key={index} className="flex h-full flex-1 items-end justify-center gap-1"><div className="w-4 rounded-t bg-gold" style={{ height: `${height}%` }} /><div className="w-4 rounded-t bg-navy/25" style={{ height: `${height * .48}%` }} /></div>)}</div><div className="mt-4 flex justify-center gap-6 text-xs text-slate-400"><span><i className="mr-2 inline-block h-2 w-2 rounded bg-gold" />Deposits</span><span><i className="mr-2 inline-block h-2 w-2 rounded bg-navy/25" />Withdrawals</span></div></div>
      <div className="rounded-2xl bg-navy p-7 text-white shadow-heritage"><ShieldCheck className="text-gold" size={27} /><h2 className="display-title mt-8 text-3xl">Scope integrity</h2><p className="mt-4 text-sm leading-7 text-white/50">{superAdmin ? "You have platform-wide authority across every advisor scope and transaction." : `Your workspace is restricted to adminId ${user.adminId}. Other advisor data remains isolated.`}</p><div className="mt-8 border-t border-white/10 pt-6"><p className="text-xs text-white/35">Role</p><p className="mt-1 font-bold capitalize text-gold">{user.role}</p></div></div></div>
    </div>
  );
}

export function UsersAdminPage({ superAdmin = false }) {
  const { items: users, load } = useAdminData("users"); const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { format: money } = useCurrency();
  const [invitationLink, setInvitationLink] = useState(""); const [form, setForm] = useState({ name: "", email: "", country: "", phone: "", adminId: "" }); const clients = users.filter((item) => superAdmin ? true : item.role === "user");
  async function toggle(user) { await setManagedUserStatus(user.userId, user.status === "active" ? "suspended" : "active"); load(); }
  async function createSubAdmin(event) {
    event.preventDefault();
    const invitation = await createAdminInvitation(form);
    setInvitationLink(`${window.location.origin}/register?invite=${encodeURIComponent(invitation.token)}`);
  }
  return (
    <div><PageHeader eyebrow="Relationship management" title={superAdmin ? "All platform users" : "My clients"} description={superAdmin ? "View clients and advisors across every administrative scope." : "Client records visible within your assigned adminId only."} action={superAdmin && <button onClick={() => setOpen(true)} className="btn-primary"><UserPlus size={16} /> Create sub-admin</button>} />
      <div className="grid gap-4 md:hidden">{clients.map((client) => <button key={client.userId} onClick={() => superAdmin && navigate(`/superadmin/users/${client.userId}`)} className="glass-card p-5 text-left"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-navy">{client.name}</p><p className="mt-1 text-xs text-slate-400">{client.email}</p></div><StatusBadge status={client.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><p><span className="text-slate-400">Role</span><br /><strong className="capitalize">{client.role}</strong></p><p><span className="text-slate-400">Admin ID</span><br /><strong>{client.adminId}</strong></p><p><span className="text-slate-400">Available</span><br /><strong>{money(client.availableBalance)}</strong></p><p><span className="text-slate-400">Referral</span><br /><strong>{money(client.referralBalance)}</strong></p></div></button>)}</div>
      <div className="glass-card table-scroll hidden overflow-x-auto md:block"><table className="w-full min-w-[850px]"><thead><tr className="bg-navy text-left text-[10px] uppercase tracking-widest text-white/45"><th className="px-6 py-5">User</th><th>Role</th><th>Admin ID</th><th>Balances</th><th>Status</th><th className="pr-6 text-right">Actions</th></tr></thead><tbody>{clients.map((client) => <tr key={client.userId} onClick={() => superAdmin && navigate(`/superadmin/users/${client.userId}`)} className={`border-b border-slate-100 text-sm last:border-0 ${superAdmin ? "cursor-pointer hover:bg-gold/[.06]" : ""}`}><td className="px-6 py-5"><p className="font-bold text-navy">{client.name}</p><p className="mt-1 text-xs text-slate-400">{client.email}</p></td><td className="capitalize">{client.role}</td><td><code className="rounded bg-stone px-2 py-1 text-xs">{client.adminId}</code></td><td><p>{money(client.availableBalance)}</p><p className="text-xs text-slate-400">Referral {money(client.referralBalance)}</p></td><td><StatusBadge status={client.status} /></td><td className="pr-6 text-right">{superAdmin ? <span className="text-xs font-bold text-gold">Open control center</span> : <button onClick={(event) => { event.stopPropagation(); toggle(client); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:border-gold">{client.status === "active" ? "Suspend" : "Reactivate"}</button>}</td></tr>)}</tbody></table></div>
      <Modal open={open} onClose={() => { setOpen(false); setInvitationLink(""); }} title="Invite sub-admin">{invitationLink ? <div><p className="text-sm leading-6 text-slate-500">Send this single-use invitation link to the intended administrator. It expires after 24 hours and requires MFA before administrative access.</p><input className="field mt-5" readOnly value={invitationLink} /><button onClick={() => navigator.clipboard.writeText(invitationLink)} className="btn-primary mt-4 w-full">Copy secure invitation</button></div> : <form onSubmit={createSubAdmin} className="space-y-4"><div><label className="label">Full name</label><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div><label className="label">Email</label><input className="field" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Phone</label><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><div><label className="label">Country</label><input className="field" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div></div><div><label className="label">Admin ID <span className="normal-case tracking-normal text-slate-300">(auto if blank)</span></label><input className="field" value={form.adminId} onChange={(e) => setForm({ ...form, adminId: e.target.value.toUpperCase() })} /></div><button className="btn-primary w-full">Create secure invitation</button></form>}</Modal>
    </div>
  );
}

function ApprovalTable({ type, embedded = false }) {
  const { user: actor } = useAuth();
  const { items, loading, load } = useAdminData(type); const title = type === "deposits" ? "Deposit queue" : "Withdrawal queue";
  const { format: money } = useCurrency();
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState("");
  async function decide(item, status, decisionReason) {
    if (type === "withdrawals" && status === "approved") {
      const user = await dataService.getUser(item.userId); const field = item.type === "referral" ? "referralBalance" : "availableBalance";
      if ((user[field] || 0) < item.amount) return window.alert("The user's current balance is insufficient for this approval.");
      await dataService.updateUser(item.userId, { [field]: user[field] - item.amount });
    }
    if (type === "deposits" && status === "approved" && !item.investmentId) {
      const user = await dataService.getUser(item.userId);
      await dataService.updateUser(item.userId, {
        availableBalance: Number(user.availableBalance || 0) + Number(item.amount),
      });
    }
    if (type === "deposits" && status === "approved") await approveInvestmentDeposit(item);
    if (type === "deposits" && status === "rejected") await rejectInvestmentDeposit(item);
    const reviewedAt = new Date().toISOString();
    const changes = status === "approved"
      ? { status, reviewedAt, approvedAt: reviewedAt, approvedBy: actor.userId }
      : status === "rejected"
        ? { status, reviewedAt, declineReason: decisionReason, declinedAt: reviewedAt, declinedBy: actor.userId }
        : { status, reviewedAt };
    await dataService.update(type, item.id, changes);
    if (type === "withdrawals" && ["approved", "rejected"].includes(status)) await createNotification({ userId: item.userId, adminId: item.adminId, type: "withdrawal", title: `Withdrawal ${status}`, message: `${money(item.amount)} ${item.type} withdrawal was ${status}. Reason: ${decisionReason}` });
    if (type === "deposits" && !item.investmentId && ["approved", "rejected"].includes(status)) await createNotification({ userId: item.userId, adminId: item.adminId, type: "deposit", title: `Deposit ${status}`, message: `${money(item.amount)} deposit was ${status}. Reason: ${decisionReason}` });
    const log = { userId: item.userId, adminId: item.adminId, type: `${type === "deposits" ? "deposit" : "withdrawal"}_${status}`, label: `${type === "deposits" ? "Deposit" : "Withdrawal"} ${status}`, amount: item.amount, status, reason: decisionReason, adminActorId: actor.userId, adminActorName: actor.name, targetId: item.id };
    await Promise.all([dataService.log(log), dataService.create("adminAuditRecords", log)]);
    load();
  }
  async function submitDecision(event) {
    event.preventDefault();
    if (!reason.trim()) return;
    await decide(decision.item, decision.status, reason.trim());
    setDecision(null);
    setReason("");
  }
  const sorted = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return (
    <div>{!embedded && <PageHeader eyebrow="Financial operations" title={title} description="Review evidence and account details before recording a decision." action={<button onClick={load} className="btn-secondary bg-white text-navy"><RefreshCw size={15} /> Refresh</button>} />}
      {embedded && <div className="mb-4 flex justify-end"><button onClick={load} className="btn-secondary bg-white py-2 text-navy"><RefreshCw size={15} /> Refresh</button></div>}
      {loading ? <div className="glass-card grid h-48 place-items-center"><RefreshCw className="animate-spin text-gold" /></div> : sorted.length ? <div className="glass-card table-scroll overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr className="bg-navy text-left text-[10px] uppercase tracking-widest text-white/45"><th className="px-6 py-5">Client</th><th>{type === "deposits" ? "Method / reference" : "Type / destination"}</th><th>Amount</th><th>Status</th><th>Date</th><th className="pr-6 text-right">Decision</th></tr></thead><tbody>{sorted.map((item) => <tr key={item.id} className="border-b border-slate-100 text-sm last:border-0"><td className="px-6 py-5 font-bold text-navy">{item.userName}</td><td><p>{type === "deposits" ? item.methodName : `${item.type} withdrawal`}</p><p className="mt-1 max-w-56 truncate text-xs text-slate-400">{type === "deposits" ? item.reference : item.accountDetails}</p>{item.proofUrl && <a href={item.proofUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs font-bold text-gold">View payment proof</a>}</td><td className="font-bold text-navy">{money(item.amount)}</td><td><StatusBadge status={item.status} /></td><td className="text-slate-500">{date(item.createdAt)}</td><td className="pr-6 text-right">{item.status === "pending" ? <div className="flex justify-end gap-2"><button title="Approve" onClick={() => setDecision({ item, status: "approved" })} className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700"><Check size={16} /></button>{type === "withdrawals" && <button title="Hold" onClick={() => setDecision({ item, status: "hold" })} className="rounded-lg bg-blue-50 p-2.5 text-blue-700"><Clock3 size={16} /></button>}<button title="Reject" onClick={() => setDecision({ item, status: "rejected" })} className="rounded-lg bg-red-50 p-2.5 text-red-700"><X size={16} /></button></div> : <span className="text-xs text-slate-400">Reviewed</span>}</td></tr>)}</tbody></table></div> : <EmptyState icon={type === "deposits" ? ArrowDownToLine : ArrowUpFromLine} title={`No ${type} found`} text="New requests will appear here as soon as clients submit them." />}
      <Modal open={Boolean(decision)} onClose={() => { setDecision(null); setReason(""); }} title={`${decision?.status || ""} ${type === "deposits" ? "deposit" : "withdrawal"}`}><form onSubmit={submitDecision} className="space-y-4"><p className="text-sm text-slate-500">A reason is required and will be written to the audit trail.</p><div><label className="label">Reason</label><textarea className="field min-h-28" required value={reason} onChange={(event) => setReason(event.target.value)} /></div><button disabled={!reason.trim()} className="btn-primary w-full">Confirm decision</button></form></Modal>
    </div>
  );
}

export const DepositsAdminPage = () => <ApprovalTable type="deposits" />;
export const WithdrawalsAdminPage = () => <ApprovalTable type="withdrawals" />;

export function ApprovalsAdminPage() {
  const [active, setActive] = useState("deposits");
  return <div>
    <PageHeader eyebrow="Financial operations" title="Approvals" description="Review deposit and withdrawal requests from one queue." />
    <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm sm:inline-grid sm:min-w-[360px]">
      <button onClick={() => setActive("deposits")} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${active === "deposits" ? "bg-navy text-white" : "text-slate-500"}`}><ArrowDownToLine size={16} /> Deposits</button>
      <button onClick={() => setActive("withdrawals")} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${active === "withdrawals" ? "bg-navy text-white" : "text-slate-500"}`}><ArrowUpFromLine size={16} /> Withdrawals</button>
    </div>
    <ApprovalTable type={active} embedded />
  </div>;
}

export function DepositMethodsPage() {
  const { user } = useAuth(); const { items, load } = useAdminData("depositMethods"); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Crypto", label: "", details: "", extraInfo: "", active: true, file: null });
  async function create(event) { event.preventDefault(); setBusy(true); const iconUrl = await uploadToCloudinary(form.file); await dataService.create("depositMethods", { adminId: user.adminId === "GLOBAL" ? "HERITAGE-HQ" : user.adminId, name: form.name, type: form.type, label: form.label, details: form.details, extraInfo: form.extraInfo, active: form.active, iconUrl }); setBusy(false); setOpen(false); load(); }
  async function toggle(item) { await dataService.update("depositMethods", item.id, { active: !item.active }); load(); }
  async function remove(item) { if (window.confirm(`Delete ${item.name}?`)) { await dataService.remove("depositMethods", item.id); load(); } }
  return (
    <div><PageHeader eyebrow="Funding configuration" title="Deposit methods" description="Manage the payment addresses and accounts visible to clients in your administrative scope." action={<button onClick={() => setOpen(true)} className="btn-primary"><Plus size={16} /> Add method</button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <div key={item.id} className="glass-card p-6"><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-navy text-gold">{item.iconUrl ? <img src={item.iconUrl} className="h-full w-full object-cover" /> : <CreditCard />}</span><StatusBadge status={item.active ? "active" : "suspended"} /></div><h3 className="display-title mt-6 text-2xl text-navy">{item.name}</h3><p className="mt-1 text-xs text-slate-400">{item.type} · {item.label}</p><code className="mt-5 block break-all rounded-xl bg-stone p-3 text-xs text-slate-600">{item.details}</code><div className="mt-5 flex gap-2"><button onClick={() => toggle(item)} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">{item.active ? "Deactivate" : "Activate"}</button><button onClick={() => remove(item)} className="rounded-xl bg-red-50 p-2.5 text-red-600"><Trash2 size={16} /></button></div></div>)}</div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add deposit method"><form onSubmit={create} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Method name</label><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div><label className="label">Type</label><select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Crypto</option><option>Bank</option><option>Mobile Money</option><option>Other</option></select></div></div><div><label className="label">Display label</label><input className="field" required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div><div><label className="label">Address / account details</label><textarea className="field min-h-24" required value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div><div><label className="label">Additional instructions</label><textarea className="field min-h-20" value={form.extraInfo} onChange={(e) => setForm({ ...form, extraInfo: e.target.value })} /></div><label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-5 text-center"><Upload className="mx-auto text-gold" /><span className="mt-2 block text-xs font-bold text-navy">{form.file ? form.file.name : "Upload method icon"}</span><input hidden type="file" accept="image/*" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} /></label><button disabled={busy} className="btn-primary w-full">{busy ? "Saving..." : "Save deposit method"}</button></form></Modal>
    </div>
  );
}

export function AdminReferralsPage() {
  const { items: users } = useAdminData("users");
  const referrals = useMemo(() => users.filter((item) => item.role === "user" && item.referredBy), [users]);
  return (
    <div><PageHeader eyebrow="Network activity" title="Referral activity" description="Review introductions and bonus readiness across your client scope." />
      <div className="grid gap-4 sm:grid-cols-3">{[["Introduced clients", referrals.length, Users], ["Active accounts", referrals.filter((item) => item.status === "active").length, Check], ["Bonuses", "Phase 2 trigger", CircleDollarSign]].map(([label, value, Icon]) => <div key={label} className="glass-card p-6"><Icon className="text-gold" /><p className="display-title mt-5 text-3xl text-navy">{value}</p><p className="mt-1 text-xs uppercase tracking-widest text-slate-400">{label}</p></div>)}</div>
      <div className="glass-card mt-6 table-scroll overflow-x-auto"><table className="w-full min-w-[650px]"><thead><tr className="bg-navy text-left text-[10px] uppercase tracking-widest text-white/45"><th className="px-6 py-5">Client</th><th>Referred by code</th><th>Joined</th><th>Week 1 bonus</th></tr></thead><tbody>{referrals.map((item) => <tr key={item.userId} className="border-b border-slate-100 text-sm"><td className="px-6 py-5 font-bold text-navy">{item.name}</td><td><code>{item.referredBy}</code></td><td>{date(item.createdAt)}</td><td className="text-slate-400">Waiting for Phase 2 investment approval</td></tr>)}</tbody></table></div>
    </div>
  );
}

export function OnboardingLinksPage() {
  const { items: users } = useAdminData("users"); const admins = users.filter((item) => item.role === "sub-admin");
  return <div><PageHeader eyebrow="Advisor network" title="Onboarding links" description="Dedicated links bind new registrations to the correct administrative scope." /><div className="grid gap-4">{admins.map((admin) => { const link = `${window.location.origin}/register?admin=${admin.adminId}`; return <div key={admin.userId} className="glass-card flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center"><div><p className="font-bold text-navy">{admin.name}</p><p className="mt-1 text-xs text-slate-400">{admin.adminId}</p></div><div className="flex min-w-0 flex-1 gap-2 md:max-w-2xl"><input readOnly className="field min-w-0 bg-stone" value={link} /><button onClick={() => navigator.clipboard.writeText(link)} className="btn-primary shrink-0"><Link2 size={16} /> Copy</button></div></div>; })}</div></div>;
}

export function PlatformBrandingPage() {
  const [logo, setLogo] = useState(""); const [file, setFile] = useState(null); const [recordId, setRecordId] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { dataService.list("platformSettings", "GLOBAL", true).then((items) => { const settings = items.find((item) => item.key === "branding"); if (settings) { setLogo(settings.logoUrl || ""); setRecordId(settings.id); } }); }, []);
  async function save() { if (!file) return; setBusy(true); const logoUrl = await uploadToCloudinary(file); if (recordId) await dataService.update("platformSettings", recordId, { logoUrl }); else { const created = await dataService.create("platformSettings", { adminId: "GLOBAL", key: "branding", logoUrl }); setRecordId(created.id); } setLogo(logoUrl); setBusy(false); }
  return <div><PageHeader eyebrow="Platform identity" title="Platform branding" description="Upload the production logo through Cloudinary and retain its secure URL in platform settings." /><div className="glass-card max-w-2xl p-7"><div className="grid h-48 place-items-center rounded-2xl bg-navy">{logo ? <img src={logo} alt="Platform logo" className="max-h-28 max-w-[70%] object-contain" /> : <div className="text-center text-gold"><ShieldCheck className="mx-auto" size={42} /><p className="mt-3 font-display text-xl font-bold">Logo placeholder</p></div>}</div><label className="mt-6 block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-6 text-center"><Upload className="mx-auto text-gold" /><span className="mt-2 block text-sm font-bold text-navy">{file ? file.name : "Choose logo image"}</span><input hidden type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} /></label><button disabled={!file || busy} onClick={save} className="btn-primary mt-5 w-full">{busy ? "Uploading..." : "Upload platform logo"}</button></div></div>;
}
