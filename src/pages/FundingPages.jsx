import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, CircleCheck, Copy, Landmark, Upload, WalletCards } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { dataService } from "../lib/dataService";
import { uploadToCloudinary } from "../lib/cloudinary";
import { activateInvestmentFromBalance, cancelInvestmentIntent, submitDepositIntent } from "../lib/securityApi";
import { money } from "../components/InvestmentUI";
import { EmptyState, PageHeader, StatusBadge } from "../components/UI";
import { CryptoDepositQRCode } from "../components/CryptoDepositQRCode";
import { ClipboardButton } from "../components/ClipboardButton";

const steps = ["Select Plan", "Funding", "Approval", "Active"];

function maturityEstimate(investment) {
  if (investment.expectedMaturityDate) return new Date(investment.expectedMaturityDate);
  const start = Date.now();
  const duration = investment.type === "flash"
    ? Number(investment.durationHours || 0) * 3600000
    : Number(investment.totalWeeks || 0) * 7 * 86400000;
  return new Date(start + duration);
}

export function FundInvestmentPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const investmentId = params.get("investment") || "";
  const [investment, setInvestment] = useState(null);
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [source, setSource] = useState("balance");
  const [hash, setHash] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      dataService.listForUser("investments", user.userId),
      dataService.list("depositMethods", user.adminId),
    ]).then(([investments, methodItems]) => {
      setInvestment(investments.find((item) => item.id === investmentId) || null);
      const activeMethods = methodItems.filter((item) => item.active);
      setMethods(activeMethods);
      setSelectedMethod(activeMethods[0] || null);
    }).catch((loadError) => setError(loadError.message));
  }, [investmentId, user.adminId, user.userId]);

  const required = Number(investment?.type === "flash" ? investment?.capital : investment?.weeklyCapital || 0);
  const balance = Number(user.availableBalance || 0);
  const shortfall = Math.max(0, required - balance);
  const sufficient = balance >= required;
  const depositAmount = sufficient ? required : shortfall;
  const balanceContribution = sufficient ? 0 : Math.min(balance, required);
  const expectedReturn = Number(investment?.expectedReturn || investment?.projectedReturn || 0);
  const expectedProfit = Number(investment?.expectedProfit ?? expectedReturn - Number(investment?.capital || required));
  const roi = Number(investment?.roi ?? (investment?.capital ? (expectedProfit / investment.capital) * 100 : 0));
  const reference = useMemo(
    () => `SH-${user.userId.slice(-6).toUpperCase()}-${investment?.ticker || "PLAN"}-FUND`,
    [investment?.ticker, user.userId],
  );

  async function activate() {
    setBusy(true); setError("");
    try {
      const activation = await activateInvestmentFromBalance({ investmentId, userId: user.userId });
      await refresh();
      setResult(activation.status === "active" ? "active" : "submitted");
    } catch (activationError) {
      setError(activationError.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitFunding(event) {
    event.preventDefault();
    if (!selectedMethod) return;
    const isCrypto = selectedMethod.type === "Crypto" || selectedMethod.methodType === "crypto";
    if (isCrypto && !hash.trim()) {
      setError("Transaction hash / reference is required for crypto deposits.");
      return;
    }
    setBusy(true); setError("");
    try {
      const proofUrl = file ? await uploadToCloudinary(file) : "";
      const localRecord = {
        userId: user.userId,
        userName: user.name,
        adminId: user.adminId,
        methodId: selectedMethod.id,
        methodName: selectedMethod.name,
        amount: depositAmount,
        balanceContribution,
        totalRequired: required,
        reference,
        transactionHash: hash,
        proofUrl,
        status: "pending",
        investmentId,
        week: Number(investment.completedWeeks || 0) + 1,
        depositType: "investment",
      };
      const transaction = {
        userId: user.userId,
        adminId: user.adminId,
        type: "investment_funding_submitted",
        label: `${investment.planName} funding submitted`,
        amount: depositAmount,
        status: "pending",
      };
      await submitDepositIntent({
        methodId: selectedMethod.id,
        amount: depositAmount,
        balanceContribution,
        totalRequired: required,
        reference,
        transactionHash: hash,
        proofUrl,
        investmentId,
        week: localRecord.week,
        label: transaction.label,
        localRecord,
        transaction,
      });
      setResult("submitted");
    } catch (fundingError) {
      setError(fundingError.message);
    } finally {
      setBusy(false);
    }
  }

  async function closeIntent() {
    if (!window.confirm("Close this unfunded investment request?")) return;
    setBusy(true); setError("");
    try {
      await cancelInvestmentIntent({ investmentId, userId: user.userId });
      navigate("/dashboard/portfolio");
    } catch (closeError) {
      setError(closeError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!investment && !error) return <div className="glass-card p-10 text-center text-sm text-slate-500">Loading investment summary...</div>;
  if (!investment) return <EmptyState title="Investment intent not found" text={error || "Return to Investments and select a plan again."} />;
  if (result) return <FundingSuccess active={result === "active"} onContinue={() => navigate("/dashboard/portfolio")} />;

  return (
    <div>
      <PageHeader eyebrow="Investment funding" title="Fund your investment" description="Review the plan snapshot and choose how to fund the required capital." />
      <ProgressTracker current={1} />
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {investment.status === "awaiting_funding" && <div className="mb-5 flex justify-end"><button disabled={busy} onClick={closeIntent} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50">Close Awaiting Funding</button></div>}

      <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
        <section className="glass-card overflow-hidden">
          <div className="bg-navy p-6 text-white">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Investment summary</p><h2 className="display-title mt-2 text-3xl">{investment.planName}</h2><p className="mt-2 text-sm capitalize text-white/50">{investment.type} investment</p></div><StatusBadge status={investment.status.replaceAll("_", " ")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-3">
            {[
              ["Capital required", money(required)],
              ["Duration", investment.type === "flash" ? `${investment.durationHours} hours` : `${investment.durationMonths} months`],
              ["ROI", `${roi.toFixed(1)}%`],
              ["Expected profit", money(expectedProfit)],
              ["Expected return", money(expectedReturn)],
              ["Expected maturity", maturityEstimate(investment).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })],
            ].map(([label, value]) => <div key={label} className="bg-white/90 p-4 md:p-5"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 font-display text-xl font-bold text-navy">{value}</p></div>)}
          </div>
        </section>

        <section className="glass-card p-5 md:p-6">
          <p className="section-kicker">Funding source</p>
          <h2 className="display-title mt-2 text-2xl text-navy">How would you like to fund this investment?</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={() => setSource("balance")} className={`min-h-24 rounded-xl border p-4 text-left ${source === "balance" ? "border-gold bg-gold/10 ring-4 ring-gold/10" : "border-slate-200"}`}><WalletCards className="text-gold" size={20} /><p className="mt-3 text-sm font-bold text-navy">Available Balance</p></button>
            <button onClick={() => setSource("deposit")} className={`min-h-24 rounded-xl border p-4 text-left ${source === "deposit" ? "border-gold bg-gold/10 ring-4 ring-gold/10" : "border-slate-200"}`}><Landmark className="text-gold" size={20} /><p className="mt-3 text-sm font-bold text-navy">New Deposit</p></button>
          </div>

          {source === "balance" ? (
            <div className="mt-5">
              <div className="rounded-xl bg-stone p-4">
                {[["Available Balance", money(balance)], ["Required", money(required)], [sufficient ? "Balance After Investment" : "Additional Deposit Required", money(sufficient ? balance - required : shortfall)]].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-slate-200 py-3 text-sm last:border-0"><span className="text-slate-500">{label}</span><strong className="text-navy">{value}</strong></div>)}
              </div>
              {sufficient ? <><p className="mt-4 flex items-center gap-2 text-sm font-semibold text-forest"><CircleCheck size={18} /> Your available balance can fully fund this investment.</p><button disabled={busy} onClick={activate} className="btn-primary mt-4 w-full">{busy ? "Submitting..." : "Submit Balance Funding"} <ArrowRight size={16} /></button><p className="mt-3 text-xs leading-5 text-slate-400">An administrator will verify the request before moving funds into locked capital.</p></> : <><p className="mt-4 text-sm text-slate-500">Your wallet balance is below the required funding amount.</p><button onClick={() => setSource("deposit")} className="btn-primary mt-4 w-full">Continue With Deposit <ArrowRight size={16} /></button></>}
            </div>
          ) : (
            <form onSubmit={submitFunding} className="mt-5 space-y-4">
              {!methods.length ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">No active deposit methods are available.</p> : <>
                <div><label className="label">Payment method</label><select className="field" value={selectedMethod?.id || ""} onChange={(event) => setSelectedMethod(methods.find((item) => item.id === event.target.value))}>{methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></div>
                
                {selectedMethod && (selectedMethod.type === "Crypto" || selectedMethod.methodType === "crypto") ? (
                  <div className="rounded-2xl border border-slate-100 bg-navy p-4 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-[.25em] text-gold">Crypto Deposit Details</p>
                    
                    <div className="mt-4 flex flex-col md:flex-row gap-4 items-center md:items-start justify-between">
                      {/* QR Code on top for mobile, on the right for desktop */}
                      <div className="shrink-0 flex justify-center w-full md:w-auto md:order-2">
                        <CryptoDepositQRCode 
                          address={selectedMethod.details || selectedMethod.address} 
                          methodName={selectedMethod.name} 
                          network={selectedMethod.network} 
                          size={150}
                        />
                      </div>

                      {/* Details below QR code on mobile, on the left for desktop */}
                      <div className="flex-1 space-y-3 w-full text-center md:text-left md:order-1">
                        <div>
                          <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold block">Method Name</span>
                          <span className="text-sm font-bold text-white block mt-0.5">{selectedMethod.name || selectedMethod.methodName}</span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold block">Network / Chain</span>
                          <span className="inline-block mt-1 bg-white/10 px-2 py-0.5 rounded text-[11px] font-bold text-gold uppercase tracking-wide">
                            {selectedMethod.network || "Not Specified"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold block">Wallet Address</span>
                          <code className="block mt-1 font-mono text-xs text-gold break-all bg-white/[0.06] p-2.5 rounded-xl border border-white/10 select-all max-w-full text-center md:text-left">
                            {selectedMethod.details || selectedMethod.address}
                          </code>
                        </div>
                        <div className="pt-1">
                          <ClipboardButton 
                            text={selectedMethod.details || selectedMethod.address} 
                            className="w-full md:w-auto" 
                            label="Copy Address" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Warning box */}
                    <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] leading-4 text-red-200 text-left">
                      <strong>Warning:</strong> Send only the selected asset/network to this address. Sending the wrong asset or network may result in permanent loss.
                    </div>

                    {selectedMethod.extraInfo && (
                      <p className="mt-3 text-[11px] leading-4 text-white/45 text-left border-t border-white/10 pt-3">
                        {selectedMethod.extraInfo}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-navy p-4 text-white">
                    <p className="text-[10px] uppercase tracking-widest text-white/35">Send payment to</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <code className="break-all text-sm text-gold">{selectedMethod?.details || selectedMethod?.address}</code>
                      <ClipboardButton 
                        text={selectedMethod?.details || selectedMethod?.address} 
                        label="Copy" 
                        className="shrink-0 bg-white/10 border-white/20 text-white hover:bg-white/20" 
                      />
                    </div>
                    {selectedMethod?.extraInfo && <p className="mt-3 text-xs leading-5 text-white/45">{selectedMethod.extraInfo}</p>}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">New deposit amount</label>
                    <input readOnly className="field bg-slate-50 font-bold" value={money(depositAmount)} />
                  </div>
                  <div>
                    <label className="label">Wallet contribution</label>
                    <input readOnly className="field bg-slate-50 font-bold" value={money(balanceContribution)} />
                  </div>
                </div>

                <div>
                  <label className="label">Transaction hash / reference</label>
                  <input 
                    required={selectedMethod?.type === "Crypto" || selectedMethod?.methodType === "crypto"} 
                    className="field" 
                    value={hash} 
                    onChange={(event) => setHash(event.target.value)} 
                  />
                </div>

                <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-5 text-center hover:border-gold">
                  <Upload className="mx-auto text-gold" />
                  <p className="mt-2 text-sm font-bold text-navy">{file?.name || "Upload payment proof (Optional)"}</p>
                  <input hidden type="file" accept="image/*" onChange={(event) => setFile(event.target.files[0])} />
                </label>

                <button disabled={busy} className="btn-primary w-full">
                  {busy ? "Submitting..." : "Submit Funding"} <ArrowRight size={16} />
                </button>
              </>}
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function ProgressTracker({ current }) {
  return <div className="mb-5 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 bg-white">{steps.map((step, index) => <div key={step} className={`relative px-2 py-3 text-center text-[9px] font-bold uppercase tracking-wide sm:text-xs ${index <= current ? "bg-navy text-white" : "text-slate-400"}`}>{index < current ? <CheckCircle2 className="mx-auto mb-1" size={15} /> : <span className="mx-auto mb-1 grid h-[15px] place-items-center">{index + 1}</span>}{step}</div>)}</div>;
}

function FundingSuccess({ active, onContinue }) {
  return <div><ProgressTracker current={active ? 3 : 2} /><div className="glass-card mx-auto max-w-xl p-8 text-center md:p-10"><CheckCircle2 className="mx-auto text-forest" size={48} /><p className="section-kicker mt-5">{active ? "Investment activated" : "Funding submitted"}</p><h1 className="display-title mt-2 text-3xl text-navy">{active ? "Your investment is active." : "Awaiting approval."}</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{active ? "Capital has moved from your available balance into locked capital." : "Your funding request is linked to this investment and is now in the administrator review queue."}</p><button onClick={onContinue} className="btn-primary mt-6">View Portfolio <ArrowRight size={16} /></button></div></div>;
}
