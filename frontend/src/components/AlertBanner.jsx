import { useState, useEffect } from "react";
import { timeAgo, titleCase } from "../lib/format.js";

function pickAlert(data) {
  if (!data) return null;
  if (data.cso?.active === true) {
    return {
      text: "⚠ Sewer overflow active — do not swim",
      time: data.cso.last_checked ? timeAgo(data.cso.last_checked) : "",
      key: `cso-active-${data.cso.last_checked}`,
    };
  }
  if (data.cso?.active === null) {
    return { text: "CSO status unknown — check conditions", time: "", key: "cso-null" };
  }
  if (Array.isArray(data.alerts) && data.alerts.length > 0) {
    const a = data.alerts[0];
    return {
      text: `${titleCase(a.type)} reported near the Cut`,
      time: timeAgo(a.time),
      key: `spd-${a.time}-${a.type}`,
    };
  }
  return null;
}

export default function AlertBanner({ data }) {
  const alert = pickAlert(data);
  const [dismissedKey, setDismissedKey] = useState(null);

  useEffect(() => {
    if (alert && dismissedKey && alert.key !== dismissedKey) setDismissedKey(null);
  }, [alert?.key, dismissedKey]);

  if (!alert || dismissedKey === alert.key) return null;

  return (
    <div className="mb-6 flex items-center justify-between gap-2 border border-alert-border bg-alert-bg px-3 py-2.5 text-[13px]">
      <span className="text-alert-fg">{alert.text}</span>
      <span className="whitespace-nowrap text-[12px] text-alert-fg2">{alert.time}</span>
      <button
        onClick={() => setDismissedKey(alert.key)}
        className="cursor-pointer border-0 bg-transparent px-0.5 text-[16px] text-alert-fg2"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
