import React from 'react';

// Small status pictograms shared by every widget in this package (instead of each widget
// re-implementing its own), so battery/reachability rendering looks and behaves identically
// everywhere: reachability always top-right as a WLAN-style wave icon, battery always
// bottom-right as this same body+fill icon.

// A little 4-pane window pictogram (frame + cross), colored by state.
export function renderWindowIcon(color: string, title: string, size = 18): React.JSX.Element {
    // `title` isn't a typed SVG root attribute, so it goes on a wrapping span (also gives us a
    // normal HTML tooltip).
    return (
        <span style={{ display: 'inline-flex' }} title={title}>
            <svg width={size} height={size} viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke={color} strokeWidth="2" />
                <line x1="12" y1="3" x2="12" y2="21" stroke={color} strokeWidth="2" />
                <line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" />
            </svg>
        </span>
    );
}

// A battery pictogram (body + terminal nub) instead of plain text/rectangle. When `percent`
// is known, the fill level reflects it; otherwise (some sensors only report low/not low) it
// just shows full vs. nearly empty. Color follows the low-battery flag either way.
export function renderBatteryIcon(
    percent: number | undefined,
    low: boolean,
    size = 18,
    title?: string,
): React.JSX.Element {
    const clampedPercent =
        typeof percent === 'number' && !Number.isNaN(percent) ? Math.max(0, Math.min(100, percent)) : undefined;
    const fillWidth = clampedPercent !== undefined ? Math.round((clampedPercent / 100) * 16) : low ? 3 : 16;
    const color = low ? '#e53935' : '#43a047';
    const computedTitle =
        title ?? (clampedPercent !== undefined ? `Batterie: ${clampedPercent}%` : low ? 'Batterie niedrig' : 'Batterie ok');

    return (
        <span style={{ display: 'inline-flex' }} title={computedTitle}>
            <svg width={size} height={size * 0.6} viewBox="0 0 26 14">
                <rect x="1" y="1" width="22" height="12" rx="2" fill="none" stroke={color} strokeWidth="1.5" />
                <rect x="24" y="4.5" width="2" height="5" rx="1" fill={color} />
                {fillWidth > 0 ? <rect x="3" y="3" width={fillWidth} height="8" fill={color} /> : null}
            </svg>
        </span>
    );
}

// WLAN-style "reachable" pictogram: a dot plus two concentric signal arcs, all in one color
// (green = reachable, red = not reachable). This is a binary reachable/unreachable indicator,
// not a signal-strength meter, so there's no partial-arc state.
export function renderReachableIcon(reachable: boolean, size = 18, title?: string): React.JSX.Element {
    const color = reachable ? '#43a047' : '#e53935';
    const computedTitle = title ?? (reachable ? 'erreichbar' : 'nicht erreichbar');

    return (
        <span style={{ display: 'inline-flex' }} title={computedTitle}>
            <svg width={size} height={size} viewBox="0 0 24 24">
                <circle cx="12" cy="19" r="1.6" fill={color} />
                <path d="M8 15.5a6 6 0 0 1 8 0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M5 11.5a11 11 0 0 1 14 0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
            </svg>
        </span>
    );
}
