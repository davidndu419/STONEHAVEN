import { useCallback, useEffect, useState } from "react";
import { Calculator, Edit3, Plus, Trash2, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { EmptyState, Modal, StatusBadge } from "./UI";

const calculatorDefaults = {
  planName: "", displayLabel: "", planType: "Crypto", minCapital: 0, maxCapital: 0,
  defaultCapital: 0, durationType: "Weeks", durationValue: 1, projectedReturn: 0,
  roiPercentage: 0, description: "", status: "Active", displayOrder: 1,
};

const landingPlanDefaults = {
  weeklyCapital: 0, twoMonthReturn: 0, threeMonthReturn: 0, planType: "Both",
  status: "Active", displayOrder: 1, badgeLabel: "", description: "",
};

const numericFields = new Set([
  "minCapital", "maxCapital", "defaultCapital", "durationValue", "projectedReturn",
  "roiPercentage", "displayOrder", "weeklyCapital", "twoMonthReturn", "threeMonthReturn",
]);

function Field({ label, name, value, onChange, type = "text", children, min }) {
  const Component = children ? "select" : "input";
  return (
    <div>
      <label className="label">{label}</label>
      <Component className="field" name={name} type={type} min={min} value={value} onChange={onChange}>
        {children}
      </Component>
    </div>
  );
}

function ContentModule({ title, description, collectionName, defaults, icon: Icon, renderSummary, renderFields }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const records = await dataService.list(collectionName, "GLOBAL", true);
    setItems(records.sort((a, b) => Number(a.displayOrder) - Number(b.displayOrder)));
  }, [collectionName]);

  useEffect(() => { load(); }, [load]);

  function change(event) {
    const { name, value } = event.target;
    setEditing((current) => ({ ...current, [name]: numericFields.has(name) ? Number(value) : value }));
  }

  async function save() {
    setBusy(true);
    try {
      const timestamp = new Date().toISOString();
      const actor = user.userId || user.uid || user.email;
      const payload = { ...editing, updatedAt: timestamp, updatedBy: actor };
      delete payload.id;
      if (editing.id) await dataService.update(collectionName, editing.id, payload);
      else await dataService.create(collectionName, { ...payload, createdAt: timestamp, createdBy: actor });
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item) {
    await dataService.update(collectionName, item.id, {
      status: item.status === "Active" ? "Inactive" : "Active",
      updatedAt: new Date().toISOString(),
      updatedBy: user.userId || user.uid || user.email,
    });
    load();
  }

  async function remove(item) {
    if (!window.confirm(`Delete "${renderSummary(item).title}"?`)) return;
    await dataService.remove(collectionName, item.id);
    load();
  }

  return (
    <section className="glass-card p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold"><Icon size={20} /></span>
          <div><h2 className="display-title text-2xl text-navy">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>
        </div>
        <button onClick={() => setEditing({ ...defaults, displayOrder: items.length + 1 })} className="btn-primary shrink-0"><Plus size={16} /> Add</button>
      </div>
      {items.length ? (
        <div className="mt-6 space-y-3">
          {items.map((item) => {
            const summary = renderSummary(item);
            return (
              <div key={item.id} className="flex flex-col justify-between gap-4 rounded-xl border border-slate-100 bg-white/60 p-4 sm:flex-row sm:items-center">
                <div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-navy">{summary.title}</p><StatusBadge status={item.status} /><span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Order {item.displayOrder}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{summary.detail}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => toggle(item)} className="btn-secondary bg-white py-2 text-navy">{item.status === "Active" ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => setEditing({ ...item })} className="rounded-xl bg-gold/10 p-3 text-gold" aria-label={`Edit ${summary.title}`}><Edit3 size={16} /></button>
                  <button onClick={() => remove(item)} className="rounded-xl bg-red-50 p-3 text-red-600" aria-label={`Delete ${summary.title}`}><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : <div className="mt-6"><EmptyState icon={Icon} title={`No ${title.toLowerCase()} records`} text="Add the first record to publish it on the landing page." /></div>}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={`${editing?.id ? "Edit" : "Add"} ${title}`} wide>
        {editing && <div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{renderFields(editing, change)}</div><button onClick={save} disabled={busy} className="btn-primary mt-6 w-full">{busy ? "Saving..." : `Save ${title}`}</button></div>}
      </Modal>
    </section>
  );
}

export function LandingContentAdmin() {
  return (
    <div className="mt-8 grid gap-6">
      <ContentModule
        title="Investment Calculator"
        description="Manage the plans and projected outcomes shown in the public investment calculator."
        collectionName="investmentCalculatorPlans"
        defaults={calculatorDefaults}
        icon={Calculator}
        renderSummary={(item) => ({ title: item.displayLabel || item.planName, detail: `${item.planType} | ${item.durationValue} ${item.durationType} | $${Number(item.defaultCapital).toLocaleString()} default | $${Number(item.projectedReturn).toLocaleString()} return` })}
        renderFields={(form, change) => (
          <>
            <Field label="Plan name" name="planName" value={form.planName} onChange={change} />
            <Field label="Display label" name="displayLabel" value={form.displayLabel} onChange={change} />
            <Field label="Plan type" name="planType" value={form.planType} onChange={change}><option>Flash</option><option>Crypto</option><option>Stock</option></Field>
            <Field label="Minimum capital" name="minCapital" type="number" min="0" value={form.minCapital} onChange={change} />
            <Field label="Maximum capital" name="maxCapital" type="number" min="0" value={form.maxCapital} onChange={change} />
            <Field label="Default capital" name="defaultCapital" type="number" min="0" value={form.defaultCapital} onChange={change} />
            <Field label="Duration type" name="durationType" value={form.durationType} onChange={change}><option>Hours</option><option>Weeks</option><option>Months</option></Field>
            <Field label="Duration value" name="durationValue" type="number" min="1" value={form.durationValue} onChange={change} />
            <Field label="Projected return" name="projectedReturn" type="number" min="0" value={form.projectedReturn} onChange={change} />
            <Field label="ROI percentage" name="roiPercentage" type="number" value={form.roiPercentage} onChange={change} />
            <Field label="Status" name="status" value={form.status} onChange={change}><option>Active</option><option>Inactive</option></Field>
            <Field label="Display order" name="displayOrder" type="number" min="1" value={form.displayOrder} onChange={change} />
            <div className="sm:col-span-2 lg:col-span-3"><label className="label">Description</label><textarea className="field min-h-24" name="description" value={form.description} onChange={change} /></div>
          </>
        )}
      />
      <ContentModule
        title="Investment Plans Display"
        description="Manage the weekly-capital cards shown for crypto and stock plans on the landing page."
        collectionName="landingInvestmentPlans"
        defaults={landingPlanDefaults}
        icon={TrendingUp}
        renderSummary={(item) => ({ title: `$${Number(item.weeklyCapital).toLocaleString()} weekly capital`, detail: `${item.planType} | 2 months: $${Number(item.twoMonthReturn).toLocaleString()} | 3 months: $${Number(item.threeMonthReturn).toLocaleString()}` })}
        renderFields={(form, change) => (
          <>
            <Field label="Weekly capital" name="weeklyCapital" type="number" min="0" value={form.weeklyCapital} onChange={change} />
            <Field label="Two month return" name="twoMonthReturn" type="number" min="0" value={form.twoMonthReturn} onChange={change} />
            <Field label="Three month return" name="threeMonthReturn" type="number" min="0" value={form.threeMonthReturn} onChange={change} />
            <Field label="Plan type" name="planType" value={form.planType} onChange={change}><option>Crypto</option><option>Stock</option><option>Both</option></Field>
            <Field label="Status" name="status" value={form.status} onChange={change}><option>Active</option><option>Inactive</option></Field>
            <Field label="Display order" name="displayOrder" type="number" min="1" value={form.displayOrder} onChange={change} />
            <Field label="Badge label" name="badgeLabel" value={form.badgeLabel} onChange={change} />
            <div className="sm:col-span-2"><label className="label">Description</label><textarea className="field min-h-24" name="description" value={form.description} onChange={change} /></div>
          </>
        )}
      />
    </div>
  );
}
