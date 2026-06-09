import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { ForgotPasswordPage, LoginPage, OnboardingPage, RegisterPage } from "./pages/AuthPages";
import { DepositPage, ReferralWithdrawalPage, ReferralsPage, TransactionsPage, WithdrawalPage } from "./pages/UserPages";
import { SettingsPage } from "./pages/SettingsPage";
import { FundInvestmentPage } from "./pages/FundingPages";
import { CryptoInvestmentPage, EarningsPage, FlashInvestmentPage, InvestmentsPage, PortfolioPage, StockInvestmentPage, StockResearchPage } from "./pages/InvestmentPages";
import { AdminInvestmentsPage, InvestmentLibraryPage } from "./pages/AdminInvestmentPages";
import { KycPage, NotificationsPage, SupportPage } from "./pages/EnterpriseUserPages";
import { CompactCompanyPage } from "./pages/CompactCompanyPage";
import { PublicFaqPage } from "./pages/PublicFaqPage";
import {
  AnalyticsPage, AnnouncementsAdminPage, KycReviewPage,
} from "./pages/EnterpriseAdminPages";
import {
  AdminDashboard, AdminReferralsPage, ApprovalsAdminPage,
  OnboardingLinksPage, UsersAdminPage,
} from "./pages/AdminPages";
import { CompanySettingsPage } from "./pages/CompanySettingsPage";
import { UserControlCenter } from "./pages/AdminUserDetail";
import { AdminSupportInbox } from "./pages/AdminSupportInbox";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./components/DashboardHome";
import { PublicContentLayout } from "./components/PublicContentChrome";
import { dataService } from "./lib/dataService";

function LegalPage({ privacy = false }) {
  const type = privacy ? "privacy" : "terms";
  const [document, setDocument] = useState(null);
  useEffect(() => { dataService.list("legalDocuments", "GLOBAL", true).then((items) => setDocument(items.filter((item) => item.type === type && item.published).sort((a, b) => b.version - a.version)[0] || null)); }, [type]);
  return (
    <PublicContentLayout title={privacy ? "Privacy" : "Terms"}>
      <main className="px-5 py-12">
        <div className="glass-card mx-auto max-w-3xl p-7 md:p-12">
          <p className="section-kicker">Stonehaven Investment Group</p>
          <h1 className="display-title mt-3 text-4xl text-navy">{document?.title || (privacy ? "Privacy Policy" : "Terms & Conditions")}</h1>
          <p className="mt-3 text-xs text-slate-400">Published version {document?.version || "—"}</p>
          <div className="mt-9 whitespace-pre-wrap text-sm leading-7 text-slate-600">{document?.content || "This document is not currently published."}</div>
        </div>
      </main>
    </PublicContentLayout>
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
      <Route path="/company" element={<CompactCompanyPage />} />
      <Route path="/faq" element={<PublicFaqPage />} />

      <Route element={<ProtectedRoute roles={["user"]} />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="investments" element={<InvestmentsPage />} />
          <Route path="flash-investment" element={<FlashInvestmentPage />} />
          <Route path="crypto-investment" element={<CryptoInvestmentPage />} />
          <Route path="stock-investment" element={<StockInvestmentPage />} />
          <Route path="stock-investment/:stockId" element={<StockResearchPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="fund-investment" element={<FundInvestmentPage />} />
          <Route path="deposit" element={<DepositPage />} />
          <Route path="withdraw" element={<WithdrawalPage />} />
          <Route path="referrals" element={<ReferralsPage />} />
          <Route path="referral-withdrawal" element={<ReferralWithdrawalPage />} />
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
          <Route path="/admin/users/:userId" element={<UserControlCenter />} />
          <Route path="/admin/investments" element={<AdminInvestmentsPage />} />
          <Route path="/admin/investment-library" element={<InvestmentLibraryPage />} />
          <Route path="/admin/flash" element={<Navigate to="/admin/investment-library" replace />} />
          <Route path="/admin/coins" element={<Navigate to="/admin/investment-library" replace />} />
          <Route path="/admin/stocks" element={<Navigate to="/admin/investment-library" replace />} />
          <Route path="/admin/approvals" element={<ApprovalsAdminPage />} />
          <Route path="/admin/deposits" element={<Navigate to="/admin/approvals" replace />} />
          <Route path="/admin/withdrawals" element={<Navigate to="/admin/approvals" replace />} />
          <Route path="/admin/methods" element={<Navigate to="/admin/investment-library" replace />} />
          <Route path="/admin/referrals" element={<AdminReferralsPage />} />
          <Route path="/admin/kyc" element={<KycReviewPage />} />
          <Route path="/admin/support" element={<AdminSupportInbox />} />
          <Route path="/admin/announcements" element={<AnnouncementsAdminPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["superadmin"]} />}>
        <Route element={<DashboardLayout admin superAdmin />}>
          <Route path="/superadmin/dashboard" element={<AdminDashboard superAdmin />} />
          <Route path="/superadmin/users" element={<UsersAdminPage superAdmin />} />
          <Route path="/superadmin/users/:userId" element={<UserControlCenter />} />
          <Route path="/superadmin/investments" element={<AdminInvestmentsPage />} />
          <Route path="/superadmin/investment-library" element={<InvestmentLibraryPage />} />
          <Route path="/superadmin/flash" element={<Navigate to="/superadmin/investment-library" replace />} />
          <Route path="/superadmin/coins" element={<Navigate to="/superadmin/investment-library" replace />} />
          <Route path="/superadmin/stocks" element={<Navigate to="/superadmin/investment-library" replace />} />
          <Route path="/superadmin/approvals" element={<ApprovalsAdminPage />} />
          <Route path="/superadmin/deposits" element={<Navigate to="/superadmin/approvals" replace />} />
          <Route path="/superadmin/withdrawals" element={<Navigate to="/superadmin/approvals" replace />} />
          <Route path="/superadmin/methods" element={<Navigate to="/superadmin/investment-library" replace />} />
          <Route path="/superadmin/referrals" element={<AdminReferralsPage />} />
          <Route path="/superadmin/onboarding-links" element={<OnboardingLinksPage />} />
          <Route path="/superadmin/company-settings" element={<CompanySettingsPage />} />
          <Route path="/superadmin/branding" element={<Navigate to="/superadmin/company-settings" replace />} />
          <Route path="/superadmin/kyc" element={<KycReviewPage />} />
          <Route path="/superadmin/support" element={<AdminSupportInbox />} />
          <Route path="/superadmin/announcements" element={<AnnouncementsAdminPage />} />
          <Route path="/superadmin/analytics" element={<AnalyticsPage superAdmin />} />
          <Route path="/superadmin/testimonials" element={<Navigate to="/superadmin/company-settings" replace />} />
          <Route path="/superadmin/company" element={<Navigate to="/superadmin/company-settings" replace />} />
          <Route path="/superadmin/content" element={<Navigate to="/superadmin/company-settings" replace />} />
          <Route path="/superadmin/platform-settings" element={<Navigate to="/superadmin/company-settings" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
