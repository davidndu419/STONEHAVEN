import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ArrowDownToLine, ArrowUpFromLine, BarChart3, Bell, Bitcoin, ChevronLeft, ChevronRight, CreditCard,
  Flame, History, Image, LayoutDashboard, LineChart, Link2, LogOut, Menu, Settings, ShieldCheck, TrendingUp, Users, WalletCards, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Brand } from "./UI";

const userNav = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/dashboard/flash-investment", "Flash Investment", Flame],
  ["/dashboard/crypto-investment", "Crypto Investment", Bitcoin],
  ["/dashboard/stock-investment", "Stock Investment", LineChart],
  ["/dashboard/portfolio", "My Portfolio", TrendingUp],
  ["/dashboard/earnings", "Earnings", BarChart3],
  ["/dashboard/deposit", "Deposit", ArrowDownToLine],
  ["/dashboard/withdraw", "Withdraw", ArrowUpFromLine],
  ["/dashboard/referrals", "Referrals", Users],
  ["/dashboard/transactions", "Transactions", History],
  ["/dashboard/settings", "Settings", Settings],
];

const adminNav = [
  ["dashboard", "Overview", LayoutDashboard],
  ["users", "Users", Users],
  ["investments", "Investments", TrendingUp],
  ["flash", "Flash settings", Flame],
  ["coins", "Coin library", Bitcoin],
  ["stocks", "Stock library", LineChart],
  ["deposits", "Deposits", ArrowDownToLine],
  ["withdrawals", "Withdrawals", ArrowUpFromLine],
  ["methods", "Deposit methods", CreditCard],
  ["referrals", "Referrals", WalletCards],
];

export default function DashboardLayout({ admin = false, superAdmin = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeAssetMode, setActiveAssetMode] = useState(() => localStorage.getItem("stonehaven-asset-mode") || user?.preference || "crypto");
  const base = superAdmin ? "/superadmin" : "/admin";
  const adminItems = superAdmin
    ? [...adminNav, ["onboarding-links", "Onboarding links", Link2], ["branding", "Platform branding", Image]]
    : adminNav;
  const navigation = admin ? adminItems.map(([path, label, Icon]) => [`${base}/${path}`, label, Icon]) : userNav;

  useEffect(() => {
    localStorage.setItem("stonehaven-asset-mode", activeAssetMode);
  }, [activeAssetMode]);

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
          {navigation.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path.endsWith("dashboard")} onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${isActive ? "bg-gold text-navy shadow-gold" : "text-white/60 hover:bg-white/[.07] hover:text-white"}`}>
              <Icon size={19} className="shrink-0" />
              {!collapsed && <span className="font-medium">{label}</span>}
            </NavLink>
          ))}
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
      {mobileOpen && <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm lg:hidden"><div className="h-full w-[270px]">{sidebar}</div></div>}
      <div className={`transition-all duration-300 ${collapsed ? "lg:ml-[86px]" : "lg:ml-[270px]"}`}>
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-slate-200/70 bg-stone/90 px-4 backdrop-blur-xl md:px-7">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 bg-white p-2.5 lg:hidden"><Menu size={20} /></button>
            {!admin && (
              <div className="hidden rounded-xl border border-slate-200 bg-white p-1 sm:flex">
                <button onClick={() => setActiveAssetMode("crypto")} className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${activeAssetMode === "crypto" ? "bg-navy text-white" : "text-slate-500 hover:text-navy"}`}>Crypto</button>
                <button onClick={() => setActiveAssetMode("stocks")} className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${activeAssetMode === "stocks" ? "bg-navy text-white" : "text-slate-500 hover:text-navy"}`}>Stocks</button>
              </div>
            )}
            {admin && <span className="text-xs font-bold uppercase tracking-[.18em] text-slate-400">{superAdmin ? "Super Admin Portal" : "Advisor Portal"}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600"><Bell size={19} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-burgundy ring-2 ring-white" /></button>
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1.5 pr-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy font-display font-bold text-gold">{user?.name?.charAt(0)}</span>
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
        <main className="p-4 pb-24 md:p-7 lg:pb-7"><Outlet context={{ activeAssetMode, setActiveAssetMode }} /></main>
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
