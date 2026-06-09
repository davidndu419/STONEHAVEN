import { QRCodeSVG } from "qrcode.react";

export function CryptoDepositQRCode({ address, methodName, network, size = 180 }) {
  if (!address) return null;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-5 border border-slate-100 shadow-sm">
      <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-inner flex items-center justify-center">
        <QRCodeSVG
          value={address}
          size={size}
          level="H"
          includeMargin={false}
          imageSettings={{
            excavate: true,
          }}
        />
      </div>
      <div className="mt-4 text-center w-full">
        <span className="inline-block rounded-full bg-navy/5 px-3 py-1 text-[10px] font-bold text-navy uppercase tracking-wide">
          {network || methodName || "Crypto Address"}
        </span>
      </div>
    </div>
  );
}
