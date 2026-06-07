import { useCallback, useEffect, useState } from "react";
import { BarChart3, Bell, Building2, Check, Edit3, Eye, FileText, LifeBuoy, Megaphone, Plus, RefreshCw, Save, Send, Settings, ShieldCheck, Trash2, Upload, Users, X, ZoomIn, ZoomOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { uploadToCloudinary } from "../lib/cloudinary";
import { createNotification, getPlatformSettings, notifySupportReply, publishAnnouncement, savePlatformSettings } from "../lib/enterprise";
import { seedTestimonials } from "../data/demo";
import { EmptyState, Modal, PageHeader, StatusBadge } from "../components/UI";
import { MiniBarChart, money } from "../components/InvestmentUI";

function useScoped(name) {
  const { user } = useAuth(); const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setItems(await dataService.list(name, user.adminId, user.role === "superadmin")); setLoading(false); }, [name, user.adminId, user.role]);
  useEffect(() => { load(); }, [load]);
  return { items, loading, load, user };
}

export function KycReviewPage() {
  const { items, load } = useScoped("kycSubmissions"); const [status, setStatus] = useState("pending"); const [selected, setSelected] = useState(null); const [document, setDocument] = useState(""); const [zoom, setZoom] = useState(1);
  const filtered = items.filter((item) => status === "all" || item.status === status);
  async function decide(item, nextStatus) {
    let reason = ""; let requestDetails = "";
    if (nextStatus === "rejected") reason = window.prompt("Rejection reason") || "";
    if (nextStatus === "more-info") requestDetails = window.prompt("What additional document or information is required?") || "";
    if ((nextStatus === "rejected" && !reason) || (nextStatus === "more-info" && !requestDetails)) return;
    const storedStatus = nextStatus === "more-info" ? "rejected" : nextStatus;
    await dataService.update("kycSubmissions", item.id, { status: storedStatus, rejectionReason: reason, requestDetails, reviewedAt: new Date().toISOString() });
    await dataService.updateUser(item.userId, { kycStatus: storedStatus });
    await createNotification({ userId: item.userId, adminId: item.adminId, type: "kyc", title: nextStatus === "approved" ? "KYC approved" : nextStatus === "more-info" ? "Additional KYC document requested" : "KYC rejected", message: nextStatus === "approved" ? "Your identity is verified and full withdrawal access is enabled." : requestDetails || reason });
    await dataService.log({ userId: item.userId, adminId: item.adminId, type: `kyc_${storedStatus}`, label: `KYC ${storedStatus}`, amount: 0, status: storedStatus });
    setSelected(null); load();
  }
  return <div><PageHeader eyebrow="Compliance operations" title="KYC review" description="Review identity evidence for users within your administrative scope." action={<button onClick={load} className="btn-secondary bg-white text-navy"><RefreshCw size={15} /> Refresh</button>} /><div className="mb-5 flex gap-2">{["pending", "approved", "rejected", "all"].map((item) => <button key={item} onClick={() => setStatus(item)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${status === item ? "bg-navy text-white" : "bg-white text-slate-500"}`}>{item}</button>)}</div>{filtered.length ? <div className="glass-card table-scroll overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr className="bg-navy text-left text-[10px] uppercase tracking-widest text-white/45"><th className="px-6 py-4">User</th><th>Submitted</th><th>ID type</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-b border-slate-100 text-sm"><td className="px-6 py-5 font-bold text-navy">{item.userName}</td><td>{new Date(item.createdAt).toLocaleDateString()}</td><td>{item.idType}</td><td><StatusBadge status={item.status} /></td><td className="pr-6 text-right"><button onClick={() => setSelected(item)} className="btn-secondary bg-white py-2 text-navy"><Eye size={15} /> Review</button></td></tr>)}</tbody></table></div> : <EmptyState icon={ShieldCheck} title="No KYC submissions" text="Submissions matching this status will appear here." />}<Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={`${selected?.userName || ""} verification`}>{selected && <div><div className="grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-slate-400">Legal name</span><br /><strong>{selected.legalName}</strong></p><p><span className="text-slate-400">Date of birth</span><br /><strong>{selected.dateOfBirth}</strong></p><p><span className="text-slate-400">Nationality</span><br /><strong>{selected.nationality}</strong></p><p><span className="text-slate-400">Address</span><br /><strong>{selected.address}</strong></p></div><div className="mt-6 grid grid-cols-2 gap-3">{Object.entries(selected.documents || {}).map(([key, url]) => <button key={key} onClick={() => { setDocument(url); setZoom(1); }} className="rounded-xl border border-slate-200 p-4 text-left text-xs font-bold capitalize text-navy">{key.replace(/([A-Z])/g, " $1")}<span className="mt-1 block text-gold">View document</span></button>)}</div>{selected.status === "pending" && <div className="mt-6 grid gap-2 sm:grid-cols-3"><button onClick={() => decide(selected, "approved")} className="rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white">Approve</button><button onClick={() => decide(selected, "rejected")} className="rounded-xl bg-red-600 px-4 py-3 text-xs font-bold text-white">Reject</button><button onClick={() => decide(selected, "more-info")} className="rounded-xl bg-gold px-4 py-3 text-xs font-bold text-navy">Request more</button></div>}</div>}</Modal>{document && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-5"><div className="absolute right-5 top-5 flex gap-2"><button onClick={() => setZoom(Math.max(.5, zoom - .25))} className="rounded-lg bg-white p-3"><ZoomOut /></button><button onClick={() => setZoom(Math.min(3, zoom + .25))} className="rounded-lg bg-white p-3"><ZoomIn /></button><button onClick={() => setDocument("")} className="rounded-lg bg-white p-3"><X /></button></div><img src={document} className="max-h-[85vh] max-w-[90vw] object-contain transition" style={{ transform: `scale(${zoom})` }} /></div>}</div>;
}

export function AnnouncementsAdminPage() {
  const { items, load, user } = useScoped("announcements"); const [open, setOpen] = useState(false); const [editing, setEditing] = useState(null); const [form, setForm] = useState({ title: "", message: "", type: "info", audience: user.role === "superadmin" ? "all" : "admin-users", userId: "", scheduledAt: "", status: "draft" });
  function start(item = null) { setEditing(item); setForm(item ? { ...item } : { title: "", message: "", type: "info", audience: user.role === "superadmin" ? "all" : "admin-users", userId: "", scheduledAt: "", status: "draft" }); setOpen(true); }
  async function save(requestedStatus) {
    const status = requestedStatus === "draft" && form.scheduledAt ? "scheduled" : requestedStatus;
    const payload = { ...form, adminId: user.role === "superadmin" && form.audience === "all" ? "GLOBAL" : user.adminId, status, publishedAt: status === "published" ? new Date().toISOString() : form.publishedAt || "" };
    let announcement;
    if (editing) {
      await dataService.update("announcements", editing.id, payload);
      announcement = { ...editing, ...payload };
    } else {
      announcement = await dataService.create("announcements", payload);
    }
    if (status === "published") await publishAnnouncement(announcement);
    setOpen(false);
    load();
  }
  useEffect(() => {
    const due = items.filter((item) => item.status === "scheduled" && item.scheduledAt && new Date(item.scheduledAt) <= new Date());
    if (!due.length) return;
    Promise.all(due.map(async (item) => {
      const published = { ...item, status: "published", publishedAt: new Date().toISOString() };
      await dataService.update("announcements", item.id, published);
      await publishAnnouncement(published);
    })).then(load);
  }, [items, load]);
  return <div><PageHeader eyebrow="Client communications" title="Announcement center" description="Publish targeted operational, warning, and promotional messages." action={<button onClick={() => start()} className="btn-primary"><Plus size={16} /> Create announcement</button>} /><div className="grid gap-4">{items.map((item) => <div key={item.id} className="glass-card flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center"><div><div className="flex items-center gap-2"><StatusBadge status={item.status} /><span className="text-[10px] uppercase tracking-widest text-slate-400">{item.type} · {item.audience}</span></div><h2 className="display-title mt-3 text-2xl text-navy">{item.title}</h2><p className="mt-2 max-w-3xl text-sm text-slate-500">{item.message}</p></div><div className="flex gap-2"><button onClick={() => start(item)} className="btn-secondary bg-white py-2 text-navy"><Edit3 size={15} /> Edit</button><button onClick={async () => { await dataService.remove("announcements", item.id); load(); }} className="rounded-xl bg-red-50 p-3 text-red-600"><Trash2 size={16} /></button></div></div>)}</div><Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit announcement" : "Create announcement"}><div className="space-y-4"><div><label className="label">Title</label><input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div><label className="label">Message</label><textarea className="field min-h-32" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Type</label><select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>info</option><option>warning</option><option>promotion</option></select></div><div><label className="label">Audience</label><select className="field" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>{user.role === "superadmin" && <option value="all">All users</option>}<option value="admin-users">This admin's users</option><option value="individual">Individual user</option></select></div></div>{form.audience === "individual" && <div><label className="label">User ID</label><input className="field" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} /></div>}<div><label className="label">Schedule for later</label><input className="field" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div><div className="grid grid-cols-2 gap-3"><button onClick={() => save("draft")} className="btn-secondary text-navy">Save draft</button><button onClick={() => save("published")} className="btn-primary">Publish now</button></div></div></Modal></div>;
}

export function AdminSupportPage() {
  const { items, load, user } = useScoped("supportTickets"); const [selected, setSelected] = useState(null); const [reply, setReply] = useState(""); const [filter, setFilter] = useState("open");
  const filtered = items.filter((item) => filter === "all" || item.status === filter);
  useEffect(() => {
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [load]);
  async function send(event) { event.preventDefault(); if (!reply.trim()) return; const messages = [...(selected.messages || []), { id: `msg-${Date.now()}`, senderId: user.userId, senderName: user.name, senderRole: user.role, message: reply, createdAt: new Date().toISOString() }]; await dataService.update("supportTickets", selected.id, { messages, userUnread: true, adminUnread: false, status: selected.status === "open" ? "in progress" : selected.status, updatedAt: new Date().toISOString() }); await notifySupportReply(selected, user.role); setSelected({ ...selected, messages }); setReply(""); load(); }
  async function setStatus(status) { await dataService.update("supportTickets", selected.id, { status }); setSelected({ ...selected, status }); load(); }
  return <div><PageHeader eyebrow="Human client service" title="Support inbox" description="Reply to client tickets and manage resolution status." /><div className="mb-5 flex gap-2">{["open", "in progress", "resolved", "closed", "all"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${filter === item ? "bg-navy text-white" : "bg-white text-slate-500"}`}>{item}</button>)}</div><div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]"><div className="space-y-3">{filtered.map((ticket) => <button key={ticket.id} onClick={async () => { setSelected(ticket); await dataService.update("supportTickets", ticket.id, { adminUnread: false }); }} className={`glass-card w-full p-5 text-left ${selected?.id === ticket.id ? "border-gold" : ""}`}><div className="flex justify-between"><p className="font-bold text-navy">{ticket.subject}</p>{ticket.adminUnread && <span className="h-2 w-2 rounded-full bg-burgundy" />}</div><p className="mt-1 text-xs text-slate-400">{ticket.ticketId} · {ticket.userName}</p><div className="mt-3"><StatusBadge status={ticket.status} /></div></button>)}</div><div className="glass-card flex min-h-[540px] flex-col">{selected ? <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5"><div><h2 className="display-title text-2xl text-navy">{selected.subject}</h2><p className="text-xs text-slate-400">{selected.userName} · {selected.ticketId}</p></div><select className="field max-w-40" value={selected.status} onChange={(e) => setStatus(e.target.value)}><option>open</option><option>in progress</option><option>resolved</option><option>closed</option></select></div><div className="flex-1 space-y-4 overflow-y-auto p-5">{selected.messages?.map((message) => <div key={message.id} className={`flex ${message.senderRole === "user" ? "justify-start" : "justify-end"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${message.senderRole === "user" ? "bg-stone" : "bg-navy text-white"}`}><p>{message.message}</p><p className="mt-2 text-[9px] opacity-50">{message.senderName}</p></div></div>)}</div><form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-4"><input className="field" value={reply} onChange={(e) => setReply(e.target.value)} /><button className="btn-primary px-4"><Send size={16} /></button></form></> : <div className="grid flex-1 place-items-center text-slate-400">Select a ticket</div>}</div></div></div>;
}

export function TestimonialsAdminPage() {
  const { items, load } = useScoped("testimonials"); const [settings, setSettings] = useState(null); const [editing, setEditing] = useState(null);
  useEffect(() => { getPlatformSettings().then(setSettings); }, []);
  async function saveSettings(changes) { setSettings(await savePlatformSettings(settings, changes)); }
  async function initializePresets() { await Promise.all(seedTestimonials.map(({ id: _id, ...item }) => dataService.create("testimonials", item))); load(); }
  return <div><PageHeader eyebrow="Social proof" title="Testimonial notifications" description="Manage the shared landing-page toast and live-activity database." action={!items.length && <button onClick={initializePresets} className="btn-primary">Initialize 200 presets</button>} /><div className="glass-card mb-6 grid gap-4 p-6 sm:grid-cols-3"><label className="flex items-center justify-between rounded-xl bg-stone p-4 text-sm font-bold">Enabled<input type="checkbox" checked={settings?.testimonialEnabled ?? true} onChange={(e) => saveSettings({ testimonialEnabled: e.target.checked })} /></label><div><label className="label">Minimum interval</label><input className="field" type="number" value={settings?.testimonialMinInterval || 8} onChange={(e) => saveSettings({ testimonialMinInterval: Number(e.target.value) })} /></div><div><label className="label">Maximum interval</label><input className="field" type="number" value={settings?.testimonialMaxInterval || 15} onChange={(e) => saveSettings({ testimonialMaxInterval: Number(e.target.value) })} /></div></div><div className="glass-card table-scroll max-h-[650px] overflow-auto"><table className="w-full min-w-[700px]"><thead className="sticky top-0"><tr className="bg-navy text-left text-[10px] uppercase tracking-widest text-white/45"><th className="px-6 py-4">Name</th><th>Country</th><th>Activity</th><th>Status</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b border-slate-100 text-sm"><td className="px-6 py-4 font-bold">{item.name}</td><td>{item.country}</td><td>{item.message}</td><td><StatusBadge status={item.active ? "active" : "suspended"} /></td><td className="pr-5"><button onClick={() => setEditing(item)} className="text-gold"><Edit3 size={16} /></button></td></tr>)}</tbody></table></div><Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit activity notification">{editing && <div className="space-y-4"><input className="field" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /><input className="field" value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })} /><textarea className="field" value={editing.message} onChange={(e) => setEditing({ ...editing, message: e.target.value })} /><label className="flex gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label><button onClick={async () => { await dataService.update("testimonials", editing.id, editing); setEditing(null); load(); }} className="btn-primary w-full">Save</button></div>}</Modal></div>;
}

export function CompanyAdminPage() {
  const { items: contentItems, load: loadContent } = useScoped("companyContent"); const { items: team, load: loadTeam } = useScoped("teamMembers"); const content = contentItems.find((item) => item.key === "overview"); const [overview, setOverview] = useState(null); const [member, setMember] = useState(null); const [file, setFile] = useState(null);
  useEffect(() => { if (content) setOverview({ ...content, valuesText: content.values?.join(", "), officesText: content.offices?.join(", ") }); }, [content]);
  async function saveOverview() { await dataService.update("companyContent", overview.id, { title: overview.title, overview: overview.overview, values: overview.valuesText.split(",").map((item) => item.trim()), offices: overview.officesText.split(",").map((item) => item.trim()) }); loadContent(); }
  async function saveMember() { const photoUrl = file ? await uploadToCloudinary(file) : member.photoUrl; const payload = { ...member, photoUrl, adminId: "GLOBAL", displayOrder: Number(member.displayOrder || 1) }; if (member.id) await dataService.update("teamMembers", member.id, payload); else await dataService.create("teamMembers", payload); setMember(null); setFile(null); loadTeam(); }
  return <div><PageHeader eyebrow="Institutional identity" title="Company information" description="Manage the public company narrative, values, offices, and leadership." action={<button onClick={() => setMember({ name: "", position: "", location: "", previousCompanies: "", education: "", quote: "", linkedin: "", photoUrl: "", displayOrder: team.length + 1, visible: true })} className="btn-primary"><Plus size={16} /> Add leader</button>} />{overview && <div className="glass-card mb-6 p-6"><div className="grid gap-4"><input className="field" value={overview.title} onChange={(e) => setOverview({ ...overview, title: e.target.value })} /><textarea className="field min-h-28" value={overview.overview} onChange={(e) => setOverview({ ...overview, overview: e.target.value })} /><input className="field" value={overview.valuesText} onChange={(e) => setOverview({ ...overview, valuesText: e.target.value })} placeholder="Comma-separated values" /><input className="field" value={overview.officesText} onChange={(e) => setOverview({ ...overview, officesText: e.target.value })} placeholder="Comma-separated offices" /><button onClick={saveOverview} className="btn-primary w-fit"><Save size={16} /> Save overview</button></div></div>}<div className="grid gap-4 md:grid-cols-2">{team.map((item) => <div key={item.id} className="glass-card flex gap-5 p-5"><div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-navy text-gold">{item.photoUrl ? <img src={item.photoUrl} className="h-full w-full object-cover" /> : item.name[0]}</div><div className="min-w-0 flex-1"><h3 className="font-display text-xl font-bold text-navy">{item.name}</h3><p className="text-xs text-gold">{item.position}</p><p className="mt-2 text-xs text-slate-400">{item.location}</p><button onClick={() => setMember(item)} className="mt-4 text-xs font-bold text-gold">Edit profile</button></div></div>)}</div><Modal open={Boolean(member)} onClose={() => setMember(null)} title="Leadership profile">{member && <div className="space-y-3">{["name", "position", "location", "previousCompanies", "education", "quote", "linkedin"].map((field) => <input key={field} className="field" placeholder={field.replace(/([A-Z])/g, " $1")} value={member[field]} onChange={(e) => setMember({ ...member, [field]: e.target.value })} />)}<input className="field" type="number" value={member.displayOrder} onChange={(e) => setMember({ ...member, displayOrder: e.target.value })} /><label className="block rounded-xl border-2 border-dashed p-4 text-center"><Upload className="mx-auto text-gold" /><input className="mt-2 text-xs" type="file" onChange={(e) => setFile(e.target.files[0])} /></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={member.visible} onChange={(e) => setMember({ ...member, visible: e.target.checked })} /> Visible</label><button onClick={saveMember} className="btn-primary w-full">Save leader</button></div>}</Modal></div>;
}

export function ContentAdminPage() {
  const { items: faqs, load: loadFaqs } = useScoped("faqs"); const { items: legal, load: loadLegal } = useScoped("legalDocuments"); const [faq, setFaq] = useState(null); const [doc, setDoc] = useState(null);
  async function saveFaq() { const payload = { ...faq, adminId: "GLOBAL", order: Number(faq.order || 1) }; if (faq.id) await dataService.update("faqs", faq.id, payload); else await dataService.create("faqs", payload); setFaq(null); loadFaqs(); }
  async function saveDocument() { const versions = legal.filter((item) => item.type === doc.type); await dataService.create("legalDocuments", { adminId: "GLOBAL", type: doc.type, title: doc.title, content: doc.content, published: doc.published, version: Math.max(0, ...versions.map((item) => item.version)) + 1 }); setDoc(null); loadLegal(); }
  return <div><PageHeader eyebrow="Public content" title="Content management" description="Manage FAQs and versioned legal documents." action={<button onClick={() => setFaq({ category: "General", question: "", answer: "", order: faqs.length + 1, visible: true })} className="btn-primary"><Plus size={16} /> Add FAQ</button>} /><div className="grid gap-4">{faqs.sort((a, b) => a.order - b.order).map((item) => <div key={item.id} className="glass-card flex items-center justify-between gap-4 p-5"><div><p className="text-[10px] uppercase tracking-widest text-gold">{item.category} · #{item.order}</p><p className="mt-2 font-bold text-navy">{item.question}</p><p className="mt-1 text-sm text-slate-500">{item.answer}</p></div><button onClick={() => setFaq(item)}><Edit3 className="text-gold" size={17} /></button></div>)}</div><div className="mt-8 grid gap-5 md:grid-cols-2">{["terms", "privacy"].map((type) => { const versions = legal.filter((item) => item.type === type).sort((a, b) => b.version - a.version); const latest = versions[0]; return <div key={type} className="glass-card p-6"><FileText className="text-gold" /><h2 className="display-title mt-5 text-2xl capitalize text-navy">{type}</h2><p className="mt-2 text-xs text-slate-400">{versions.length} version(s) · Latest v{latest?.version || 0}</p><button onClick={() => setDoc({ type, title: latest?.title || type, content: latest?.content || "", published: true })} className="btn-primary mt-5">Create new version</button></div>; })}</div><Modal open={Boolean(faq)} onClose={() => setFaq(null)} title="FAQ editor">{faq && <div className="space-y-3"><input className="field" value={faq.category} onChange={(e) => setFaq({ ...faq, category: e.target.value })} /><input className="field" value={faq.question} onChange={(e) => setFaq({ ...faq, question: e.target.value })} /><textarea className="field min-h-28" value={faq.answer} onChange={(e) => setFaq({ ...faq, answer: e.target.value })} /><input className="field" type="number" value={faq.order} onChange={(e) => setFaq({ ...faq, order: e.target.value })} /><label className="flex gap-2 text-sm"><input type="checkbox" checked={faq.visible} onChange={(e) => setFaq({ ...faq, visible: e.target.checked })} /> Visible</label><button onClick={saveFaq} className="btn-primary w-full">Save FAQ</button></div>}</Modal><Modal open={Boolean(doc)} onClose={() => setDoc(null)} title="Legal document editor">{doc && <div className="space-y-3"><input className="field" value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} /><textarea className="field min-h-64" value={doc.content} onChange={(e) => setDoc({ ...doc, content: e.target.value })} /><label className="flex gap-2 text-sm"><input type="checkbox" checked={doc.published} onChange={(e) => setDoc({ ...doc, published: e.target.checked })} /> Publish this version</label><button onClick={saveDocument} className="btn-primary w-full">Save new version</button></div>}</Modal></div>;
}

export function PlatformSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getPlatformSettings().then(setSettings); }, []);
  async function save() {
    setBusy(true);
    try {
      const logoUrl = file ? await uploadToCloudinary(file) : settings.logoUrl;
      const referralBonuses = Object.fromEntries(
        Object.entries(settings.referralBonuses || {}).map(([capital, amount]) => [capital, Number(amount)]),
      );
      const changes = {
        ...settings,
        logoUrl,
        referralBonuses,
        unverifiedWithdrawalLimit: Number(settings.unverifiedWithdrawalLimit),
        testimonialMinInterval: Number(settings.testimonialMinInterval),
        testimonialMaxInterval: Number(settings.testimonialMaxInterval),
      };
      setSettings(await savePlatformSettings(settings, changes));
      setFile(null);
    } finally {
      setBusy(false);
    }
  }
  if (!settings) return <div className="glass-card p-8">Loading settings...</div>;
  return (
    <div>
      <PageHeader eyebrow="Global governance" title="Platform settings" description="Super-admin controls for platform identity, KYC, referrals, maintenance, and testimonials." />
      <div className="glass-card max-w-4xl p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Platform name</label>
            <input className="field" value={settings.platformName} onChange={(e) => setSettings({ ...settings, platformName: e.target.value })} />
          </div>
          <div>
            <label className="label">Unverified withdrawal limit</label>
            <input className="field" type="number" value={settings.unverifiedWithdrawalLimit} onChange={(e) => setSettings({ ...settings, unverifiedWithdrawalLimit: e.target.value })} />
          </div>
          <div>
            <label className="label">Platform logo</label>
            <input className="field" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          </div>
          {[["kycRequired", "KYC requirement"], ["withdrawalLimitEnabled", "Withdrawal limit"], ["referralEnabled", "Global referrals"], ["testimonialEnabled", "Testimonial notifications"], ["maintenanceMode", "Maintenance mode"]].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-xl bg-stone p-4 text-sm font-bold text-navy">
              {label}
              <input type="checkbox" checked={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} className="h-5 w-5 accent-[#C8A55A]" />
            </label>
          ))}
        </div>
        <div className="mt-7">
          <h2 className="display-title text-2xl text-navy">Referral bonuses</h2>
          <p className="mt-1 text-sm text-slate-500">Set the Week 1 bonus paid for each supported investment capital level.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {Object.entries(settings.referralBonuses || {}).map(([capital, amount]) => (
              <div key={capital}>
                <label className="label">${Number(capital).toLocaleString()} capital</label>
                <input
                  className="field"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setSettings({
                    ...settings,
                    referralBonuses: { ...settings.referralBonuses, [capital]: e.target.value },
                  })}
                />
              </div>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={busy} className="btn-primary mt-6">{busy ? "Saving..." : "Save platform settings"}</button>
      </div>
    </div>
  );
}

export function AnalyticsPage({ superAdmin = false }) {
  const { user } = useAuth(); const [data, setData] = useState({ users: [], deposits: [], withdrawals: [], investments: [], kyc: [], tickets: [] });
  useEffect(() => { Promise.all([dataService.listUsers(user.adminId, superAdmin), ...["deposits", "withdrawals", "investments", "kycSubmissions", "supportTickets"].map((name) => dataService.list(name, user.adminId, superAdmin))]).then(([users, deposits, withdrawals, investments, kyc, tickets]) => setData({ users, deposits, withdrawals, investments, kyc, tickets })); }, [user.adminId, superAdmin]);
  const cards = [["Total users", data.users.filter((item) => item.role === "user").length], ["Total deposited", money(data.deposits.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount, 0))], ["Total withdrawn", money(data.withdrawals.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount, 0))], ["Active plans", data.investments.filter((item) => ["active", "flash active"].includes(item.status)).length], ["KYC pending", data.kyc.filter((item) => item.status === "pending").length], ["Open tickets", data.tickets.filter((item) => ["open", "in progress"].includes(item.status)).length]];
  const chart = Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() - (6 - index)); const key = day.toISOString().slice(0, 10); return { label: day.toLocaleDateString("en-US", { weekday: "short" }), value: data.deposits.filter((item) => item.createdAt?.slice(0, 10) === key).reduce((sum, item) => sum + item.amount, 0) }; });
  const admins = data.users.filter((item) => item.role === "sub-admin");
  return <div><PageHeader eyebrow="Institutional analytics" title={superAdmin ? "Platform analytics" : "Advisor analytics"} description="Operational and portfolio intelligence across the permitted data scope." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{cards.map(([label, value]) => <div key={label} className="glass-card p-5"><p className="text-[9px] uppercase tracking-widest text-slate-400">{label}</p><p className="display-title mt-3 text-2xl text-navy">{value}</p></div>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><div className="glass-card p-7"><h2 className="display-title text-2xl text-navy">Daily deposits</h2><MiniBarChart values={chart} /></div><div className="glass-card p-7"><h2 className="display-title text-2xl text-navy">Plan distribution</h2><div className="mt-6 space-y-4">{["flash", "crypto", "stock"].map((type) => { const count = data.investments.filter((item) => item.type === type).length; return <div key={type}><div className="flex justify-between text-sm capitalize"><span>{type}</span><strong>{count}</strong></div><div className="mt-2 h-2 rounded bg-slate-100"><div className="h-full rounded bg-gold" style={{ width: `${data.investments.length ? count / data.investments.length * 100 : 0}%` }} /></div></div>; })}</div></div></div>{superAdmin && <div className="glass-card mt-6 table-scroll overflow-x-auto"><table className="w-full min-w-[700px]"><thead><tr className="bg-navy text-left text-[10px] uppercase tracking-widest text-white/45"><th className="px-6 py-4">Admin</th><th>Users</th><th>Deposits</th><th>Withdrawals</th><th>Status</th></tr></thead><tbody>{admins.map((admin) => <tr key={admin.userId} className="border-b border-slate-100 text-sm"><td className="px-6 py-5 font-bold">{admin.name}</td><td>{data.users.filter((item) => item.adminId === admin.adminId && item.role === "user").length}</td><td>{money(data.deposits.filter((item) => item.adminId === admin.adminId).reduce((sum, item) => sum + item.amount, 0))}</td><td>{money(data.withdrawals.filter((item) => item.adminId === admin.adminId).reduce((sum, item) => sum + item.amount, 0))}</td><td><StatusBadge status={admin.status} /></td></tr>)}</tbody></table></div>}</div>;
}
