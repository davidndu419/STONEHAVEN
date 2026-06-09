import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function ClipboardButton({ text, className = "", label = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for environments where Clipboard API is blocked/unsupported
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; // Avoid scrolling to bottom
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
        copied
          ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold"
          : "border-slate-200 bg-white text-navy hover:border-gold hover:bg-gold/5"
      } ${className}`}
    >
      {copied ? <Check size={14} className="shrink-0" /> : <Copy size={14} className="shrink-0" />}
      <span>{copied ? "Copied" : label || "Copy"}</span>
    </button>
  );
}
