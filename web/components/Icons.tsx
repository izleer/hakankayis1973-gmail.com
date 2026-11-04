import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'leaf'
  | 'sprout'
  | 'paw'
  | 'car'
  | 'bike'
  | 'home'
  | 'map'
  | 'frame'
  | 'clock'
  | 'sparkles'
  | 'grid'
  | 'archive'
  | 'compass'
  | 'bell'
  | 'plus'
  | 'search'
  | 'arrow-right'
  | 'arrow-left'
  | 'close'
  | 'camera'
  | 'file'
  | 'heart'
  | 'message'
  | 'calendar'
  | 'pin'
  | 'lock'
  | 'eye'
  | 'users'
  | 'logout'
  | 'more'
  | 'chevron-down'
  | 'check'
  | 'upload'
  | 'trash'
  | 'edit'
  | 'book'
  | 'image'
  | 'send'
  | 'menu'
  | 'download'
  | 'ruler'
  | 'user'
  | 'share'
  | 'facebook'
  | 'instagram'
  | 'globe';

const paths: Record<IconName, ReactNode> = {
  leaf: (
    <>
      <path d="M20 4c0 8-5.5 14-12 14H4c0-8 5.5-14 12-14h4Z" />
      <path d="M4 20c2.5-5 6.5-9 12-11" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13C9 13 5 10 5 5c5 0 7 3 7 8Z" />
      <path d="M12 10c3 0 7-3 7-7-5 0-7 2-7 7Z" />
    </>
  ),
  paw: (
    <>
      <ellipse cx="7" cy="9" rx="2" ry="2.6" />
      <ellipse cx="12" cy="7" rx="2" ry="2.7" />
      <ellipse cx="17" cy="9" rx="2" ry="2.6" />
      <path d="M12 12c3 0 5 2 5 4.2 0 2-1.7 3.3-3.4 2.7-.6-.2-1-.4-1.6-.4s-1 .2-1.6.4C8.7 19.5 7 18.2 7 16.2 7 14 9 12 12 12Z" />
    </>
  ),
  car: (
    <>
      <path d="M4 16v-3l2-5h12l2 5v3" />
      <path d="M4 16h16v3h-3v-2H7v2H4v-3Z" />
      <path d="M7 11h10" />
    </>
  ),
  bike: (
    <>
      <circle cx="6" cy="17" r="3.5" />
      <circle cx="18" cy="17" r="3.5" />
      <path d="m9 17 4-7 3 7M10 10h4M8 7h4" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  frame: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <rect x="8" y="8" width="8" height="8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </>
  ),
  archive: (
    <>
      <path d="M4 7h16v13H4V7Z" />
      <path d="M3 4h18v3H3V4Z" />
      <path d="M9 12h6" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  'arrow-right': <path d="M5 12h14m-5-5 5 5-5 5" />,
  'arrow-left': <path d="M19 12H5m5-5-5 5 5 5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  camera: (
    <>
      <path d="M4 8h4l2-3h4l2 3h4v11H4V8Z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6V3Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  heart: (
    <path d="M12 20s-7-4.4-7-9.4A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.6C19 15.6 12 20 12 20Z" />
  ),
  message: (
    <>
      <path d="M4 5h16v11H9l-5 4V5Z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="1.5" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  eye: (
    <>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5.5a3 3 0 0 1 0 5.6M17 14c2.4.6 4 2.6 4 5" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5v16h5" />
      <path d="M14 8l4 4-4 4M8 12h10" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  check: <path d="m5 12 5 5L20 7" />,
  upload: (
    <>
      <path d="M12 16V4m-5 5 5-5 5 5" />
      <path d="M4 16v4h16v-4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 3h6l1 4H8l1-4ZM6 7l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="m4 20 4.5-1L20 7.5 16.5 4 5 15.5 4 20Z" />
      <path d="m14 6 4 4" />
    </>
  ),
  book: (
    <>
      <path d="M4 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4V4Z" />
      <path d="M20 4h-4a3 3 0 0 0-2 1v15a2.5 2.5 0 0 1 2.5-2.5H20V4Z" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <circle cx="8.5" cy="9" r="1.6" />
      <path d="m4 18 5.5-6 4 4 2.5-3 4 5" />
    </>
  ),
  send: (
    <>
      <path d="M21 3 3 10l7 3 3 7 8-17Z" />
      <path d="m10 13 5-5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  download: (
    <>
      <path d="M12 4v11m-4-4 4 4 4-4" />
      <path d="M5 20h14" />
    </>
  ),
  ruler: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="1" transform="rotate(-45 12 12)" />
      <path d="m8 9 2 2M11 6l2 2M5 12l2 2M14 3l2 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="2.8" />
      <circle cx="6" cy="12" r="2.8" />
      <circle cx="18" cy="19" r="2.8" />
      <path d="m8.5 10.6 7-4.2M8.5 13.4l7 4.2" />
    </>
  ),
  facebook: (
    <path
      d="M14 8.5h3V4.5h-3c-2.6 0-4.7 2.1-4.7 4.7v2.3H6.5v4h2.8v8h4v-8h3.2l.5-4h-3.7V9.2c0-.4.3-.7.7-.7Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.6 2.6 4 5.6 4 9s-1.4 6.4-4 9c-2.6-2.6-4-5.6-4-9s1.4-6.4 4-9Z" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
