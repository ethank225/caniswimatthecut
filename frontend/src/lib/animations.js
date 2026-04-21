// Centralized animation tokens and style builders.
// Keyframes live in src/index.css (fadeIn, cellIn) — keep names in sync.

export const DURATION = {
  fast: 200,
  base: 280,
  slow: 400,
};

export const EASE = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
};

// Capped per-item delay so long sequences don't drag on.
export function staggerMs(index, step = 12, max = 600) {
  return Math.min(index * step, max);
}

// Fade-in for DOM/SVG elements appearing in a sequence.
// `base` lets later sections cascade in after earlier ones (e.g. stats after forecast).
export function fadeInSequence(
  index = 0,
  { step = 35, max = 500, duration = DURATION.base, base = 0 } = {},
) {
  return {
    animation: `fadeIn ${duration}ms ${EASE.out} both`,
    animationDelay: `${base + staggerMs(index, step, max)}ms`,
  };
}

// Pop-in (scale + fade) for emphasized elements like data points.
export function popInSequence(
  index = 0,
  { step = 35, max = 500, duration = DURATION.base, base = 0 } = {},
) {
  return {
    animation: `cellIn ${duration}ms ${EASE.out} both`,
    animationDelay: `${base + staggerMs(index, step, max)}ms`,
    transformBox: "fill-box",
    transformOrigin: "center",
  };
}

// Section base-delays so the page cascades in a predictable order.
// Tune these (not per-component delays) to speed up or slow down the overall feel.
export const SECTION_DELAY = {
  forecast: 0,
  stats: 260,
  reports: 0, // loads from a separate hook, so cascades on its own timeline
};
