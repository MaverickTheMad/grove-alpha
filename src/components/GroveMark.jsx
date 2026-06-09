// The Grove mark: an abstract leaf / sheltering arch, single forest-green
// outline with an earthy-purple branch detail (BRAND-GUIDE §2). Line-based,
// no gradients. `color` tints the leaf per app; the branch uses --secondary.
export default function GroveMark({
  size = 40,
  color = 'var(--app-accent)',
  tile = false,        // draw the dark rounded tile behind it (app icons)
  branch = true,
  className,
}) {
  const sw = 5
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Grove"
    >
      {tile && <rect x="2" y="2" width="96" height="96" rx="22" fill="var(--bg)" />}
      {/* leaf body — almond / arch */}
      <path
        d="M50 16 C70 36 70 64 50 88 C30 64 30 36 50 16 Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* central vein */}
      <path d="M50 22 L50 82" stroke={color} strokeWidth={sw - 1.5} strokeLinecap="round" />
      {/* side veins */}
      <path d="M50 40 L62 33" stroke={color} strokeWidth={sw - 1.5} strokeLinecap="round" />
      <path d="M50 40 L38 33" stroke={color} strokeWidth={sw - 1.5} strokeLinecap="round" />
      <path d="M50 56 L63 49" stroke={color} strokeWidth={sw - 1.5} strokeLinecap="round" />
      <path d="M50 56 L37 49" stroke={color} strokeWidth={sw - 1.5} strokeLinecap="round" />
      {/* earthy-purple branch detail at the base */}
      {branch && (
        <path
          d="M50 88 C50 80 55 76 62 74"
          stroke="var(--secondary)"
          strokeWidth={sw - 1.5}
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}
