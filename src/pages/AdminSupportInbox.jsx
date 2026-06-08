import { useCallback, useEffect, useState } from "react";
import { Archive, ArrowLeft, LifeBuoy, Send, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { notifySupportReply } from "../lib/enterprise";
import { EmptyState, Modal, PageHeader, StatusBadge } from "../components/UI";

function messageStamp(value) {
  if (!value) return "";
  const sent = new Date(value);
  return sent.toDateString() === new Date().toDateString()
    ? sent.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : sent.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function AdminSupportInbox() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState("open");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const result = await dataService.list("supportTickets", user.adminId, user.role === "superadmin");
    setItems(result);
    setSelected((current) => current ? result.find((item) => item.id === current.id) || null : null);
  }, [user.adminId, user.role]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const ticketId = new URLSearchParams(window.location.search).get("ticket");
    if (ticketId && items.length) setSelected(items.find((item) => item.id === ticketId) || null);
  }, [items]);

  const filtered = items.filter((item) =>
    !item.archivedForAdmin && (filter === "all" || item.status === filter)
  );

  async function openTicket(ticket) {
    setSelected(ticket);
    window.history.replaceState({}, "", `${window.location.pathname}?ticket=${ticket.id}`);
    await dataService.update("supportTickets", ticket.id, { adminUnread: false });
  }

  function back() {
    setSelected(null);
    window.history.replaceState({}, "", window.location.pathname);
  }

  async function send(event) {
    event.preventDefault();
    if (!reply.trim()) return;
    const messages = [...(selected.messages || []), {
      id: `msg-${Date.now()}`, senderId: user.userId, senderName: user.name,
      senderRole: user.role, message: reply.trim(), createdAt: new Date().toISOString(),
    }];
    const status = selected.status === "open" ? "in progress" : selected.status;
    await dataService.update("supportTickets", selected.id, {
      messages, userUnread: true, adminUnread: false, status, updatedAt: new Date().toISOString(),
    });
    await notifySupportReply(selected, user.role);
    setSelected({ ...selected, messages, status });
    setReply("");
    load();
  }

  async function setStatus(status) {
    await dataService.update("supportTickets", selected.id, { status, updatedAt: new Date().toISOString() });
    setSelected({ ...selected, status });
    load();
  }

  async function softDelete(mode) {
    const changes = mode === "user"
      ? { deletedForUser: true, deletedForUserAt: new Date().toISOString(), deletedForUserBy: user.userId }
      : { archivedForAdmin: true, archivedForAdminAt: new Date().toISOString(), archivedForAdminBy: user.userId };
    await dataService.update("supportTickets", selected.id, changes);
    setDeleting(false);
    back();
    load();
  }

  return <div>
    <PageHeader eyebrow="Human client service" title="Support inbox" description="Reply to client tickets and manage resolution status." />
    <div className="mb-5 flex flex-wrap gap-2">{["open", "in progress", "resolved", "closed", "all"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${filter === item ? "bg-navy text-white" : "bg-white text-slate-500"}`}>{item}</button>)}</div>
    <div className={`grid gap-6 ${selected ? "lg:grid-cols-[.7fr_1.3fr]" : ""}`}>
      <div className={`space-y-3 ${selected ? "hidden lg:block" : ""}`}>{filtered.length ? filtered.map((ticket) => <button key={ticket.id} onClick={() => openTicket(ticket)} className={`glass-card w-full p-5 text-left ${selected?.id === ticket.id ? "border-gold" : ""}`}><div className="flex justify-between gap-3"><p className="font-bold text-navy">{ticket.subject}</p>{ticket.adminUnread && <span className="mt-1 h-2 w-2 rounded-full bg-burgundy" />}</div><p className="mt-1 text-xs text-slate-400">{ticket.ticketId} · {ticket.userName}</p><div className="mt-3"><StatusBadge status={ticket.status} /></div></button>) : <EmptyState icon={LifeBuoy} title="No tickets" text="No support tickets match this filter." />}</div>
      {selected && <div className="glass-card flex min-h-[540px] flex-col overflow-hidden">
        <div className="border-b border-slate-200 p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><button onClick={back} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-navy"><ArrowLeft size={16} /> Back to tickets</button><button title="Delete or archive" onClick={() => setDeleting(true)} className="rounded-xl bg-red-50 p-2.5 text-red-600"><Trash2 size={16} /></button></div>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><StatusBadge status={selected.status} /><span className="text-xs font-bold text-gold">{selected.ticketId}</span></div><h2 className="display-title mt-2 text-2xl text-navy">{selected.subject}</h2><p className="text-xs text-slate-400">{selected.userName}</p></div><select className="field max-w-40" value={selected.status} onChange={(event) => setStatus(event.target.value)}><option>open</option><option>in progress</option><option>resolved</option><option>closed</option></select></div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">{selected.messages?.map((message) => <div key={message.id} className={`flex ${message.senderRole === "user" ? "justify-start" : "justify-end"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.senderRole === "user" ? "bg-stone text-slate-700" : "bg-navy text-white"}`}><p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-60">{message.senderName} · {message.senderRole}</p><p>{message.message}</p><p className="mt-2 text-[9px] opacity-50">{messageStamp(message.createdAt)}</p></div></div>)}</div>
        <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-4"><input className="field" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply..." /><button className="btn-primary px-4"><Send size={16} /></button></form>
      </div>}
    </div>
    <Modal open={deleting} onClose={() => setDeleting(false)} title="Delete or archive ticket"><p className="text-sm leading-6 text-slate-500">No messages will be hard deleted. Choose where this ticket should be hidden.</p><div className="mt-5 grid gap-3"><button onClick={() => softDelete("user")} className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"><Trash2 className="mr-2 inline" size={16} /> Hide for user</button><button onClick={() => softDelete("admin")} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-navy"><Archive className="mr-2 inline" size={16} /> Archive for admin</button></div></Modal>
  </div>;
}
