import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState } from '@iobroker/types-vis-2';
import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';
import { renderBatteryIcon, renderReachableIcon } from './icons';

interface FensterWidgetRxData {
    oidWindow: string;
    invertWindow: boolean;
    oidReachable: string;
    invertReachable: boolean;
    oidBattery: string;
    oidBattLow: string;
}

// Dedicated single-window status widget (separate from the small per-window icons embedded in
// HeizungWidget's window column). Layout: big center icon (green = closed / grey = open - this
// icon stays strictly 2-color, since reachability gets its own separate indicator here instead
// of overriding the window color), top-right = reachability (WLAN-style wave icon, shared with
// HeizungWidget's main reachability indicator), bottom-right = battery (shared battery icon,
// same as every other widget in this package).
export default class FensterWidget extends (window.visRxWidget as typeof VisRxWidget)<
    FensterWidgetRxData,
    VisRxWidgetState
> {
    static adapter: any;

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplFensterWidget',
            visSet: 'lordener-widgets',
            visSetLabel: 'lordener_widgets_set',
            visSetColor: '#ff7a1a',
            visName: 'Fenster',
            visAttrs: [
                {
                    name: 'window',
                    label: 'fenster_window_group',
                    fields: [
                        { name: 'oidWindow', type: 'id', label: 'oid_fenster_state' },
                        { name: 'invertWindow', type: 'checkbox', label: 'invert_fenster_state', default: false },
                    ],
                },
                {
                    name: 'reachable',
                    label: 'fenster_reachable_group',
                    fields: [
                        { name: 'oidReachable', type: 'id', label: 'oid_fenster_reachable' },
                        {
                            name: 'invertReachable',
                            type: 'checkbox',
                            label: 'invert_fenster_reachable',
                            default: false,
                        },
                    ],
                },
                {
                    name: 'battery',
                    label: 'fenster_battery_group',
                    fields: [
                        { name: 'oidBattery', type: 'id', label: 'oid_fenster_battery' },
                        { name: 'oidBattLow', type: 'id', label: 'oid_fenster_batt_low' },
                    ],
                },
            ],
            visPrev: 'widgets/lordener-widgets/img/lordener-widgets.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    propertiesUpdate(): void {
        // nothing to precompute
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.propertiesUpdate();
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return FensterWidget.getWidgetInfo();
    }

    static getI18nPrefix(): string {
        return `${FensterWidget.adapter}_`;
    }

    onRxDataChanged(): void {
        this.propertiesUpdate();
    }

    // eslint-disable-next-line class-methods-use-this
    onRxStyleChanged(): void {
        // not used
    }

    // eslint-disable-next-line class-methods-use-this
    onStateUpdated(_id: string, _state: ioBroker.State | null | undefined): void {
        // not used, values already land in this.state.values
    }

    getVal(oid: string): any {
        if (!oid) {
            return undefined;
        }
        const state = this.state.values[`${oid}.val`];
        return state === undefined ? undefined : state;
    }

    // Big center window pictogram, strictly 2-color (green = closed / grey = open). Deliberately
    // does NOT turn red for "not reachable" like the compact icon in HeizungWidget does - here
    // reachability has its own separate top-right indicator instead.
    // eslint-disable-next-line class-methods-use-this
    renderWindowGraphic(open: boolean): React.JSX.Element {
        const color = open ? '#888' : '#43a047';
        return (
            <svg
                viewBox="0 0 24 24"
                style={{ width: 'auto', height: '100%', maxWidth: '100%' }}
                preserveAspectRatio="xMidYMid meet"
            >
                <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke={color} strokeWidth="2" />
                <line x1="12" y1="3" x2="12" y2="21" stroke={color} strokeWidth="2" />
                <line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" />
            </svg>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const { oidWindow, invertWindow, oidReachable, invertReachable, oidBattery, oidBattLow } = this.state.rxData;

        let open = !!this.getVal(oidWindow);
        if (invertWindow) {
            open = !open;
        }

        let isReachable = true;
        if (oidReachable) {
            isReachable = !!this.getVal(oidReachable);
            if (invertReachable) {
                isReachable = !isReachable;
            }
        }

        const batteryRaw = this.getVal(oidBattery);
        const batteryPercent =
            batteryRaw === undefined || batteryRaw === null || batteryRaw === ''
                ? undefined
                : typeof batteryRaw === 'number'
                  ? batteryRaw
                  : parseFloat(batteryRaw);
        const battLow = !!this.getVal(oidBattLow);

        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: 8,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    color: '#fff',
                }}
            >
                {/* top row: reachability (right) - consistent with every other widget */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 20 }}>
                    {oidReachable ? renderReachableIcon(isReachable, 20) : null}
                </div>

                {/* center: big window icon */}
                <div
                    style={{
                        flex: '1 1 auto',
                        minHeight: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {this.renderWindowGraphic(open)}
                </div>

                {/* bottom row: battery (right) - consistent with every other widget */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: 16 }}>
                    {oidBattery || oidBattLow ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {renderBatteryIcon(batteryPercent, battLow, 20)}
                            {batteryPercent !== undefined ? (
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{Math.round(batteryPercent)}%</span>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }
}
