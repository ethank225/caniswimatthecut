import { useCallback, useEffect, useState } from "react";
import { useReports } from "../hooks/useReports.js";

const FIRST_VISIT_KEY = "report-popup-seen";
const FIRST_VISIT_DELAY_MS = 1500;

function broadcastRefresh() {
  window.dispatchEvent(new CustomEvent("reports:refresh"));
}

export default function ReportFAB() {
  const { submit, submitState } = useReports();
  const [open, setOpen] = useState(false);

  const openPopup = useCallback(() => {
    setOpen(true);
    broadcastRefresh();
  }, []);

  // First-ever visit: auto-open after a short delay so the page paints first.
  // Mark seen immediately on open so closing the tab mid-popup doesn't re-trigger this.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(FIRST_VISIT_KEY)) return;
    const t = window.setTimeout(() => {
      openPopup();
      window.localStorage.setItem(FIRST_VISIT_KEY, "1");
    }, FIRST_VISIT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [openPopup]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (submitState.status === "success" || submitState.status === "rate-limited") {
      setOpen(false);
    }
  }, [submitState.status]);

  const pending = submitState.status === "pending";

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ease-out ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed bottom-24 right-5 z-50 w-72 origin-bottom-right border border-line bg-bg p-4 shadow-xl transition-all duration-200 ease-out ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.5px] text-fg3">
            Submit a report
          </span>
          <button
            onClick={() => setOpen(false)}
            className="cursor-pointer border-0 bg-transparent text-[16px] leading-none text-fg3 hover:text-fg"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex gap-2">
          <PopupButton
            onClick={() => submit(true)}
            disabled={pending}
            title="Cops here"
            sub="I see police at the Cut"
          />
          <PopupButton
            onClick={() => submit(false)}
            disabled={pending}
            title="All clear"
            sub="No cops, looks fine"
          />
        </div>
      </div>

      <button
        onClick={() => (open ? setOpen(false) : openPopup())}
        aria-label={open ? "Close report" : "Submit a report"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-line bg-bg text-fg shadow-lg transition-transform duration-150 ease-out hover:scale-105 active:scale-95"
      >
        <span
          className={`block h-3 w-3 rounded-full bg-fg transition-transform duration-200 ease-out ${
            open ? "scale-50" : "scale-100"
          }`}
        />
      </button>

      <div
        className={`pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap bg-tip-bg px-3.5 py-1.5 text-[12px] text-tip-fg transition-opacity duration-200 ${
          submitState.message ? "opacity-100" : "opacity-0"
        }`}
      >
        {submitState.message || " "}
      </div>
    </>
  );
}

function PopupButton({ onClick, disabled, title, sub }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 cursor-pointer border border-line bg-bg px-2 py-3 text-center font-sans text-[13px] font-semibold text-fg transition-colors hover:bg-bg2 active:bg-line disabled:cursor-wait disabled:opacity-60"
    >
      {title}
      <div className="mt-[3px] text-[10px] font-normal text-fg3">{sub}</div>
    </button>
  );
}
