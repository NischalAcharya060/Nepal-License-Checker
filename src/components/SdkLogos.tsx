'use client'

interface LogoProps {
  className?: string
  size?: number
}

/** Official Microsoft TypeScript Vector Logo */
export function TypeScriptLogo({ className = 'h-4 w-4', size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect width="24" height="24" rx="4.5" fill="#3178C6" />
      <path
        fill="#FFFFFF"
        d="M13.68 15.61c.45.69 1.15 1.17 2.15 1.17 1.05 0 1.69-.53 1.69-1.28 0-.82-.67-1.14-1.83-1.63-1.62-.68-2.67-1.54-2.67-3.08 0-1.85 1.48-3.19 3.65-3.19 1.56 0 2.68.56 3.44 1.76l-1.63 1.05c-.41-.66-.88-.93-1.78-.93-.84 0-1.39.49-1.39 1.11 0 .7.52.99 1.64 1.46 1.83.77 2.89 1.59 2.89 3.31 0 2.05-1.58 3.32-3.95 3.32-2.18 0-3.52-.96-4.17-2.27l1.96-1.12zM8.32 9.53H5.06V7.79h8.46v1.74h-3.26V20H8.32V9.53z"
      />
    </svg>
  )
}

/** Official Python Dual-Snake Vector Logo */
export function PythonLogo({ className = 'h-4 w-4', size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <path
        fill="#3776AB"
        d="M11.92 2c-4.99 0-4.67 2.16-4.67 2.16l.01 2.24h4.74v.67H5.29S2 6.69 2 11.73c0 5.04 2.87 4.88 2.87 4.88h1.71v-2.42s-.09-2.88 2.83-2.88h4.88s2.73.04 2.73-2.65V4.65S17.43 2 11.92 2zm-2.6 1.47a.91.91 0 1 1 0 1.82.91.91 0 0 1 0-1.82z"
      />
      <path
        fill="#FFD43B"
        d="M12.08 22c4.99 0 4.67-2.16 4.67-2.16l-.01-2.24h-4.74v-.67h6.71s3.29.38 3.29-4.66c0-5.04-2.87-4.88-2.87-4.88h-1.71v2.42s.09 2.88-2.83 2.88H9.76s-2.73-.04-2.73 2.65v4.01S6.57 22 12.08 22zm2.6-1.47a.91.91 0 1 1 0-1.82.91.91 0 0 1 0 1.82z"
      />
    </svg>
  )
}

/** Official PHP Vector Logo (Exact Standard Vector) */
export function PhpLogo({ className = 'h-4 w-4', size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <ellipse cx="12" cy="12" rx="12" ry="6.313" fill="#FFFFFF" />
      <path
        fill="#777BB4"
        d="M7.01 10.207h-.944l-.515 2.648h.838c.556 0 .97-.105 1.242-.314.272-.21.455-.559.55-1.049.092-.47.05-.802-.124-.995-.175-.193-.523-.29-1.047-.29zM12 5.688C5.373 5.688 0 8.514 0 12s5.373 6.313 12 6.313S24 15.486 24 12c0-3.486-5.373-6.312-12-6.312zm-3.26 7.451c-.261.25-.575.438-.917.551-.336.108-.765.164-1.285.164H5.357l-.327 1.681H3.652l1.23-6.326h2.65c.797 0 1.378.209 1.744.628.366.418.476 1.002.33 1.752a2.836 2.836 0 0 1-.305.847c-.143.255-.33.49-.561.703zm4.024.715l.543-2.799c.063-.318.039-.536-.068-.651-.107-.116-.336-.174-.687-.174H11.46l-.704 3.625H9.388l1.23-6.327h1.367l-.327 1.682h1.218c.767 0 1.295.134 1.586.401s.378.7.263 1.299l-.572 2.944h-1.389zm7.597-2.265a2.782 2.782 0 0 1-.305.847c-.143.255-.33.49-.561.703a2.44 2.44 0 0 1-.917.551c-.336.108-.765.164-1.286.164h-1.18l-.327 1.682h-1.378l1.23-6.326h2.649c.797 0 1.378.209 1.744.628.366.417.477 1.001.331 1.751zM17.766 10.207h-.943l-.516 2.648h.838c.557 0 .971-.105 1.242-.314.272-.21.455-.559.551-1.049.092-.47.049-.802-.125-.995s-.524-.29-1.047-.29z"
      />
    </svg>
  )
}

/** Official Postman Vector Logo */
export function PostmanLogo({ className = 'h-4 w-4', size }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <circle cx="12" cy="12" r="11" fill="#FF6C37" />
      <path
        fill="#FFFFFF"
        d="M17.4 9.1c-.2-.4-.6-.7-1.1-.7H7.7c-.5 0-.9.3-1.1.7L4.2 14c-.3.6.1 1.3.8 1.3h14c.7 0 1.1-.7.8-1.3l-2.4-4.9zm-8.8 4.8l1.4-3.3h4l1.4 3.3H8.6z"
      />
    </svg>
  )
}

/** Unified Developer / SDK Code Icon */
export function SdkCodeIcon({ className = 'h-3.5 w-3.5' }: LogoProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}
