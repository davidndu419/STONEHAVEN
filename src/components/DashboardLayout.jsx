import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ArrowDownToLine, ArrowUpFromLine, BarChart3, Bell, Building2, ChevronLeft, ChevronRight,
  Flame, History, LayoutDashboard, LifeBuoy, LineChart, Link2, LogOut, Megaphone, Menu,
  Settings, ShieldCheck, TrendingUp, Users, WalletCards, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Brand } from "./UI";
import { dataService } from "../lib/dataService";
import { normalizeInvestmentMode } from "../lib/investmentMode";

const userNav = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/dashboard/investments", "Investments", TrendingUp],
  ["/dashboard/portfolio", "Portfolio", WalletCards],
  ["/dashboard/earnings", "Earnings", BarChart3],
  ["/dashboard/deposit", "Deposit Funds", ArrowDownToLine],
  ["/dashboard/withdraw", "Withdraw Funds", ArrowUpFromLine],
  ["/dashboard/transactions", "Transactions", History],
  ["/dashboard/notifications", "Notifications", Bell],
  ["/dashboard/referrals", "Referral Earnings", Users],
  ["/dashboard/kyc", "KYC Verification", ShieldCheck],
  ["/dashboard/support", "Support", LifeBuoy],
  ["/dashboard/settings", "Settings", Settings],
];

const adminNav = [
  ["dashboard", "Overview", LayoutDashboard],
  ["users", "Users", Users],
  ["investments", "Investments", TrendingUp],
  ["investment-library", "Investment Library", LineChart],
  ["approvals", "Approvals", ShieldCheck],
  ["referrals", "Referrals", WalletCards],
  ["kyc", "KYC review", ShieldCheck],
  ["support", "Support tickets", LifeBuoy],
  ["announcements", "Announcements", Megaphone],
  ["analytics", "Analytics", BarChart3],
];
const notificationTime = (value) => value
  ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
  : "";

export default function DashboardLayout({ admin = false, superAdmin = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeInvestmentMode, setActiveInvestmentModeState] = useState(() =>
    normalizeInvestmentMode(localStorage.getItem("stonehaven-investment-mode") || user?.preference),
  );
  const [supportUnread, setSupportUnread] = useState(0);
  const sidebarSeenKey = user ? `stonehaven-sidebar-seen:${user.userId}` : "";
  const [sidebarSeen, setSidebarSeen] = useState(() => {
    if (!user) return {};
    try {
      return JSON.parse(localStorage.getItem(`stonehaven-sidebar-seen:${user.userId}`) || "{}");
    } catch {
      return {};
    }
  });
  const [adminBadgeCounts, setAdminBadgeCounts] = useState({});
  const base = superAdmin ? "/superadmin" : "/admin";
  const adminItems = superAdmin
    ? [...adminNav, ["onboarding-links", "Onboarding links", Link2], ["company-settings", "Company Settings", Building2]]
    : adminNav;
  const navigation = admin ? adminItems.map(([path, label, Icon]) => [`${base}/${path}`, label, Icon]) : userNav;

  const markSidebarSeen = useCallback((section) => {
    const next = { ...sidebarSeen, [section]: Date.now() };
    setSidebarSeen(next);
    if (sidebarSeenKey) localStorage.setItem(sidebarSeenKey, JSON.stringify(next));
  }, [sidebarSeen, sidebarSeenKey]);

  function setActiveInvestmentMode(value) {
    const mode = normalizeInvestmentMode(value);
    setActiveInvestmentModeState(mode);
    localStorage.setItem("stonehaven-investment-mode", mode);
    if (!admin && user?.userId && user.preference !== mode) {
      dataService.updateUser(user.userId, { preference: mode }).catch((error) => {
        console.error("Unable to save investment preference:", error);
      });
    }
  }

  useEffect(() => {
    if (admin) return;
    const loadNotifications = () => dataService.listForUser("notifications", user.userId).then((items) => setNotifications(items.filter((item) => !item.dismissed).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))));
    loadNotifications();
    const timer = setInterval(loadNotifications, 10000);
    return () => clearInterval(timer);
  }, [admin, user.userId]);

  useEffect(() => {
    const loadSupport = () => {
      if (admin) {
        dataService.list("supportTickets", user.adminId, superAdmin).then(items => {
          setSupportUnread(items.filter(i => i.adminUnread && i.status !== "closed").length);
        }).catch(() => {});
      } else {
        dataService.listForUser("supportTickets", user.userId).then(items => {
          setSupportUnread(items.filter(i => i.userUnread && i.status !== "closed").length);
        }).catch(() => {});
      }
    };
    loadSupport();
    const timer = setInterval(loadSupport, 15000);
    return () => clearInterval(timer);
  }, [admin, user.adminId, user.userId, superAdmin]);

  useEffect(() => {
    if (!admin) return;
    const changedAfter = (item, section) =>
      new Date(item.profileUpdatedAt || item.updatedAt || item.createdAt || 0).getTime() > Number(sidebarSeen[section] || 0);
    const loadAdminBadges = async () => {
      const names = ["users", "investments", "deposits", "withdrawals", "kycSubmissions", "supportTickets", "announcements"];
      const results = await Promise.allSettled([
        dataService.listUsers(user.adminId, superAdmin),
        ...names.slice(1).map((name) => dataService.list(name, user.adminId, superAdmin)),
      ]);
      const value = (index) => results[index].status === "fulfilled" ? results[index].value : [];
      const users = value(0);
      const investments = value(1);
      const deposits = value(2);
      const withdrawals = value(3);
      const kyc = value(4);
      const tickets = value(5);
      const announcements = value(6);
      setAdminBadgeCounts({
        users: users.filter((item) => item.role === "user" && changedAfter(item, "users")).length,
        investments: investments.filter((item) =>
          ["pending", "awaiting_funding", "frozen"].includes(item.status)
          && changedAfter(item, "investments")
        ).length,
        approvals:
          deposits.filter((item) => item.status === "pending" && changedAfter(item, "approvals")).length
          + withdrawals.filter((item) => item.status === "pending" && changedAfter(item, "approvals")).length,
        referrals: users.filter((item) => item.role === "user" && item.referredBy && changedAfter(item, "referrals")).length,
        kyc: kyc.filter((item) => item.status === "pending" && changedAfter(item, "kyc")).length,
        support: tickets.filter((item) => item.adminUnread && changedAfter(item, "support")).length,
        announcements: announcements.filter((item) => ["draft", "scheduled"].includes(item.status) && changedAfter(item, "announcements")).length,
      });
    };
    loadAdminBadges();
    const timer = setInterval(loadAdminBadges, 10000);
    return () => clearInterval(timer);
  }, [admin, sidebarSeen, superAdmin, user.adminId]);
  const unreadNotifications = notifications.filter((item) => !item.read);
  const unread = unreadNotifications.length;

  async function signOutUser() {
    await logout();
    navigate("/");
  }

  const sidebar = (
    <aside className={`flex h-full flex-col bg-navy text-white transition-all duration-300 ${collapsed ? "w-[86px]" : "w-[270px]"}`}>
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
        <Brand compact={collapsed} light />
        <button className="hidden rounded-lg p-1.5 text-white/50 hover:bg-white/10 lg:block" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        <button className="lg:hidden" onClick={() => setMobileOpen(false)}><X /></button>
      </div>
      <div className="px-4 py-6">
        {!collapsed && <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">{admin ? "Management" : "Private client"}</p>}
        <nav className="space-y-1.5">
          {navigation.map(([path, label, Icon]) => {
            const section = path.split("/").filter(Boolean).at(-1);
            const badgeCount = admin
              ? Number(adminBadgeCounts[section] || 0)
              : path.endsWith("/support") ? supportUnread
                : path.endsWith("/notifications") ? unread : 0;
            const showBadge = badgeCount > 0;
            return (
              <NavLink key={path} to={path} end={path.endsWith("dashboard")} onClick={() => { setMobileOpen(false); if (admin) markSidebarSeen(section); }}
                className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${isActive ? "bg-gold text-navy shadow-gold" : "text-white/60 hover:bg-white/[.07] hover:text-white"}`}>
                <Icon size={19} className="shrink-0" />
                {!collapsed && <span className="font-medium flex-1">{label}</span>}
                {!collapsed && showBadge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-burgundy px-1 text-[9px] font-bold text-white">{badgeCount > 99 ? "99+" : badgeCount}</span>}
                {collapsed && showBadge && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-burgundy" />}
              </NavLink>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto border-t border-white/10 p-4">
        <button onClick={signOutUser} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/55 hover:bg-white/[.07] hover:text-white">
          <LogOut size={19} /> {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-stone">
      <div className="fixed inset-y-0 left-0 z-50 hidden lg:block">{sidebar}</div>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="h-full w-[270px]" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}
      <div className={`transition-all duration-300 ${collapsed ? "lg:ml-[86px]" : "lg:ml-[270px]"}`}>
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-slate-200/70 bg-stone/90 px-4 backdrop-blur-xl md:px-7">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 bg-white p-2.5 lg:hidden"><Menu size={20} /></button>
            {admin && <span className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">{superAdmin ? "Super Admin Portal" : "Advisor Portal"}</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setNotificationOpen(!notificationOpen)} className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600"><Bell size={19} />{unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-burgundy px-1 text-[9px] font-bold text-white">{unread}</span>}</button>
              {notificationOpen && !admin && (
                <>
                  <button aria-label="Close notifications" onClick={() => setNotificationOpen(false)} className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm sm:bg-transparent" />
                  <div className="fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-[360px] flex-col bg-white shadow-2xl drawer-slide-in sm:absolute sm:inset-y-auto sm:right-0 sm:top-auto sm:z-50 sm:mt-2 sm:w-[380px] sm:max-h-[min(72vh,540px)] sm:flex-none sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-heritage sm:animate-none">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:py-3">
                      <p className="font-display text-lg font-bold text-navy">Notifications</p>
                      <div className="flex items-center gap-3">
                        <button onClick={() => { setNotificationOpen(false); navigate("/dashboard/notifications"); }} className="text-xs font-bold text-gold">View all</button>
                        <button aria-label="Close notifications" onClick={() => setNotificationOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-stone hover:text-navy"><X size={17} /></button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto overscroll-contain p-2 sm:max-h-[calc(min(72vh,540px)-57px)]">
                      {unreadNotifications.slice(0, 10).map((item) => (
                        <button key={item.id} onClick={async () => { await dataService.update("notifications", item.id, { read: true }); setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry)); }} className="w-full rounded-xl p-3 text-left hover:bg-stone">
                          <div className="flex gap-3">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                            <div className="min-w-0">
                              <p className="break-words text-sm font-bold text-navy">{item.title}</p>
                              <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-slate-500">{item.message}</p>
                              <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">{notificationTime(item.createdAt)}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                      {!unreadNotifications.length && <p className="p-6 text-center text-sm text-slate-400">No new notifications</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1.5 pr-3">
                {user?.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy font-display font-bold text-gold">{user?.name?.charAt(0)}</span>}
                <span className="hidden text-left sm:block"><span className="block text-xs font-bold text-navy">{user?.name}</span><span className="block text-[10px] capitalize text-slate-400">{user?.role}</span></span>
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-heritage">
                  <button onClick={() => { navigate(admin ? `${base}/dashboard` : "/dashboard/settings"); setProfileOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-stone"><Settings size={16} /> Settings</button>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-stone"><ShieldCheck size={16} /> Security</button>
                  <button onClick={signOutUser} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-burgundy hover:bg-red-50"><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="p-4 pb-24 md:p-6 lg:pb-7"><Outlet context={{ activeInvestmentMode, setActiveInvestmentMode }} /></main>
      </div>
      {!admin && (
        <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-2xl border border-white/10 bg-navy/95 p-2 shadow-heritage backdrop-blur-xl lg:hidden">
          {[userNav[0], userNav[1], userNav[2], userNav[3], userNav[4]].map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === "/dashboard"} className={({ isActive }) => `flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] ${isActive ? "bg-gold text-navy" : "text-white/55"}`}>
              <Icon size={18} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
