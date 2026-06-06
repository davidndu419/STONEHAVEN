import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { ForgotPasswordPage, LoginPage, OnboardingPage, RegisterPage } from "./pages/AuthPages";
import { DepositPage, ReferralsPage, TransactionsPage, UserDashboard, WithdrawalPage } from "./pages/UserPages";
import {
  AdminDashboard, AdminReferralsPage, DepositMethodsPage, DepositsAdminPage,
  OnboardingLinksPage, PlatformBrandingPage, UsersAdminPage, WithdrawalsAdminPage,
} from "./pages/AdminPages";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import { Brand } from "./components/UI";

function LegalPage({ privacy = false }) {
  return (
    <div className="min-h-screen bg-stone px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <a href="/"><Brand /></a>
        <div className="glass-card mt-12 p-7 md:p-12">
          <p className="section-kicker">Stonehaven Investment Group</p>
          <h1 className="display-title mt-3 text-4xl text-navy">{privacy ? "Privacy Policy" : "Terms & Risk Disclosure"}</h1>
          <p className="mt-3 text-xs text-slate-400">Effective June 6, 2026 · Phase 1 placeholder document</p>
          <div className="mt-9 space-y-7 text-sm leading-7 text-slate-600">
            {privacy ? <>
              <section><h2 className="font-display text-2xl font-bold text-navy">Information we process</h2><p className="mt-2">We process profile, authentication, transaction, referral, and support information needed to operate the client platform and protect account integrity.</p></section>
              <section><h2 className="font-display text-2xl font-bold text-navy">How information is used</h2><p className="mt-2">Information is used to provide account services, review financial requests, maintain audit records, communicate material updates, and meet applicable legal obligations.</p></section>
              <section><h2 className="font-display text-2xl font-bold text-navy">Data controls</h2><p className="mt-2">Administrative access is role-based and scoped by adminId. Production deployment should include finalized retention schedules, regional notices, and a designated privacy contact.</p></section>
            </> : <>
              <section><h2 className="font-display text-2xl font-bold text-navy">Platform terms</h2><p className="mt-2">Use of this platform is subject to eligibility, identity verification where required, funding review, and the specific agreement governing each investment product.</p></section>
              <section><h2 className="font-display text-2xl font-bold text-navy">Investment risk</h2><p className="mt-2">Investing involves risk, including possible loss of capital. Market values may change significantly. Illustrations and projected values are not guarantees and do not constitute personalized financial advice.</p></section>
              <section><h2 className="font-display text-2xl font-bold text-navy">Production notice</h2><p className="mt-2">This Phase 1 text is a product placeholder and must be reviewed and replaced by qualified legal counsel before public launch or acceptance of real funds.</p></section>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/terms" element={<LegalPage />} />
      <Route path="/privacy" element={<LegalPage privacy />} />

      <Route element={<ProtectedRoute roles={["user"]} />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/deposit" element={<DepositPage />} />
          <Route path="/withdraw" element={<WithdrawalPage />} />
          <Route path="/referrals" element={<ReferralsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["sub-admin"]} />}>
        <Route element={<DashboardLayout admin />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UsersAdminPage />} />
          <Route path="/admin/deposits" element={<DepositsAdminPage />} />
          <Route path="/admin/withdrawals" element={<WithdrawalsAdminPage />} />
          <Route path="/admin/methods" element={<DepositMethodsPage />} />
          <Route path="/admin/referrals" element={<AdminReferralsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["superadmin"]} />}>
        <Route element={<DashboardLayout admin superAdmin />}>
          <Route path="/superadmin/dashboard" element={<AdminDashboard superAdmin />} />
          <Route path="/superadmin/users" element={<UsersAdminPage superAdmin />} />
          <Route path="/superadmin/deposits" element={<DepositsAdminPage />} />
          <Route path="/superadmin/withdrawals" element={<WithdrawalsAdminPage />} />
          <Route path="/superadmin/methods" element={<DepositMethodsPage />} />
          <Route path="/superadmin/referrals" element={<AdminReferralsPage />} />
          <Route path="/superadmin/onboarding-links" element={<OnboardingLinksPage />} />
          <Route path="/superadmin/branding" element={<PlatformBrandingPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
