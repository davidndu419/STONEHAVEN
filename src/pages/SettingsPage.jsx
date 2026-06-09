import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Bell, Camera, CheckCircle2, LifeBuoy, LockKeyhole, ShieldCheck, UserRound, WalletCards } from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, sendEmailVerification, updatePassword } from "firebase/auth";
import { PageHeader, StatusBadge } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
import { dataService } from "../lib/dataService";
import { uploadToCloudinary } from "../lib/cloudinary";
import { CURRENCIES } from "../lib/currency";
import { INVESTMENT_MODES, investmentModeLabel } from "../lib/investmentMode";

const tabs = [
  ["profile", "Profile", UserRound],
  ["security", "Security", LockKeyhole],
  ["notifications", "Notifications", Bell],
  ["currency", "Currency Preference", WalletCards],
  ["support", "Support Preferences", LifeBuoy],
];
const dateTime = (value) => value ? new Date(value).toLocaleString() : "Not recorded";
const accountType = (role) => role === "superadmin" ? "Super Admin" : role === "sub-admin" ? "Sub Admin" : "User";
const kycLabel = (status) => ({ unverified: "Not Submitted", pending: "Pending Review", verified: "Approved", approved: "Approved", rejected: "Rejected" }[status] || status || "Not Submitted");

function Avatar({ user, preview, size = "h-24 w-24" }) {
  const source = preview || user.profilePhotoUrl;
  return source
    ? <img src={source} alt={`${user.name} profile`} className={`${size} rounded-2xl object-cover`} />
    : <span className={`${size} grid place-items-center rounded-2xl bg-navy font-display text-3xl font-bold text-gold`}>{user.name?.charAt(0) || "U"}</span>;
}

async function compressProfileImage(file) {
  if (!file || file.size <= 900000) return file;
  const source = await createImageBitmap(file);
  const side = Math.min(source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 900;
  canvas.getContext("2d").drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, 900, 900);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  source.close();
  return new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
}

async function uploadProfilePhoto(file) {
  const compressed = await compressProfileImage(file);
  if (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) {
    return uploadToCloudinary(compressed);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected profile image."));
    reader.readAsDataURL(compressed);
  });
}

function ReadOnlyField({ label, value }) {
  return <div className="rounded-xl bg-stone p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 break-words text-sm font-bold capitalize text-navy">{value || "Not recorded"}</p></div>;
}

export function SettingsPage() {
  const { user, refresh, firebaseEnabled } = useAuth();
  const navigate = useNavigate();
  const { activeInvestmentMode, setActiveInvestmentMode } = useOutletContext();
  const [active, setActive] = useState("profile");
  const [currency, setCurrency] = useState(user.currency || "USD");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [profile, setProfile] = useState({ firstName: "", lastName: "", phone: "", country: "", state: "", city: "", address: "" });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [notificationPreferences, setNotificationPreferences] = useState(user.notificationPreferences || { financial: true, investments: true, security: true, support: true });
  const [supportPreferences, setSupportPreferences] = useState(user.supportPreferences || { emailReplies: true, accountUpdates: true });
  const [kycSummary, setKycSummary] = useState(null);

  useEffect(() => {
    const parts = String(user.name || "").trim().split(/\s+/);
    setProfile({
      firstName: user.firstName || parts[0] || "",
      lastName: user.lastName || parts.slice(1).join(" "),
      phone: user.phone || "", country: user.country || "", state: user.state || "",
      city: user.city || "", address: user.address || "",
    });
  }, [user]);

  useEffect(() => {
    dataService.listForUser("kycSubmissions", user.userId)
      .then((items) => setKycSummary(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null))
      .catch(() => setKycSummary(null));
  }, [user.userId]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const passwordStrength = useMemo(() => {
    const value = passwords.next;
    return Number(value.length >= 8) + Number(/[A-Z]/.test(value) && /[a-z]/.test(value)) + Number(/\d/.test(value)) + Number(/[^A-Za-z0-9]/.test(value));
  }, [passwords.next]);

  function choosePhoto(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage({ type: "error", text: "Choose a JPG, PNG, or WEBP image." });
    if (file.size > 8 * 1024 * 1024) return setMessage({ type: "error", text: "Profile images must be smaller than 8 MB." });
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setMessage({ type: "", text: "" });
  }

  async function saveProfile(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    const firstName = profile.firstName.trim();
    const lastName = profile.lastName.trim();
    const phone = profile.phone.trim();
    if (firstName.length < 2 || lastName.length < 2) return setMessage({ type: "error", text: "First and last name must each contain at least 2 characters." });
    if (!/^[+()\d\s-]{7,24}$/.test(phone)) return setMessage({ type: "error", text: "Enter a valid phone number." });
    if (!profile.country.trim()) return setMessage({ type: "error", text: "Country is required." });
    setBusy(true);
    try {
      const profilePhotoUrl = photo ? await uploadProfilePhoto(photo) : user.profilePhotoUrl || "";
      const changes = {
        firstName, lastName, name: `${firstName} ${lastName}`.trim(), phone,
        country: profile.country.trim(), state: profile.state.trim(), city: profile.city.trim(),
        address: profile.address.trim(), profilePhotoUrl,
      };
      const changedAt = new Date().toISOString();
      const history = Object.entries(changes)
        .filter(([field, value]) => field !== "name" && String(user[field] || "") !== String(value || ""))
        .map(([fieldChanged, newValue]) => ({ fieldChanged, oldValue: String(user[fieldChanged] || ""), newValue: String(newValue || ""), changedAt }));
      await dataService.updateUser(user.userId, {
        ...changes, profileUpdatedAt: changedAt, profileUpdatedBy: "user",
        profileUpdateNotice: "User updated profile information.",
        profileChanges: [...(user.profileChanges || []), ...history].slice(-30),
      });
      await refresh();
      setPhoto(null);
      setPreview("");
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Unable to update your profile." });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setMessage({ type: "", text: "" });
    if (!firebaseEnabled || !auth.currentUser) return setMessage({ type: "error", text: "Password changes require Firebase authentication." });
    if (passwordStrength < 3) return setMessage({ type: "error", text: "Choose a stronger password." });
    if (passwords.next !== passwords.confirm) return setMessage({ type: "error", text: "New passwords do not match." });
    setBusy(true);
    try {
      await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, passwords.current));
      await updatePassword(auth.currentUser, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      setMessage({ type: "success", text: "Password updated successfully." });
    } catch (error) {
      setMessage({ type: "error", text: error.code === "auth/invalid-credential" ? "Current password is incorrect." : error.message });
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!auth.currentUser) return;
    setBusy(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage({ type: "success", text: "Verification email sent." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function savePreference(field, value) {
    setMessage({ type: "", text: "" });
    try {
      await dataService.updateUser(user.userId, { [field]: value });
      await refresh();
      setMessage({ type: "success", text: "Preference saved." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  const profileContent = <form onSubmit={saveProfile} className="space-y-6">
    <div className="glass-card p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><Avatar user={user} preview={preview} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="display-title text-2xl text-navy">{user.name}</h2><StatusBadge status={user.kycStatus} /></div><p className="mt-1 break-all text-sm text-slate-500">{user.email}</p><label className="btn-secondary mt-4 inline-flex cursor-pointer bg-white text-navy"><Camera size={16} /> Upload profile photo<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files[0])} /></label></div></div></div>
    <div className="glass-card p-6"><h2 className="display-title text-2xl text-navy">Personal information</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">
      <div><label className="label">First name</label><input className="field" required value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} /></div>
      <div><label className="label">Last name</label><input className="field" required value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} /></div>
      <div><label className="label">Phone number</label><input className="field" required inputMode="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></div>
      <div><label className="label">Country</label><input className="field" required value={profile.country} onChange={(event) => setProfile({ ...profile, country: event.target.value })} /></div>
      <div><label className="label">State / Region</label><input className="field" value={profile.state} onChange={(event) => setProfile({ ...profile, state: event.target.value })} /></div>
      <div><label className="label">City</label><input className="field" value={profile.city} onChange={(event) => setProfile({ ...profile, city: event.target.value })} /></div>
      <div className="sm:col-span-2"><label className="label">Residential address</label><textarea className="field min-h-28" value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></div>
    </div></div>
    <div className="glass-card p-6"><h2 className="display-title text-2xl text-navy">Account information</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <ReadOnlyField label="Email address" value={user.email} /><ReadOnlyField label="Account type" value={accountType(user.role)} /><ReadOnlyField label="Account status" value={user.status} />
      <ReadOnlyField label="Date joined" value={dateTime(user.createdAt)} /><ReadOnlyField label="Last login" value={dateTime(user.lastLogin)} /><ReadOnlyField label="Referral code" value={user.referralCode} /><ReadOnlyField label="User ID" value={user.userId} />
    </div></div>
    <div className="glass-card p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="display-title text-2xl text-navy">KYC summary</h2><p className="mt-2 text-sm text-slate-500">{kycLabel(user.kycStatus)}</p></div><StatusBadge status={user.kycStatus} /></div>{user.kycStatus === "rejected" && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{kycSummary?.rejectionReason || kycSummary?.requestDetails || "Review your KYC page for the rejection reason."}</p>}{["verified", "approved"].includes(user.kycStatus) && <p className="mt-4 text-xs text-slate-400">Approved {dateTime(kycSummary?.reviewedAt || user.kycApprovedAt)}</p>}<button type="button" onClick={() => navigate("/dashboard/kyc")} className="btn-secondary mt-5 bg-white text-navy">View KYC Details</button></div>
    <button disabled={busy} className="btn-primary sm:sticky sm:bottom-4 w-full py-4 mt-6">{busy ? "Saving..." : "Save profile changes"}</button>
  </form>;

  const securityContent = <div className="space-y-6">
    <div className="glass-card p-6"><h2 className="display-title text-2xl text-navy">Email management</h2><div className="mt-5 flex flex-col justify-between gap-4 rounded-xl bg-stone p-4 sm:flex-row sm:items-center"><div><p className="font-bold text-navy">{user.email}</p><p className={`mt-1 text-xs font-bold ${auth.currentUser?.emailVerified ? "text-emerald-700" : "text-amber-700"}`}>{auth.currentUser?.emailVerified ? "Verified" : "Not verified"}</p></div>{firebaseEnabled && !auth.currentUser?.emailVerified && <button disabled={busy} onClick={resendVerification} className="btn-secondary bg-white text-navy">Resend Verification Email</button>}</div></div>
    <form onSubmit={changePassword} className="glass-card max-w-2xl space-y-5 p-6"><h2 className="display-title text-2xl text-navy">Change password</h2><div><label className="label">Current password</label><input className="field" type="password" autoComplete="current-password" required value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} /></div><div><label className="label">New password</label><input className="field" type="password" autoComplete="new-password" required value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} /><div className="mt-2 grid grid-cols-4 gap-1">{[1, 2, 3, 4].map((level) => <span key={level} className={`h-1.5 rounded-full ${passwordStrength >= level ? "bg-gold" : "bg-slate-200"}`} />)}</div><p className="mt-2 text-xs text-slate-400">Use 8+ characters with upper/lowercase letters, a number, and a symbol.</p></div><div><label className="label">Confirm new password</label><input className="field" type="password" autoComplete="new-password" required value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} /></div><button disabled={busy} className="btn-primary w-full">{busy ? "Updating..." : "Update password"}</button></form>
  </div>;

  const notificationContent = <div className="glass-card max-w-3xl p-6"><h2 className="display-title text-2xl text-navy">Notification preferences</h2><div className="mt-5 space-y-3">{Object.entries(notificationPreferences).map(([key, enabled]) => <label key={key} className="flex items-center justify-between rounded-xl bg-stone p-4 text-sm font-bold capitalize text-navy">{key.replaceAll("_", " ")}<input type="checkbox" checked={enabled} onChange={(event) => { const next = { ...notificationPreferences, [key]: event.target.checked }; setNotificationPreferences(next); savePreference("notificationPreferences", next); }} className="h-5 w-5 accent-[#C8A55A]" /></label>)}</div></div>;
  const currencyContent = <div className="space-y-6"><div className="glass-card max-w-3xl p-6"><h2 className="display-title text-2xl text-navy">Currency preference</h2><p className="mt-2 text-sm text-slate-500">Choose how balances are displayed across the platform.</p><select className="field mt-5 max-w-sm" value={currency} onChange={(event) => { setCurrency(event.target.value); savePreference("currency", event.target.value); }}>{CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code} - {item.label}</option>)}</select></div><div className="glass-card p-6"><p className="label">Default investment mode</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{INVESTMENT_MODES.map((mode) => <button key={mode.value} onClick={() => setActiveInvestmentMode(mode.value)} className={`min-h-28 rounded-xl border p-5 text-left ${activeInvestmentMode === mode.value ? "border-gold bg-gold/10 ring-4 ring-gold/10" : "border-slate-200"}`}><p className="font-bold text-navy">{mode.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{mode.value === "crypto" ? "Digital assets and structured crypto plans" : mode.value === "stock" ? "Global equities and stock investments" : "Short-horizon fixed-maturity plans"}</p></button>)}</div><p className="mt-5 text-xs text-slate-400">{investmentModeLabel(activeInvestmentMode)} is your current dashboard preference.</p></div></div>;
  const supportContent = <div className="glass-card max-w-3xl p-6"><h2 className="display-title text-2xl text-navy">Support preferences</h2><div className="mt-5 space-y-3">{Object.entries(supportPreferences).map(([key, enabled]) => <label key={key} className="flex items-center justify-between rounded-xl bg-stone p-4 text-sm font-bold text-navy">{key === "emailReplies" ? "Email me about support replies" : "Include account updates in support"}<input type="checkbox" checked={enabled} onChange={(event) => { const next = { ...supportPreferences, [key]: event.target.checked }; setSupportPreferences(next); savePreference("supportPreferences", next); }} className="h-5 w-5 accent-[#C8A55A]" /></label>)}</div></div>;
  const content = { profile: profileContent, security: securityContent, notifications: notificationContent, currency: currencyContent, support: supportContent }[active];

  return <div><PageHeader eyebrow="Account preferences" title="Settings" description="Manage your profile, security, notifications, and display preferences." /><div className="mb-6 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm"><div className="flex min-w-max gap-2">{tabs.map(([key, label, Icon]) => <button key={key} onClick={() => { setActive(key); setMessage({ type: "", text: "" }); }} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${active === key ? "bg-navy text-white" : "text-slate-500 hover:bg-stone"}`}><Icon size={16} />{label}</button>)}</div></div>{message.text && <div className={`mb-5 flex items-center gap-2 rounded-xl p-4 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.type === "success" ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}{message.text}</div>}{content}</div>;
}
