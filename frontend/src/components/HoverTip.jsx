import { useLayoutEffect, useRef, useState } from "react";

export default function HoverTip({ text, anchorX, anchorBottom, anchorTop }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (ref.current) {
      setSize({ w: ref.current.offsetWidth, h: ref.current.offsetHeight });
    }
  }, [text]);

  const margin = 6;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

  let left = anchorX - size.w / 2;
  if (size.w > 0) {
    if (left < margin) left = margin;
    if (left + size.w > vw - margin) left = vw - size.w - margin;
  }

  let top = anchorBottom;
  if (size.h > 0 && top + size.h > vh - margin) {
    top = anchorTop - size.h;
  }

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed z-[100] whitespace-nowrap bg-tip-bg px-2 py-1 text-[11px] text-tip-fg"
      style={{ left, top, opacity: size.w > 0 ? 1 : 0 }}
    >
      {text}
    </div>
  );
}
