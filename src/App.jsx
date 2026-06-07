import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { ForgotPasswordPage, LoginPage, OnboardingPage, RegisterPage } from "./pages/AuthPages";
import { DepositPage, ReferralsPage, SettingsPage, TransactionsPage, UserDashboard, WithdrawalPage } from "./pages/UserPages";
import { CryptoInvestmentPage, EarningsPage, FlashInvestmentPage, PortfolioPage, StockInvestmentPage, StockResearchPage } from "./pages/InvestmentPages";
import { AdminInvestmentsPage, CoinLibraryPage, FlashAdminPage, StockLibraryPage } from "./pages/AdminInvestmentPages";
import { CompanyPage, KycPage, NotificationsPage, SupportPage } from "./pages/EnterpriseUserPages";
import {
  AdminSupportPage, AnalyticsPage, AnnouncementsAdminPage, CompanyAdminPage, ContentAdminPage,
  KycReviewPage, PlatformSettingsPage, TestimonialsAdminPage,
} from "./pages/EnterpriseAdminPages";
import {
  AdminDashboard, AdminReferralsPage, DepositMethodsPage, DepositsAdminPage,
  OnboardingLinksPage, PlatformBrandingPage, UsersAdminPage, WithdrawalsAdminPage,
} from "./pages/AdminPages";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import { Brand } from "./components/UI";
import { dataService } from "./lib/dataService";

function LegalPage({ privacy = false }) {
  const type = privacy ? "privacy" : "terms";
  const [document, setDocument] = useState(null);
  useEffect(() => { dataService.list("legalDocuments", "GLOBAL", true).then((items) => setDocument(items.filter((item) => item.type === type && item.published).sort((a, b) => b.version - a.version)[0] || null)); }, [type]);
  return (
    <div className="min-h-screen bg-stone px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <a href="/"><Brand /></a>
        <div className="glass-card mt-12 p-7 md:p-12">
          <p className="section-kicker">Stonehaven Investment Group</p>
          <h1 className="display-title mt-3 text-4xl text-navy">{document?.title || (privacy ? "Privacy Policy" : "Terms & Conditions")}</h1>
          <p className="mt-3 text-xs text-slate-400">Published version {document?.version || "—"}</p>
          <div className="mt-9 whitespace-pre-wrap text-sm leading-7 text-slate-600">{document?.content || "This document is not currently published."}</div>
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
      <Route path="/company" element={<CompanyPage />} />

      <Route element={<ProtectedRoute roles={["user"]} />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<UserDashboard />} />
          <Route path="flash-investment" element={<FlashInvestmentPage />} />
          <Route path="crypto-investment" element={<CryptoInvestmentPage />} />
          <Route path="stock-investment" element={<StockInvestmentPage />} />
          <Route path="stock-investment/:stockId" element={<StockResearchPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="deposit" element={<DepositPage />} />
          <Route path="withdraw" element={<WithdrawalPage />} />
          <Route path="referrals" element={<ReferralsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="kyc" element={<KycPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["sub-admin"]} />}>
        <Route element={<DashboardLayout admin />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UsersAdminPage />} />
          <Route path="/admin/investments" element={<AdminInvestmentsPage />} />
          <Route path="/admin/flash" element={<FlashAdminPage />} />
          <Route path="/admin/coins" element={<CoinLibraryPage />} />
          <Route path="/admin/stocks" element={<StockLibraryPage />} />
          <Route path="/admin/deposits" element={<DepositsAdminPage />} />
          <Route path="/admin/withdrawals" element={<WithdrawalsAdminPage />} />
          <Route path="/admin/methods" element={<DepositMethodsPage />} />
          <Route path="/admin/referrals" element={<AdminReferralsPage />} />
          <Route path="/admin/kyc" element={<KycReviewPage />} />
          <Route path="/admin/support" element={<AdminSupportPage />} />
          <Route path="/admin/announcements" element={<AnnouncementsAdminPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["superadmin"]} />}>
        <Route element={<DashboardLayout admin superAdmin />}>
          <Route path="/superadmin/dashboard" element={<AdminDashboard superAdmin />} />
          <Route path="/superadmin/users" element={<UsersAdminPage superAdmin />} />
          <Route path="/superadmin/investments" element={<AdminInvestmentsPage />} />
          <Route path="/superadmin/flash" element={<FlashAdminPage />} />
          <Route path="/superadmin/coins" element={<CoinLibraryPage />} />
          <Route path="/superadmin/stocks" element={<StockLibraryPage />} />
          <Route path="/superadmin/deposits" element={<DepositsAdminPage />} />
          <Route path="/superadmin/withdrawals" element={<WithdrawalsAdminPage />} />
          <Route path="/superadmin/methods" element={<DepositMethodsPage />} />
          <Route path="/superadmin/referrals" element={<AdminReferralsPage />} />
          <Route path="/superadmin/onboarding-links" element={<OnboardingLinksPage />} />
          <Route path="/superadmin/branding" element={<PlatformBrandingPage />} />
          <Route path="/superadmin/kyc" element={<KycReviewPage />} />
          <Route path="/superadmin/support" element={<AdminSupportPage />} />
          <Route path="/superadmin/announcements" element={<AnnouncementsAdminPage />} />
          <Route path="/superadmin/analytics" element={<AnalyticsPage superAdmin />} />
          <Route path="/superadmin/testimonials" element={<TestimonialsAdminPage />} />
          <Route path="/superadmin/company" element={<CompanyAdminPage />} />
          <Route path="/superadmin/content" element={<ContentAdminPage />} />
          <Route path="/superadmin/platform-settings" element={<PlatformSettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
