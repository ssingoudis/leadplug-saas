export const Icons = {
  House: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 6L4 28h6v28h44V28h6L32 6zm18 46H14V30h36v22z" />
    </svg>
  ),
  Apartment: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M12 8v48h40V8H12zm36 44H16V12h32v40z" />
      <rect x="20" y="16" width="6" height="6" />
      <rect x="29" y="16" width="6" height="6" />
      <rect x="38" y="16" width="6" height="6" />
      <rect x="20" y="26" width="6" height="6" />
      <rect x="29" y="26" width="6" height="6" />
      <rect x="38" y="26" width="6" height="6" />
      <rect x="20" y="36" width="6" height="6" />
      <rect x="29" y="36" width="6" height="6" />
      <rect x="38" y="36" width="6" height="6" />
      <rect x="26" y="46" width="12" height="10" />
    </svg>
  ),
  Factory: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M4 56h56V24L44 36V24L28 36V16H4v40z" />
      <rect x="8" y="44" width="8" height="8" />
      <rect x="20" y="44" width="8" height="8" />
    </svg>
  ),
  HousePartial: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 6L4 28h6v28h44V28h6L32 6zm18 46H14V30h36v22z" />
      <rect x="24" y="38" width="16" height="16" />
    </svg>
  ),
  SolarPanel: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M10 14L4 52h50l6-38H10z" />
      <line x1="22" y1="14" x2="18" y2="52" stroke="#fff" strokeWidth="1.5" />
      <line x1="34" y1="14" x2="30" y2="52" stroke="#fff" strokeWidth="1.5" />
      <line x1="46" y1="14" x2="42" y2="52" stroke="#fff" strokeWidth="1.5" />
      <line x1="6" y1="33" x2="58" y2="33" stroke="#fff" strokeWidth="1.5" />
    </svg>
  ),
  Thermometer: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M28 8a4 4 0 0 1 8 0v31.1a10 10 0 1 1-8 0V8zm4 48a6 6 0 0 0 2-11.6V12a2 2 0 0 0-4 0v32.4A6 6 0 0 0 32 56z" />
      <circle cx="32" cy="50" r="4" />
      <rect x="30" y="16" width="4" height="30" rx="1" />
    </svg>
  ),
  Flame: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 4c-2 10-14 16-14 30 0 10 6 22 14 22s14-12 14-22c0-8-4-12-4-18-3 5-7 6-10 6 0-6 0-10 0-18z" />
    </svg>
  ),
  HeatPump: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M8 12h48v36H8V12zm4 4v28h40V16H12z" />
      <circle cx="32" cy="30" r="10" />
      <circle cx="32" cy="30" r="3" fill="#fff" />
      <path
        d="M32 20c-2 3-2 7 0 10 2-3 6-3 10 0-3-2-3-6 0-10-3 2-7 2-10 0z"
        fill="#fff"
      />
      <rect x="14" y="50" width="8" height="6" />
      <rect x="42" y="50" width="8" height="6" />
    </svg>
  ),
  Drop: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 4C22 20 14 32 14 42c0 10 8 18 18 18s18-8 18-18c0-10-8-22-18-38z" />
    </svg>
  ),
  Snowflake: ({ color = "#444" }: { color?: string }) => (
    <svg
      viewBox="0 0 64 64"
      className="w-full h-full"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    >
      <line x1="32" y1="6" x2="32" y2="58" />
      <line x1="6" y1="32" x2="58" y2="32" />
      <line x1="13" y1="13" x2="51" y2="51" />
      <line x1="51" y1="13" x2="13" y2="51" />
      <polyline points="26,10 32,16 38,10" />
      <polyline points="26,54 32,48 38,54" />
      <polyline points="10,26 16,32 10,38" />
      <polyline points="54,26 48,32 54,38" />
    </svg>
  ),
  Wrench: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M52.3 17.7l-7.1 7.1-5.6-5.6 7.1-7.1c-7 .4-11.5 3-13.7 7.9-1.6 3.6-1.4 7.4.1 10.6L9.9 52.7c-1.6 1.6-1.6 4.1 0 5.7 1.6 1.6 4.1 1.6 5.7 0l23-23c3.2 1.5 7 1.7 10.6.1 4.9-2.2 7.5-6.7 7.9-13.7l-4.8-4.1z" />
    </svg>
  ),
  Lightning: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M36 4L12 36h14l-4 24 26-34H34l4-22z" />
    </svg>
  ),
  Star: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 4l8.6 17.4L60 24.2 46 37.8l3.3 19.2L32 48l-17.3 9 3.3-19.2L4 24.2l19.4-2.8L32 4z" />
    </svg>
  ),
  Check: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M24 48L8 32l4-4 12 12 28-28 4 4L24 48z" />
    </svg>
  ),
  Cross: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M48 20l-4-4-12 12-12-12-4 4 12 12-12 12 4 4 12-12 12 12 4-4-12-12z" />
    </svg>
  ),
  Question: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M32 8c-8.8 0-16 7.2-16 16h6c0-5.5 4.5-10 10-10s10 4.5 10 10c0 4.1-2.5 7.8-6.3 9.4-2.8 1.2-5.7 4.2-5.7 8.6v4h6v-4c0-1.6.9-3.2 2.7-4 6-2.5 9.3-8.5 9.3-14 0-8.8-7.2-16-16-16zm-3 44h6v6h-6v-6z" />
    </svg>
  ),
  Euro: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M42 12c-9 0-16 5-19 14H14v4h8c0 1-.1 2-.1 3s.1 2 .1 3h-8v4h9c3 9 10 14 19 14 4 0 8-1 11-4l-3-5c-2 2-5 3-8 3-5 0-10-3-12-8h14v-4H29c0-1 0-2 0-3s0-2 0-3h17v-4H30c2-5 7-8 12-8 3 0 6 1 8 3l3-5c-3-3-7-4-11-4z" />
    </svg>
  ),
  Document: ({ color = "#444" }: { color?: string }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M40 4H16v56h32V12L40 4zm4 52H20V8h16v8h8v40z" />
      <rect x="24" y="24" width="16" height="3" />
      <rect x="24" y="32" width="16" height="3" />
      <rect x="24" y="40" width="10" height="3" />
    </svg>
  ),
  Calendar: ({
    color = "#444",
    text = "",
  }: {
    color?: string;
    text?: string;
  }) => (
    <svg viewBox="0 0 64 64" className="w-full h-full" fill={color}>
      <path d="M52 8h-4V4h-4v4H20V4h-4v4h-4c-2.2 0-4 1.8-4 4v40c0 2.2 1.8 4 4 4h40c2.2 0 4-1.8 4-4V12c0-2.2-1.8-4-4-4zm0 44H12V20h40v32z" />
      <text
        x="32"
        y="44"
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fontFamily="Arial"
      >
        {text}
      </text>
    </svg>
  ),
}

export function renderIcon(
  iconKey: string,
  iconUrl?: string,
  iconProps?: Record<string, string>,
) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className="w-full h-full object-contain"
        loading="lazy"
      />
    )
  }
  const IconComponent = Icons[iconKey as keyof typeof Icons]
  if (!IconComponent) return null
  return <IconComponent {...iconProps} />
}
