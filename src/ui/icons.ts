const svg = (body: string, fill = false) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICON = {
  pause: svg('<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>'),
  play: svg('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  next: svg('<path d="M9 5l7 7-7 7"/>'),
  retry: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>'),
  levels: svg('<path d="M4 19h16M6 19V9l6-4 6 4v10"/><path d="M10 19v-5h4v5"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" stroke="none"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  sound: svg('<path d="M4 10v4h4l5 4V6L8 10z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
  soundOff: svg('<path d="M4 10v4h4l5 4V6L8 10z" fill="currentColor"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>'),
  music: svg('<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.5" fill="currentColor"/><circle cx="17" cy="16" r="2.5" fill="currentColor"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>'),
  dash: svg('<path d="M3 7h9M2 12h7M4 17h8M13 5l8 7-8 7"/>'),
  hammer: svg('<path d="M4 19l10-10M10 5l4-4 9 9-4 4z"/><path d="M2 21l3-1-1-3"/>'),
  sword: svg('<path d="M14.5 4H20v5.5L10 19.5 4.5 14z"/><path d="M7 11.5l5.5 5.5M5 19l2-2"/>'),
  shield: svg('<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/><path d="M12 8v6M9 11h6"/>'),
  jump: svg('<path d="M12 19V6M6 11l6-6 6 6"/>'),
  lamp: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c2.5 3 4 5.2 4 7.6A4 4 0 0 1 12 14a4 4 0 0 1-4-4.4C8 7.2 9.5 5 12 2z" fill="currentColor"/><path d="M5 17h14l-2 4H7z" fill="currentColor" opacity=".75"/></svg>`,
};
