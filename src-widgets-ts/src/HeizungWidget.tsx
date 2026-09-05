import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetProps, VisRxWidgetState } from '@iobroker/types-vis-2';
import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';
import { renderBatteryIcon, renderReachableIcon, renderWindowIcon } from './icons';

export interface HeizungWidgetState extends VisRxWidgetState {
    modeStates?: Record<string, string>;
}

interface HeizungWidgetRxData {
    oidSetTemp: string;
    oidActualTemp: string;
    oidWindow1: string;
    oidWindow1Reachable: string;
    oidWindow1BattLow: string;
    oidWindow2: string;
    oidWindow2Reachable: string;
    oidWindow2BattLow: string;
    oidReachable: string;
    oidBattery: string;
    oidBattLow: string;
    oidMode: string;
    step: number;
    invertWindow: boolean;
    invertReachable: boolean;
}

// Universal thermostat widget for 8 rooms.
// Layout: center = set temp (big) / actual temp (small) below it, +/- buttons left/right of the temps,
// top-left = window icon(s) + their battery icon, top-right = reachability (WLAN-style wave icon,
// shared with every other widget in this package), bottom-left = mode switch,
// bottom-right = battery icon + % (color-coded by batt_low, same shared icon everywhere).
export default class HeizungWidget extends (window.visRxWidget as typeof VisRxWidget)<
    HeizungWidgetRxData,
    HeizungWidgetState
> {
    static adapter: any;

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplHeizungWidget',
            visSet: 'lordener-widgets',
            visSetLabel: 'lordener_widgets_set',
            visSetColor: '#ff7a1a',
            visName: 'Heizung',
            visAttrs: [
                {
                    name: 'temperature',
                    label: 'temperature',
                    fields: [
                        { name: 'oidSetTemp', type: 'id', label: 'oid_set_temp' },
                        { name: 'oidActualTemp', type: 'id', label: 'oid_actual_temp' },
                        { name: 'step', type: 'number', label: 'step', default: 1 },
                    ],
                },
                {
                    name: 'window1',
                    label: 'window1',
                    fields: [
                        { name: 'oidWindow1', type: 'id', label: 'oid_window1' },
                        { name: 'oidWindow1Reachable', type: 'id', label: 'oid_window_reachable' },
                        { name: 'oidWindow1BattLow', type: 'id', label: 'oid_window_batt_low' },
                    ],
                },
                {
                    name: 'window2',
                    label: 'window2',
                    fields: [
                        { name: 'oidWindow2', type: 'id', label: 'oid_window2' },
                        { name: 'oidWindow2Reachable', type: 'id', label: 'oid_window_reachable' },
                        { name: 'oidWindow2BattLow', type: 'id', label: 'oid_window_batt_low' },
                    ],
                },
                {
                    name: 'status',
                    label: 'status',
                    fields: [
                        { name: 'invertWindow', type: 'checkbox', label: 'invert_window', default: false },
                        { name: 'oidReachable', type: 'id', label: 'oid_reachable' },
                        {
                            name: 'invertReachable',
                            type: 'checkbox',
                            label: 'invert_reachable',
                            default: false,
                        },
                        { name: 'oidBattery', type: 'id', label: 'oid_battery' },
                        { name: 'oidBattLow', type: 'id', label: 'oid_batt_low' },
                        { name: 'oidMode', type: 'id', label: 'oid_mode' },
                    ],
                },
            ],
            visPrev: 'widgets/lordener-widgets/img/lordener-widgets.png',
        };
    }

    private lastModeOid: string | undefined;

    // eslint-disable-next-line class-methods-use-this
    propertiesUpdate(): void {
        // nothing to precompute
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.propertiesUpdate();
        this.lastModeOid = this.state.rxData.oidMode;
        void this.loadModeStates(this.state.rxData.oidMode);
    }

    // Reads the enum of possible values (common.states) for the mode OID, so we can
    // show a readable label and cycle through the allowed values on click.
    async loadModeStates(oid: string | undefined): Promise<void> {
        if (!oid) {
            this.setState({ modeStates: undefined });
            return;
        }
        try {
            const obj = await this.props.context.socket.getObject(oid);
            const rawStates = obj?.common?.states as Record<string, string> | string[] | undefined;
            let normalized: Record<string, string> | undefined;
            if (Array.isArray(rawStates)) {
                normalized = {};
                rawStates.forEach((label, idx) => {
                    (normalized as Record<string, string>)[String(idx)] = label;
                });
            } else if (rawStates && typeof rawStates === 'object') {
                normalized = rawStates;
            }
            this.setState({ modeStates: normalized });
        } catch (e) {
            this.setState({ modeStates: undefined });
        }
    }

    cycleMode(): void {
        const oid = this.state.rxData.oidMode;
        if (!oid) {
            return;
        }
        const states = this.state.modeStates;
        if (!states || !Object.keys(states).length) {
            return;
        }
        const keys = Object.keys(states);
        const current = this.getVal(oid);
        const currentKey = current === undefined || current === null ? undefined : String(current);
        const idx = currentKey !== undefined ? keys.indexOf(currentKey) : -1;
        const nextKey = keys[(idx + 1) % keys.length];
        const nextVal = typeof current === 'number' ? Number(nextKey) : nextKey;
        this.props.context.setValue(oid, nextVal);
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return HeizungWidget.getWidgetInfo();
    }

    static getI18nPrefix(): string {
        return `${HeizungWidget.adapter}_`;
    }

    onRxDataChanged(): void {
        this.propertiesUpdate();
        if (this.state.rxData.oidMode !== this.lastModeOid) {
            this.lastModeOid = this.state.rxData.oidMode;
            void this.loadModeStates(this.state.rxData.oidMode);
        }
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

    // One window's status: window-shaped icon (green = closed / grey = open / red = its own
    // sensor unreachable) with a small battery-low icon underneath, if that OID is bound.
    renderWindowColumn(
        oid: string,
        oidReachableW: string,
        oidBattLowW: string,
        invertWindow: boolean,
        invertReachable: boolean,
    ): React.JSX.Element | null {
        if (!oid) {
            return null;
        }

        let open = !!this.getVal(oid);
        if (invertWindow) {
            open = !open;
        }

        let reachable = true;
        if (oidReachableW) {
            reachable = !!this.getVal(oidReachableW);
            if (invertReachable) {
                reachable = !reachable;
            }
        }

        const battLow = oidBattLowW ? !!this.getVal(oidBattLowW) : false;
        // grün = geschlossen, grau = offen, rot = Fenstersensor nicht erreichbar
        const color = !reachable ? '#e53935' : open ? '#888' : '#43a047';
        const title = !reachable ? 'nicht erreichbar' : open ? 'Fenster offen' : 'Fenster geschlossen';

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                {renderWindowIcon(color, title)}
                {oidBattLowW ? renderBatteryIcon(undefined, battLow, 14) : null}
            </div>
        );
    }

    changeSetTemp(delta: number): void {
        const oid = this.state.rxData.oidSetTemp;
        if (!oid) {
            return;
        }
        const current = this.getVal(oid);
        const currentNum = typeof current === 'number' ? current : parseFloat(current) || 0;
        // rxData "number" fields can come back as strings from the vis-2 editor, so `delta`
        // is not guaranteed to be a real number here. Without this coercion, `currentNum + delta`
        // silently falls back to JS string concatenation (e.g. 21 + "1" === "211"), which is
        // exactly the "a 1 gets appended to the temperature" bug instead of a numeric +1.
        const deltaNum = typeof delta === 'number' ? delta : parseFloat(delta as unknown as string) || 0;
        const next = Math.round((currentNum + deltaNum) * 10) / 10;
        // Write the new set-point back to ioBroker
        this.props.context.setValue(oid, next);
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const {
            oidSetTemp,
            oidActualTemp,
            oidWindow1,
            oidWindow1Reachable,
            oidWindow1BattLow,
            oidWindow2,
            oidWindow2Reachable,
            oidWindow2BattLow,
            oidReachable,
            oidBattery,
            oidBattLow,
            oidMode,
            step,
            invertWindow,
            invertReachable,
        } = this.state.rxData;

        const setTemp = this.getVal(oidSetTemp);
        const actualTemp = this.getVal(oidActualTemp);
        const reachable = this.getVal(oidReachable);
        const battery = this.getVal(oidBattery);
        const battLow = this.getVal(oidBattLow);
        const modeVal = this.getVal(oidMode);

        // Same "number field can arrive as a string" issue as in changeSetTemp() - coerce here too.
        const stepSize = Number(step) || 1;

        const window1Col = this.renderWindowColumn(
            oidWindow1,
            oidWindow1Reachable,
            oidWindow1BattLow,
            invertWindow,
            invertReachable,
        );
        const window2Col = this.renderWindowColumn(
            oidWindow2,
            oidWindow2Reachable,
            oidWindow2BattLow,
            invertWindow,
            invertReachable,
        );

        // if not bound, assume reachable; many Zigbee setups expose an "unreach" style OID
        // instead of "reachable", hence the invert option
        let isReachable = true;
        if (oidReachable) {
            isReachable = !!reachable;
            if (invertReachable) {
                isReachable = !isReachable;
            }
        }

        const modeLabel =
            modeVal === undefined
                ? '--'
                : ((this.state.modeStates && this.state.modeStates[String(modeVal)]) ?? String(modeVal));

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
                {/* top row: window status icons (left) + overall reachability (right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minHeight: 20 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {window1Col}
                        {window2Col}
                    </div>
                    <div style={{ marginTop: 2 }}>{oidReachable ? renderReachableIcon(isReachable, 20) : null}</div>
                </div>

                {/* center: +/- buttons and temperatures */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flex: 1 }}>
                    <button
                        type="button"
                        onClick={() => this.changeSetTemp(-stepSize)}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: 'none',
                            fontSize: 20,
                            fontWeight: 700,
                            backgroundColor: '#333',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        −
                    </button>
                    <div style={{ textAlign: 'center', minWidth: 70 }}>
                        <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>
                            {setTemp === undefined ? '--' : setTemp}°
                        </div>
                        <div style={{ fontSize: 16, opacity: 0.7 }}>{actualTemp === undefined ? '--' : actualTemp}°</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => this.changeSetTemp(stepSize)}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            border: 'none',
                            fontSize: 20,
                            fontWeight: 700,
                            backgroundColor: '#333',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        +
                    </button>
                </div>

                {/* bottom row: mode switch (left) + battery (right) - battery position is kept
                    consistent with every other widget in this package (bottom-right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 16 }}>
                    {oidMode ? (
                        <div
                            onClick={() => this.cycleMode()}
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 4,
                                backgroundColor: '#333',
                                color: '#fff',
                                cursor: 'pointer',
                            }}
                            title="Modus wechseln"
                        >
                            {modeLabel}
                        </div>
                    ) : (
                        <div />
                    )}
                    {oidBattery ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {renderBatteryIcon(typeof battery === 'number' ? battery : parseFloat(battery), battLow, 20)}
                            <span style={{ fontSize: 12, fontWeight: 600 }}>
                                {battery === undefined ? '--' : battery}%
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }
}
