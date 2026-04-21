export function StarLogo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="lg" cx="42%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FFE87A"/>
          <stop offset="45%" stopColor="#FFD020"/>
          <stop offset="100%" stopColor="#E8960A"/>
        </radialGradient>
        <radialGradient id="lgs" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C97800"/>
          <stop offset="100%" stopColor="#A05A00"/>
        </radialGradient>
        <radialGradient id="lck" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FF8C5A" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#FF6030" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <path d="M50 18C51 18 53 19 54 22L59 43C60 46 62 48 65 48L86 48C89 48 91 50 92 52C93 55 91 58 89 59L71 71C68 73 67 76 68 79L74 100C75 103 73 106 71 107C69 108 66 107 64 106L50 96C47 95 43 95 40 96L26 106C24 107 21 108 19 107C17 106 15 103 16 100L22 79C23 76 22 73 19 71L1 59C-1 58 -3 55 -2 52C-1 50 1 48 4 48L25 48C28 48 30 46 31 43L36 22C37 19 39 18 40 18Z"
        fill="url(#lgs)" transform="translate(2,2)"/>
      <path d="M50 18C51 18 53 19 54 22L59 43C60 46 62 48 65 48L86 48C89 48 91 50 92 52C93 55 91 58 89 59L71 71C68 73 67 76 68 79L74 100C75 103 73 106 71 107C69 108 66 107 64 106L50 96C47 95 43 95 40 96L26 106C24 107 21 108 19 107C17 106 15 103 16 100L22 79C23 76 22 73 19 71L1 59C-1 58 -3 55 -2 52C-1 50 1 48 4 48L25 48C28 48 30 46 31 43L36 22C37 19 39 18 40 18Z"
        fill="url(#lg)"/>
      <path d="M44 24C46 19 50 18 54 21L59 43C46 28 44 24 44 24Z" fill="white" opacity="0.26"/>
      <ellipse cx="36" cy="66" rx="8" ry="5" fill="url(#lck)"/>
      <ellipse cx="64" cy="66" rx="8" ry="5" fill="url(#lck)"/>
      <path d="M33 57Q38 50 43 57" fill="none" stroke="#3C2000" strokeWidth="2.8" strokeLinecap="round"/>
      <path d="M57 57Q62 50 67 57" fill="none" stroke="#3C2000" strokeWidth="2.8" strokeLinecap="round"/>
      <path d="M32 67Q50 85 68 67" fill="none" stroke="#3C2000" strokeWidth="2.8" strokeLinecap="round"/>
    </svg>
  )
}
