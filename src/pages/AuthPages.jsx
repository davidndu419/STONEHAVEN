import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, Eye, EyeOff, Flame, KeyRound, Mail, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Brand } from "../components/UI";
import { dataService } from "../lib/dataService";

const routeFor = (user) => user.role === "superadmin" ? "/superadmin/dashboard" : user.role === "sub-admin" ? "/admin/dashboard" : user.onboarded ? "/dashboard" : "/onboarding";

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen bg-stone lg:grid-cols-[.9fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 hero-grid opacity-60" /><div className="absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative"><Link to="/"><Brand light /></Link></div>
        <div className="relative my-auto max-w-xl"><p className="section-kicker">Private client access</p><h2 className="display-title mt-5 text-6xl leading-[1.02]">A clearer view of your financial future.</h2><p className="mt-6 max-w-lg text-sm leading-7 text-white/55">Secure access to your portfolio, transactions, referrals, and dedicated administration.</p></div>
        <p className="relative text-xs text-white/30">Stonehaven Investment Group · Building wealth for generations</p>
      </div>
      <div className="flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden"><Link to="/"><Brand /></Link></div>
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-navy"><ArrowLeft size={15} /> Back to Stonehaven</Link>
          <h1 className="display-title text-4xl text-navy">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={routeFor(user)} replace />;

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const profile = await login(form.email, form.password);
      navigate(location.state?.from?.pathname || routeFor(profile), { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Welcome back." subtitle="Enter your credentials to access your private client portal.">
      <form onSubmit={submit} className="space-y-5">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div><label className="label">Email address</label><input className="field" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></div>
        <div><div className="flex justify-between"><label className="label">Password</label><Link to="/forgot-password" className="text-xs font-semibold text-gold">Forgot password?</Link></div><div className="relative"><input className="field pr-12" type={showPassword ? "text" : "password"} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
        <button disabled={busy} className="btn-primary w-full py-3.5">{busy ? "Signing in..." : "Sign in securely"} <ArrowRight size={16} /></button>
      </form>
      <div className="mt-6 rounded-xl border border-gold/20 bg-gold/[.06] p-4 text-xs leading-6 text-slate-500"><strong className="text-navy">Demo access</strong><br />User: user@stonehaven.test · Admin: admin@stonehaven.test<br />Super admin: superadmin@stonehaven.test · Password: demo123</div>
      <p className="mt-7 text-center text-sm text-slate-500">New to Stonehaven? <Link to="/register" className="font-bold text-gold">Create an account</Link></p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "", password: "", confirm: "", referralCode: params.get("ref") || "", adminId: params.get("admin") || "", invitationToken: params.get("invite") || "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={routeFor(user)} replace />;

  async function submit(event) {
    event.preventDefault(); setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 6) return setError("Password must contain at least 6 characters.");
    setBusy(true);
    try { await register(form); navigate("/onboarding"); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Begin your journey." subtitle="Create your Stonehaven profile and enter the private client experience.">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</div>}
        <div className="sm:col-span-2"><label className="label">Full name</label><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Email</label><input className="field" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="label">Phone</label><input className="field" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div><label className="label">Country</label><input className="field" required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
        <div><label className="label">Password</label><input className="field" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div><label className="label">Confirm password</label><input className="field" type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></div>
        <div><label className="label">Referral code</label><input className="field" value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value })} placeholder="Optional" /></div>
        <div><label className="label">Advisor ID</label><input className="field" value={form.adminId} onChange={(e) => setForm({ ...form, adminId: e.target.value })} placeholder="Optional" /></div>
        <label className="flex items-start gap-3 text-xs leading-5 text-slate-500 sm:col-span-2"><input type="checkbox" required className="mt-1 accent-[#C8A55A]" /> I agree to the Terms of Service, Privacy Policy, and investment risk disclosure.</label>
        <button disabled={busy} className="btn-primary sm:col-span-2">{busy ? "Creating account..." : "Create private account"} <ArrowRight size={16} /></button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">Already a client? <Link to="/login" className="font-bold text-gold">Sign in</Link></p>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [error, setError] = useState("");
  async function submit(event) { event.preventDefault(); setError(""); try { await resetPassword(email); setSent(true); } catch (err) { setError(err.message); } }
  return (
    <AuthShell title="Restore access." subtitle="We will send password reset instructions to your registered email address.">
      {sent ? <div className="glass-card p-7 text-center"><CheckCircle2 className="mx-auto text-forest" size={36} /><h3 className="mt-4 font-display text-2xl font-bold text-navy">Check your inbox</h3><p className="mt-2 text-sm leading-6 text-slate-500">Reset instructions have been prepared for {email}.</p><Link to="/login" className="btn-primary mt-6">Return to login</Link></div> :
      <form onSubmit={submit} className="space-y-5">{error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div><label className="label">Email address</label><div className="relative"><Mail className="absolute left-4 top-3.5 text-slate-400" size={18} /><input className="field pl-11" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div></div><button className="btn-primary w-full"><KeyRound size={17} /> Send reset instructions</button></form>}
    </AuthShell>
  );
}

export function OnboardingPage() {
  const { user, refresh } = useAuth(); const navigate = useNavigate(); const [choice, setChoice] = useState("");
  useEffect(() => { if (user?.onboarded) navigate("/dashboard", { replace: true }); }, [user, navigate]);
  async function continueToDashboard() {
    await dataService.updateUser(user.userId, { onboarded: true, preference: choice });
    localStorage.setItem("stonehaven-investment-mode", choice);
    await refresh();
    navigate("/dashboard");
  }
  return (
    <div className="grid min-h-screen place-items-center bg-navy p-5 text-white"><div className="w-full max-w-5xl text-center"><Brand light /><p className="section-kicker mt-12">Welcome to Stonehaven</p><h1 className="display-title mt-4 text-4xl sm:text-5xl">Choose your investment focus, {user?.name?.split(" ")[0]}.</h1><p className="mt-4 text-sm text-white/50">Your dashboard will open inside this ecosystem. You can change modes at any time.</p><div className="mt-9 grid gap-4 md:grid-cols-3">{[["crypto", "Digital Assets", "Explore approved crypto markets and structured plans.", TrendingUp], ["stock", "Global Equities", "Research established companies and equity plans.", BarChart3], ["flash", "Flash Plans", "Access short-horizon opportunities with fixed maturity.", Flame]].map(([value, title, text, Icon]) => <button key={value} onClick={() => setChoice(value)} className={`dark-glass relative p-7 text-left transition ${choice === value ? "border-gold bg-gold/10" : "hover:border-gold/50"}`}><Icon className="text-gold" size={28} /><h2 className="display-title mt-7 text-2xl">{title}</h2><p className="mt-3 text-sm leading-6 text-white/50">{text}</p>{choice === value && <CheckCircle2 className="absolute right-5 top-5 text-gold" size={20} />}</button>)}</div><button disabled={!choice} onClick={continueToDashboard} className="btn-primary mt-8 px-9">Enter your dashboard <ArrowRight size={16} /></button></div></div>
  );
}
