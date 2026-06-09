import { useCallback, useEffect, useState } from "react";
import { Bell, Check, ChevronRight, FileText, LifeBuoy, MessageSquare, Search, Send, ShieldCheck, Trash2, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { uploadToCloudinary } from "../lib/cloudinary";
import { ticketId } from "../lib/enterprise";
import { submitKyc } from "../lib/securityApi";
import { EmptyState, Modal, PageHeader, StatusBadge } from "../components/UI";

const dateTime = (value) => value ? new Date(value).toLocaleString() : "";

export function KycPage() {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(1);
  const [existing, setExisting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    legalName: user.name || "", dateOfBirth: "", nationality: user.country || "", address: "",
    idType: "Passport", idFront: null, idBack: null, selfie: null, proofOfAddress: null,
  });
  useEffect(() => { dataService.listForUser("kycSubmissions", user.userId).then((items) => setExisting(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null)); }, [user.userId]);

  async function submit() {
    if (!form.idFront || !form.idBack || !form.selfie || !form.proofOfAddress) {
      window.alert("Please upload all four required KYC documents.");
      return;
    }
    setBusy(true);
    try {
      const [idFront, idBack, selfie, proofOfAddress] = await Promise.all([
        uploadToCloudinary(form.idFront), uploadToCloudinary(form.idBack),
        uploadToCloudinary(form.selfie), uploadToCloudinary(form.proofOfAddress),
      ]);
      const payload = {
        userId: user.userId, userName: user.name, adminId: user.adminId,
        legalName: form.legalName, dateOfBirth: form.dateOfBirth, nationality: form.nationality,
        address: form.address, idType: form.idType, documents: { idFront, idBack, selfie, proofOfAddress },
        status: "pending", rejectionReason: "", requestDetails: "",
      };
      await submitKyc(payload);
      await refresh();
      setExisting({ ...payload, status: "pending" });
    } finally { setBusy(false); }
  }

  if (user.kycStatus === "verified") return <div><PageHeader eyebrow="Identity verification" title="KYC verification" /><div className="glass-card mx-auto max-w-xl p-10 text-center"><ShieldCheck className="mx-auto text-forest" size={52} /><h2 className="display-title mt-5 text-3xl text-navy">Identity verified</h2><p className="mt-3 text-sm text-slate-500">Your Stonehaven profile has full withdrawal access.</p></div></div>;
  if (user.kycStatus === "pending" || existing?.status === "pending") return <div><PageHeader eyebrow="Identity verification" title="KYC verification" /><div className="glass-card mx-auto max-w-xl p-10 text-center"><FileText className="mx-auto text-gold" size={48} /><h2 className="display-title mt-5 text-3xl text-navy">Under review</h2><p className="mt-3 text-sm leading-6 text-slate-500">Your documents are in the compliance review queue. You will receive a notification when a decision is recorded.</p></div></div>;

  const fileField = (key, label) => <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-5 text-center hover:border-gold"><Upload className="mx-auto text-gold" /><span className="mt-2 block text-sm font-bold text-navy">{form[key]?.name || label}</span><input hidden type="file" accept="image/*,.pdf" onChange={(event) => setForm({ ...form, [key]: event.target.files[0] })} /></label>;
  return <div><PageHeader eyebrow="Identity verification" title="Complete your KYC" description="Secure identity review unlocks full withdrawal access and protects your account." />{(user.kycStatus === "rejected" || existing?.status === "rejected") && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><strong>Previous submission rejected:</strong> {existing?.rejectionReason || "Please review and resubmit your documents."}</div>}
  {/* Responsive step indicator */}
  {/* Desktop View */}
  <div className="hidden sm:grid sm:grid-cols-4 gap-2 mb-6">
    {["Personal", "Identity", "Address", "Submit"].map((label, index) => (
      <div key={label} className={`rounded-xl px-3 py-3 text-center text-xs font-bold ${step >= index + 1 ? "bg-navy text-white" : "bg-white text-slate-400"}`}>
        {index + 1}. {label}
      </div>
    ))}
  </div>
  {/* Mobile View */}
  <div className="sm:hidden mb-6 flex flex-col gap-2 rounded-xl bg-white p-4 border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between text-xs">
      <span className="font-bold text-navy">Step {step} of 4</span>
      <span className="font-semibold text-gold">
        {{ 1: "Personal Details", 2: "Identity Documents", 3: "Proof of Address", 4: "Review & Submit" }[step]}
      </span>
    </div>
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div 
        className="h-full rounded-full bg-navy transition-all duration-300"
        style={{ width: `${(step / 4) * 100}%` }}
      />
    </div>
  </div>
  <div className="glass-card p-6 md:p-8">{step === 1 && <div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><label className="label">Full legal name</label><input className="field" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} /></div><div><label className="label">Date of birth</label><input className="field" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div><div><label className="label">Nationality</label><input className="field" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></div><div className="sm:col-span-2"><label className="label">Residential address</label><textarea className="field min-h-24" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div></div>}{step === 2 && <div><label className="label">ID type</label><select className="field mb-5" value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })}><option>Passport</option><option>National ID</option><option>Driver's License</option></select><div className="grid gap-4 sm:grid-cols-3">{fileField("idFront", "Front of ID")}{fileField("idBack", "Back of ID")}{fileField("selfie", "Selfie holding ID")}</div></div>}{step === 3 && <div><h2 className="display-title text-2xl text-navy">Proof of address</h2><p className="mt-2 text-sm text-slate-500">Upload a utility bill or bank statement issued within the last three months.</p><div className="mt-6">{fileField("proofOfAddress", "Upload proof of address")}</div></div>}{step === 4 && <div><h2 className="display-title text-2xl text-navy">Review and submit</h2><div className="mt-5 grid gap-3 rounded-xl bg-stone p-5 text-sm sm:grid-cols-2"><p><span className="text-slate-400">Legal name:</span><br /><strong>{form.legalName}</strong></p><p><span className="text-slate-400">Nationality:</span><br /><strong>{form.nationality}</strong></p><p><span className="text-slate-400">ID type:</span><br /><strong>{form.idType}</strong></p><p><span className="text-slate-400">Documents:</span><br /><strong>4 selected</strong></p></div></div>}<div className="mt-8 flex justify-between"><button disabled={step === 1} onClick={() => setStep(step - 1)} className="btn-secondary text-navy disabled:opacity-30">Back</button>{step < 4 ? <button onClick={() => setStep(step + 1)} className="btn-primary">Continue <ChevronRight size={16} /></button> : <button disabled={busy} onClick={submit} className="btn-primary">{busy ? "Uploading securely..." : "Submit for review"}</button>}</div></div></div>;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const load = useCallback(() => dataService.listForUser("notifications", user.userId).then((result) => setItems(result.filter((item) => !item.dismissed).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))), [user.userId]);
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, [load]);
  const filtered = filter === "all" ? items : items.filter((item) => item.type === filter || item.type?.startsWith(filter));
  async function updateAll(changes) { await Promise.all(items.map((item) => dataService.update("notifications", item.id, changes))); load(); }
  return <div><PageHeader eyebrow="Client communications" title="Notifications" description="Account events, compliance decisions, support replies, and platform announcements." action={<div className="flex gap-2"><button onClick={() => updateAll({ read: true })} className="btn-secondary bg-white text-navy">Mark all read</button><button onClick={() => updateAll({ dismissed: true })} className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600">Delete all</button></div>} /><div className="mb-5 flex flex-wrap gap-2">{["all", "investment", "deposit", "withdrawal", "referral", "announcement", "kyc", "support"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${filter === item ? "bg-navy text-white" : "bg-white text-slate-500"}`}>{item}</button>)}</div>{filtered.length ? <div className="space-y-3">{filtered.map((item) => <div key={item.id} className={`glass-card flex gap-4 p-5 ${!item.read ? "border-gold/60" : ""}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold"><Bell size={18} /></span><button className="min-w-0 flex-1 text-left" onClick={async () => { await dataService.update("notifications", item.id, { read: true }); load(); }}><div className="flex items-center gap-2"><p className="font-bold text-navy">{item.title}</p>{!item.read && <span className="h-2 w-2 rounded-full bg-burgundy" />}</div><p className="mt-1 text-sm leading-6 text-slate-500">{item.message}</p><p className="mt-2 text-[10px] uppercase tracking-widest text-slate-400">{dateTime(item.createdAt)}</p></button><button onClick={async () => { await dataService.update("notifications", item.id, { dismissed: true }); load(); }} className="text-slate-300 hover:text-red-500"><Trash2 size={17} /></button></div>)}</div> : <EmptyState icon={Bell} title="No notifications" text="New account events and messages will appear here." />}</div>;
}

export function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "Account", message: "" });
  const [reply, setReply] = useState("");
  const [bottomRef, setBottomRef] = useState(null);

  const load = useCallback(() => dataService.listForUser("supportTickets", user.userId).then((items) => { const sorted = items.filter((item) => !item.deletedForUser).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); setTickets(sorted); setSelected((current) => current ? sorted.find((item) => item.id === current.id) || null : null); }), [user.userId]);
  
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (selected && bottomRef) {
      bottomRef.scrollIntoView({ behavior: "smooth" });
    }
  }, [selected?.messages?.length, bottomRef]);

  async function create(event) { event.preventDefault(); const first = { id: `msg-${Date.now()}`, senderId: user.userId, senderName: user.name, senderRole: "user", senderPhotoUrl: user.profilePhotoUrl || "", message: form.message, createdAt: new Date().toISOString() }; await dataService.create("supportTickets", { ticketId: ticketId(), userId: user.userId, userName: user.name, userPhotoUrl: user.profilePhotoUrl || "", adminId: user.adminId, subject: form.subject, category: form.category, status: "open", messages: [first], adminUnread: true, userUnread: false }); setOpen(false); setForm({ subject: "", category: "Account", message: "" }); load(); }
  async function sendReply(event) { event.preventDefault(); if (!reply.trim()) return; const messages = [...(selected.messages || []), { id: `msg-${Date.now()}`, senderId: user.userId, senderName: user.name, senderRole: "user", senderPhotoUrl: user.profilePhotoUrl || "", message: reply, createdAt: new Date().toISOString() }]; await dataService.update("supportTickets", selected.id, { messages, userPhotoUrl: user.profilePhotoUrl || "", adminUnread: true, updatedAt: new Date().toISOString() }); setReply(""); load(); setSelected({ ...selected, messages }); }
  
  return (
    <div>
      <PageHeader
        eyebrow="Human client service"
        title="Support center"
        description="Secure, real-human assistance from your assigned Stonehaven team."
        action={<button onClick={() => setOpen(true)} className="btn-primary"><MessageSquare size={16} /> Open ticket</button>}
      />
      <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
        {/* Ticket List View (hidden on mobile when a ticket is selected) */}
        <div className={`space-y-3 lg:block ${selected ? "hidden lg:block" : "block"}`}>
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={async () => { setSelected(ticket); await dataService.update("supportTickets", ticket.id, { userUnread: false }); }}
              className={`glass-card w-full p-5 text-left transition ${selected?.id === ticket.id ? "border-gold ring-4 ring-gold/10" : "hover:border-slate-300"}`}
            >
              <div className="flex justify-between gap-3">
                <p className="font-bold text-navy">{ticket.subject}</p>
                <StatusBadge status={ticket.status} />
              </div>
              <p className="mt-2 text-xs text-slate-400">{ticket.ticketId} · {ticket.category}</p>
            </button>
          ))}
          {!tickets.length && <EmptyState icon={LifeBuoy} title="No support tickets" text="Open a ticket when you need assistance from the Stonehaven team." />}
        </div>

        {/* Chat Conversation View (hidden on mobile when no ticket is selected) */}
        <div className={`glass-card flex min-h-[520px] flex-col overflow-hidden lg:flex ${selected ? "flex" : "hidden lg:flex"}`}>
          {selected ? (
            <>
              <div className="border-b border-slate-200 bg-white/50 p-5">
                <div className="flex items-center gap-3 lg:hidden mb-3">
                  <button
                    onClick={() => setSelected(null)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-gold hover:text-[#b0914e]"
                  >
                    ← Back to tickets
                  </button>
                </div>
                <p className="font-display text-2xl font-bold text-navy">{selected.subject}</p>
                <p className="text-xs text-slate-400">{selected.ticketId} · {selected.category}</p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-stone/30 p-5">
                {selected.messages?.map((message) => {
                  const isUser = message.senderRole === "user";
                  return (
                    <div key={message.id} className={`flex items-start gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                      {!isUser && (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/10 text-xs font-bold text-gold mt-0.5">
                          S
                        </span>
                      )}
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed ${
                        isUser
                          ? "bg-navy text-white rounded-tr-none"
                          : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                      }`}>
                        <p className="break-words whitespace-pre-wrap">{message.message}</p>
                        <span className={`mt-1.5 block text-[9px] ${isUser ? "text-white/40 text-right" : "text-slate-400"}`}>
                          {!isUser && "Advisor · "}{dateTime(message.createdAt)}
                        </span>
                      </div>
                      {isUser && (
                        message.senderPhotoUrl || selected.userPhotoUrl ? (
                          <img src={message.senderPhotoUrl || selected.userPhotoUrl} alt="" className="h-8 w-8 rounded-full object-cover mt-0.5 shrink-0" />
                        ) : (
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-[10px] font-bold text-gold mt-0.5">
                            {message.senderName?.charAt(0)}
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
                <div ref={setBottomRef} />
              </div>

              <form onSubmit={sendReply} className="flex gap-2 border-t border-slate-200 bg-white p-4">
                <input
                  className="field flex-1"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply..."
                />
                <button className="btn-primary px-5 py-3 min-h-[44px]">
                  <Send size={17} />
                </button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center bg-white/40 text-center p-6">
              <div>
                <LifeBuoy className="mx-auto text-slate-300 mb-3" size={38} />
                <p className="text-sm font-medium text-slate-400">Select a ticket to view the conversation.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Open support ticket">
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="label">Subject</label>
            <input className="field" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>Account</option>
              <option>Deposit</option>
              <option>Withdrawal</option>
              <option>Investment</option>
              <option>KYC</option>
              <option>Technical</option>
            </select>
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="field min-h-32" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <button className="btn-primary w-full">Create ticket</button>
        </form>
      </Modal>
    </div>
  );
}

export function CompanyPage() {
  const [company, setCompany] = useState(null); const [team, setTeam] = useState([]);
  useEffect(() => { Promise.all([dataService.list("companyContent", "GLOBAL", true), dataService.list("teamMembers", "GLOBAL", true)]).then(([content, members]) => { setCompany(content.find((item) => item.key === "overview")); setTeam(members.filter((item) => item.visible).sort((a, b) => a.displayOrder - b.displayOrder)); }); }, []);
  return <div className="min-h-screen bg-stone"><section className="bg-navy px-5 py-24 text-white"><div className="mx-auto max-w-6xl"><p className="section-kicker">Our institution</p><h1 className="display-title mt-4 max-w-4xl text-5xl md:text-7xl">{company?.title || "Stonehaven Investment Group"}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-white/55">{company?.overview}</p></div></section><main className="mx-auto max-w-6xl px-5 py-20"><div className="grid gap-4 sm:grid-cols-3">{company?.stats?.map((stat) => <div key={stat.label} className="glass-card p-7 text-center"><p className="display-title text-4xl text-navy">{stat.value}</p><p className="mt-2 text-xs uppercase tracking-widest text-slate-400">{stat.label}</p></div>)}</div><section className="mt-20"><p className="section-kicker">Leadership</p><h2 className="display-title mt-3 text-4xl text-navy">A tradition of considered leadership.</h2><div className="mt-10 grid gap-6 md:grid-cols-2">{team.map((member) => <div key={member.id} className="glass-card overflow-hidden"><div className="grid md:grid-cols-[160px_1fr]"><div className="grid min-h-44 place-items-center bg-navy text-gold">{member.photoUrl ? <img src={member.photoUrl} className="h-full w-full object-cover" /> : <span className="font-display text-5xl">{member.name[0]}</span>}</div><div className="p-6"><h3 className="display-title text-2xl text-navy">{member.name}</h3><p className="text-xs font-bold uppercase tracking-widest text-gold">{member.position}</p><p className="mt-4 text-sm italic text-slate-500">“{member.quote}”</p><p className="mt-4 text-xs text-slate-400">{member.location} · {member.education}</p></div></div></div>)}</div></section><section className="mt-20 grid gap-6 md:grid-cols-2"><div className="rounded-2xl bg-navy p-8 text-white"><h2 className="display-title text-3xl">Our values</h2><div className="mt-6 flex flex-wrap gap-3">{company?.values?.map((value) => <span key={value} className="rounded-full border border-gold/30 px-4 py-2 text-sm text-gold">{value}</span>)}</div></div><div className="glass-card p-8"><h2 className="display-title text-3xl text-navy">Global offices</h2><div className="mt-6 grid grid-cols-2 gap-3">{company?.offices?.map((office) => <div key={office} className="rounded-xl bg-stone p-4 text-sm font-bold text-navy">{office}</div>)}</div></div></section></main></div>;
}
