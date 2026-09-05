import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetProps, VisRxWidgetState } from '@iobroker/types-vis-2';
import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';

export interface AlarmWidgetState extends VisRxWidgetState {
    showPinPopup?: boolean;
    pendingModeKey?: ModeKey;
    pinInput?: string;
    pinError?: boolean;
}

interface AlarmWidgetRxData {
    oidStatusText: string;
    oidFullActive: string;
    oidFullSet: string;
    iconFull: string;
    oidInnenActive: string;
    oidInnenSet: string;
    iconInnen: string;
    oidOffActive: string;
    oidOffSet: string;
    iconOff: string;
    buttonSize: number;
    oidPinWrite: string;
    oidPinWrong: string;
}

type ModeKey = 'full' | 'innen' | 'off';

// Fixed 3 modes (not read from common.states anymore): each has its own "active" input OID
// (is this mode currently the one running) and its own "set" output OID (write true once to
// request switching to it - the alarm panel itself handles the actual mode change/reset).
const MODE_DEFS: { key: ModeKey; label: string; color: string }[] = [
    { key: 'full', label: 'Voll', color: '#e53935' },
    { key: 'innen', label: 'Innen', color: '#fb8c00' },
    { key: 'off', label: 'Aus', color: '#43a047' },
];

// Small alarm-panel widget: top line shows a free-text status string (e.g. "Alarm ausgelöst"),
// below that one button per mode (Voll/Innen/Aus). Each mode has a separate "active" input
// (highlights the currently running mode) and a separate "set" output (written once on click
// to request that mode). Switching optionally requires a 4-digit PIN, entered via an on-screen
// numpad popup (no "PIN write" OID bound => switches happen immediately, no popup).
//
// PIN protocol (matches the real installed alarm panel, confirmed 05.09.2026): the widget
// never checks the PIN itself. On confirm it writes the target mode's "set" OID (true) AND
// the entered PIN (as a string) to the "PIN write" OID, then waits - no client-side timeout -
// for the panel to react: either the "PIN wrong" OID flips (show error, let the user retry) or
// the target mode's "active" OID flips (panel accepted it and switched mode -> close popup).
export default class AlarmWidget extends (window.visRxWidget as typeof VisRxWidget)<
    AlarmWidgetRxData,
    AlarmWidgetState
> {
    static adapter: any;

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplAlarmWidget',
            visSet: 'lordener-widgets',
            visSetLabel: 'lordener_widgets_set',
            visSetColor: '#ff7a1a',
            visName: 'Alarm',
            visAttrs: [
                {
                    name: 'status',
                    label: 'alarm_status_group',
                    fields: [{ name: 'oidStatusText', type: 'id', label: 'oid_status_text' }],
                },
                {
                    name: 'full',
                    label: 'alarm_group_full',
                    fields: [
                        { name: 'oidFullActive', type: 'id', label: 'oid_mode_input_active' },
                        { name: 'oidFullSet', type: 'id', label: 'oid_mode_output_set' },
                        { name: 'iconFull', type: 'icon64', label: 'oid_mode_icon' },
                    ],
                },
                {
                    name: 'innen',
                    label: 'alarm_group_innen',
                    fields: [
                        { name: 'oidInnenActive', type: 'id', label: 'oid_mode_input_active' },
                        { name: 'oidInnenSet', type: 'id', label: 'oid_mode_output_set' },
                        { name: 'iconInnen', type: 'icon64', label: 'oid_mode_icon' },
                    ],
                },
                {
                    name: 'off',
                    label: 'alarm_group_off',
                    fields: [
                        { name: 'oidOffActive', type: 'id', label: 'oid_mode_input_active' },
                        { name: 'oidOffSet', type: 'id', label: 'oid_mode_output_set' },
                        { name: 'iconOff', type: 'icon64', label: 'oid_mode_icon' },
                    ],
                },
                {
                    name: 'layout',
                    label: 'alarm_layout_group',
                    fields: [{ name: 'buttonSize', type: 'number', label: 'button_size', default: 48 }],
                },
                {
                    name: 'pin',
                    label: 'alarm_pin_group',
                    fields: [
                        { name: 'oidPinWrite', type: 'id', label: 'oid_pin_write' },
                        { name: 'oidPinWrong', type: 'id', label: 'oid_pin_wrong' },
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
        return AlarmWidget.getWidgetInfo();
    }

    static getI18nPrefix(): string {
        return `${AlarmWidget.adapter}_`;
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

    // Looks up the active/set OID pair for one of the 3 fixed modes.
    getModeOids(key: ModeKey): { active: string; set: string } {
        const { oidFullActive, oidFullSet, oidInnenActive, oidInnenSet, oidOffActive, oidOffSet } = this.state.rxData;
        switch (key) {
            case 'full':
                return { active: oidFullActive, set: oidFullSet };
            case 'innen':
                return { active: oidInnenActive, set: oidInnenSet };
            case 'off':
            default:
                return { active: oidOffActive, set: oidOffSet };
        }
    }

    // Looks up the configured icon (data:image/... string from the icon64 picker) for one of
    // the 3 fixed modes - empty/unset falls back to the text label in the render method.
    getModeIcon(key: ModeKey): string {
        const { iconFull, iconInnen, iconOff } = this.state.rxData;
        switch (key) {
            case 'full':
                return iconFull;
            case 'innen':
                return iconInnen;
            case 'off':
            default:
                return iconOff;
        }
    }

    // Writes true once to the mode's "set" output - the alarm panel itself takes care of
    // actually switching (and of resetting the output), no pulse/reset needed on our side.
    applyMode(key: ModeKey): void {
        const { set } = this.getModeOids(key);
        if (!set) {
            return;
        }
        this.props.context.setValue(set, true);
    }

    // A mode button was clicked: if a "PIN write" OID is bound, ask for the PIN first;
    // otherwise switch immediately.
    requestModeChange(key: ModeKey): void {
        const { oidPinWrite } = this.state.rxData;
        if (!oidPinWrite) {
            this.applyMode(key);
            return;
        }
        this.setState({ showPinPopup: true, pendingModeKey: key, pinInput: '', pinError: false });
    }

    closePinPopup(): void {
        this.setState({ showPinPopup: false, pendingModeKey: undefined, pinInput: '', pinError: false });
    }

    pressDigit(digit: string): void {
        this.setState(prev => {
            const current = prev.pinInput || '';
            if (current.length >= 4) {
                return null;
            }
            return { pinInput: current + digit, pinError: false };
        });
    }

    pressDelete(): void {
        this.setState(prev => ({ pinInput: (prev.pinInput || '').slice(0, -1), pinError: false }));
    }

    // Real alarm panel's actual PIN protocol (confirmed by hardware owner): the widget does
    // NOT compare the PIN locally. Instead it writes the requested mode's "set" OID (so the
    // panel knows which mode is being requested) AND writes the entered PIN (as a string, to
    // preserve a leading zero) to a separate "PIN write" OID. The panel itself checks the PIN:
    // if wrong, it flips the "PIN wrong" OID (we watch for that in componentDidUpdate and show
    // an error, letting the user retry); if correct, it switches the mode itself and the
    // target mode's "active" OID flips - we watch for that too and close the popup. There is no
    // client-side timeout: the popup simply waits until one of those two things happens, or the
    // user cancels manually via the x button.
    pressConfirm(): void {
        const { oidPinWrite } = this.state.rxData;
        const key = this.state.pendingModeKey;
        const enteredPin = this.state.pinInput || '';
        if (!oidPinWrite || key === undefined || enteredPin.length !== 4) {
            return;
        }
        this.applyMode(key);
        this.props.context.setValue(oidPinWrite, enteredPin);
        this.setState({ pinError: false });
    }

    // Watches for the two possible outcomes of a pending PIN-protected mode switch:
    // 1. the "PIN wrong" OID flips (to a truthy value) -> show the error, let the user retry.
    // 2. the requested mode's "active" OID flips (to a truthy value) -> the panel accepted the
    //    PIN and switched mode itself -> close the popup.
    // Both are edge-triggered (compared against the previous render) so a value that was
    // already true before the popup opened doesn't immediately fire.
    componentDidUpdate(prevProps: VisRxWidgetProps, prevState: typeof this.state): void {
        super.componentDidUpdate(prevProps, prevState);

        if (!this.state.showPinPopup || this.state.pendingModeKey === undefined) {
            return;
        }

        const { oidPinWrong } = this.state.rxData;
        if (oidPinWrong) {
            const wrongVal = this.getVal(oidPinWrong);
            const prevWrongVal = (prevState.values || {})[`${oidPinWrong}.val`];
            if (wrongVal && wrongVal !== prevWrongVal) {
                this.setState({ pinInput: '', pinError: true });
                return;
            }
        }

        const { active } = this.getModeOids(this.state.pendingModeKey);
        if (active) {
            const activeVal = this.getVal(active);
            const prevActiveVal = (prevState.values || {})[`${active}.val`];
            if (activeVal && activeVal !== prevActiveVal) {
                this.closePinPopup();
            }
        }
    }

    renderPinPopup(): React.JSX.Element {
        const pinInput = this.state.pinInput || '';
        const pinError = !!this.state.pinError;
        const dots = Array.from({ length: 4 }, (_, i) => (i < pinInput.length ? '●' : '○'));
        const digitButtonStyle: React.CSSProperties = {
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: 'none',
            fontSize: 18,
            fontWeight: 600,
            backgroundColor: '#333',
            color: '#fff',
            cursor: 'pointer',
        };

        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                }}
                onClick={() => this.closePinPopup()}
            >
                <div
                    style={{
                        position: 'relative',
                        backgroundColor: '#222',
                        borderRadius: 10,
                        padding: '20px 16px 16px',
                        width: 216,
                        color: '#fff',
                        fontFamily: 'inherit',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => this.closePinPopup()}
                        style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: '#444',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 14,
                            lineHeight: '24px',
                            padding: 0,
                        }}
                        title="Abbrechen"
                    >
                        ×
                    </button>
                    <div style={{ textAlign: 'center', fontSize: 13, opacity: 0.8, marginBottom: 10 }}>
                        PIN eingeben
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 26, letterSpacing: 8, marginBottom: 6, minHeight: 30 }}>
                        {dots.join(' ')}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 12, color: '#e53935', minHeight: 16, marginBottom: 8 }}>
                        {pinError ? 'Falsche PIN' : ''}
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 48px)',
                            gap: 10,
                            justifyContent: 'center',
                        }}
                    >
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                            <button
                                key={d}
                                type="button"
                                style={digitButtonStyle}
                                onClick={() => this.pressDigit(d)}
                            >
                                {d}
                            </button>
                        ))}
                        <button
                            type="button"
                            style={{ ...digitButtonStyle, fontSize: 14, backgroundColor: '#555' }}
                            onClick={() => this.pressDelete()}
                        >
                            ⌫
                        </button>
                        <button type="button" style={digitButtonStyle} onClick={() => this.pressDigit('0')}>
                            0
                        </button>
                        <button
                            type="button"
                            style={{ ...digitButtonStyle, fontSize: 14, backgroundColor: '#2e7d32' }}
                            onClick={() => this.pressConfirm()}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const { oidStatusText } = this.state.rxData;
        const statusVal = this.getVal(oidStatusText);
        const statusText = statusVal === undefined || statusVal === null || statusVal === '' ? '--' : String(statusVal);
        const buttonSize = Number(this.state.rxData.buttonSize) || 48;

        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 8,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    color: '#fff',
                }}
            >
                {/* Buttons stay pinned to the top; the status text below is pushed down via
                    marginTop: auto on its own container, however much extra height the widget
                    is resized to. */}
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        flex: '0 0 auto',
                    }}
                >
                    {MODE_DEFS.map(({ key, label, color }) => {
                        const { active } = this.getModeOids(key);
                        const isActive = active ? !!this.getVal(active) : false;
                        const icon = this.getModeIcon(key);
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => this.requestModeChange(key)}
                                title={label}
                                style={{
                                    width: buttonSize,
                                    height: buttonSize,
                                    padding: 0,
                                    borderRadius: 6,
                                    border: isActive ? `2px solid ${color}` : '2px solid transparent',
                                    backgroundColor: isActive ? color : '#333',
                                    color: '#fff',
                                    fontSize: Math.max(10, Math.round(buttonSize * 0.22)),
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {icon ? (
                                    <img
                                        src={icon}
                                        alt={label}
                                        style={{ width: '65%', height: '65%', objectFit: 'contain' }}
                                    />
                                ) : (
                                    label
                                )}
                            </button>
                        );
                    })}
                </div>

                {oidStatusText ? (
                    <div
                        style={{
                            fontSize: 13,
                            textAlign: 'center',
                            opacity: 0.85,
                            wordBreak: 'break-word',
                            flex: '0 0 auto',
                            marginTop: 'auto',
                        }}
                    >
                        {statusText}
                    </div>
                ) : null}

                {this.state.showPinPopup ? this.renderPinPopup() : null}
            </div>
        );
    }
}
