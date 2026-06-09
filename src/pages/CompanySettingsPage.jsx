import { useState } from "react";
import { Building2, FileText, Image, Settings, Sparkles } from "lucide-react";
import { PageHeader } from "../components/UI";
import { PlatformBrandingPage } from "./AdminPages";
import {
  CompanyAdminPage,
  ContentAdminPage,
  PlatformSettingsPage,
  TestimonialsAdminPage,
} from "./EnterpriseAdminPages";

const sections = [
  ["content", "Content", FileText],
  ["branding", "Branding", Image],
  ["platform", "Platform settings", Settings],
  ["company", "Company info", Building2],
  ["testimonials", "Testimonials", Sparkles],
];

export function CompanySettingsPage() {
  const [active, setActive] = useState("content");

  return (
    <div>
      <PageHeader
        eyebrow="Platform administration"
        title="Company Settings"
        description="Manage public content, platform identity, company information, testimonials, and global settings from one place."
      />
      <div className="mb-6 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm">
        <div className="grid min-w-[760px] grid-cols-5 gap-2">
          {sections.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${
                active === key ? "bg-navy text-white" : "text-slate-500 hover:bg-stone"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {active === "content" && <ContentAdminPage />}
      {active === "branding" && <PlatformBrandingPage />}
      {active === "platform" && <PlatformSettingsPage />}
      {active === "company" && <CompanyAdminPage />}
      {active === "testimonials" && <TestimonialsAdminPage />}
    </div>
  );
}
