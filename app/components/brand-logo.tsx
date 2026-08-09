export function BrandLogo({
  inverse = false,
  compact = false,
}: {
  inverse?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={`brand-logo ${inverse ? "brand-logo--inverse" : ""} ${compact ? "brand-logo--compact" : ""}`}
    >
      <span className="brand-logo__words">
        <b>Speak</b>
        <b>Up</b>
      </span>
      <img
        className="brand-logo__asset"
        src="/assets/brand/hand-lantern-mark.png"
        alt=""
        aria-hidden="true"
      />
    </span>
  );
}
