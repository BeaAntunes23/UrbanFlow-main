export function LogoIcon({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width="32" height="32" rx="8" fill="#f97316" />

      {/* Vertical road */}
      <rect x="14" y="2" width="4" height="28" rx="1" fill="white" fillOpacity="0.15" />

      {/* Horizontal road */}
      <rect x="2" y="14" width="28" height="4" rx="1" fill="white" fillOpacity="0.15" />

      {/* Intersection glow */}
      <rect x="14" y="14" width="4" height="4" fill="white" fillOpacity="0.25" />

      {/* Vehicle nodes on roads */}
      <circle cx="8"  cy="16" r="2"   fill="white" />
      <circle cx="24" cy="16" r="2"   fill="white" fillOpacity="0.65" />
      <circle cx="16" cy="8"  r="2"   fill="white" />
      <circle cx="16" cy="24" r="2"   fill="white" fillOpacity="0.65" />

      {/* Central AI hub */}
      <circle cx="16" cy="16" r="3.2" fill="white" />
      <circle cx="16" cy="16" r="1.4" fill="#f97316" />
    </svg>
  );
}
