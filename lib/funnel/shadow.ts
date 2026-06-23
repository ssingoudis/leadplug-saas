// Mehrlagiger Card-Schatten. SHADOW_PADDING reserviert Platz drumherum, damit der
// Schatten nicht von overflow:hidden geclippt wird.

const CARD_SHADOW_LAYERS = [
  { offsetY: 0, blur: 16, spread: -4,  alpha: 0.10 },
  { offsetY: 10, blur: 32, spread: -10, alpha: 0.18 },
] as const;

const shadowExtent = CARD_SHADOW_LAYERS.reduce(
  (acc, { offsetY, blur, spread }) => {
    const base = blur + spread;
    return {
      top:    Math.max(acc.top,    Math.max(0, base - offsetY)),
      bottom: Math.max(acc.bottom, base + offsetY),
      sides:  Math.max(acc.sides,  Math.max(0, base)),
    };
  },
  { top: 0, bottom: 0, sides: 0 },
);

export const SHADOW_PADDING = {
  top:    Math.ceil(shadowExtent.top) + 4,
  bottom: Math.ceil(shadowExtent.bottom),
  sides:  Math.ceil(shadowExtent.sides),
};

export const CARD_SHADOW_STRING = CARD_SHADOW_LAYERS.map(
  ({ offsetY, blur, spread, alpha }) =>
    `0 ${offsetY}px ${blur}px ${spread}px rgba(0,0,0,${alpha})`,
).join(", ");
