import type { SVGProps } from "react";

function make(d: string) {
  return function Icon({ className = "h-4 w-4", ...rest }: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
        strokeLinejoin="round" className={className} aria-hidden {...rest}>
        <path d={d} />
      </svg>
    );
  };
}

export const IconGrid = make("M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z");
export const IconAlert = make("M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01");
export const IconCube = make("M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12");
export const IconChart = make("M18 20V10M12 20V4M6 20v-6");
export const IconSliders = make("M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6");
export const IconUser = make("M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z");
export const IconLogout = make("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9");
export const IconBell = make("M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0");
export const IconSparkle = make("M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z");
export const IconBook = make("M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5");
export const IconMenu = make("M3 6h18M3 12h18M3 18h18");
export const IconClose = make("M18 6L6 18M6 6l12 12");
export const IconSend = make("M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z");
export const IconTrash = make("M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6");
export const IconClock = make("M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2");
export const IconServer = make("M2 3h20v7H2zM2 14h20v7H2zM6 6.5h.01M6 17.5h.01");
export const IconShield = make("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z");
export const IconTarget = make("M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z");
export const IconCpu = make("M4 4h16v16H4zM9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3");
export const IconZap = make("M13 2L3 14h9l-1 8 10-12h-9l1-8z");
export const IconCheck = make("M20 6L9 17l-5-5");

export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2l11 4v9c0 7-5 12-11 15C10 27 5 22 5 15V6z" fill="none" stroke="#2fbfae" strokeWidth="2" strokeLinejoin="round" />
      <path d="M11 15l4 4 7-8" fill="none" stroke="#2fbfae" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
