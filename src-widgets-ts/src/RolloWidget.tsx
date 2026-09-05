import React from 'react';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState } from '@iobroker/types-vis-2';
import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';

interface RolloWidgetRxData {
    oidPosition: string;
    invertPosition: boolean;
    buttonSize: number;
    buttonEnabled1: boolean;
    buttonValue1: number;
    buttonEnabled2: boolean;
    buttonValue2: number;
    buttonEnabled3: boolean;
    buttonValue3: number;
    buttonEnabled4: boolean;
    buttonValue4: number;
    buttonEnabled5: boolean;
    buttonValue5: number;
}

// One OID is used both ways: the widget writes the desired position (%) into it once per
// button click, and the shutter actor itself reports its actual position back into the very
// same OID (no separate feedback OID) - so getVal(oidPosition) always reflects "last known /
// current position", whether that came from us or from the actor.
//
// % convention: internally ("logical") 0% = fully open, 100% = fully closed - this is what the
// buttons' configured values and the on-screen graphic/text always mean. Since real shutter
// actors differ in which way round they count, "invertPosition" flips logical<->raw at the OID
// boundary only (getLogicalPercent/setLogicalPercent below) - the rest of the widget never has
// to think about the raw convention.
export default class RolloWidget extends (window.visRxWidget as typeof VisRxWidget)<
    RolloWidgetRxData,
    VisRxWidgetState
> {
    static adapter: any;

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplRolloWidget',
            visSet: 'lordener-widgets',
            visSetLabel: 'lordener_widgets_set',
            visSetColor: '#ff7a1a',
            visName: 'Rollo',
            visAttrs: [
                {
                    name: 'oid',
                    label: 'rollo_oid_group',
                    fields: [{ name: 'oidPosition', type: 'id', label: 'oid_rollo_position' }],
                },
                {
                    name: 'options',
                    label: 'rollo_options_group',
                    fields: [{ name: 'invertPosition', type: 'checkbox', label: 'invert_rollo_position' }],
                },
                {
                    name: 'layout',
                    label: 'rollo_layout_group',
                    fields: [{ name: 'buttonSize', type: 'number', label: 'rollo_button_size', default: 40 }],
                },
                {
                    name: 'button1',
                    label: 'rollo_button_group_1',
                    fields: [
                        { name: 'buttonEnabled1', type: 'checkbox', label: 'rollo_button_enabled', default: true },
                        { name: 'buttonValue1', type: 'number', label: 'rollo_button_value', default: 0 },
                    ],
                },
                {
                    name: 'button2',
                    label: 'rollo_button_group_2',
                    fields: [
                        { name: 'buttonEnabled2', type: 'checkbox', label: 'rollo_button_enabled', default: true },
                        { name: 'buttonValue2', type: 'number', label: 'rollo_button_value', default: 50 },
                    ],
                },
                {
                    name: 'button3',
                    label: 'rollo_button_group_3',
                    fields: [
                        { name: 'buttonEnabled3', type: 'checkbox', label: 'rollo_button_enabled', default: true },
                        { name: 'buttonValue3', type: 'number', label: 'rollo_button_value', default: 100 },
                    ],
                },
                {
                    name: 'button4',
                    label: 'rollo_button_group_4',
                    fields: [
                        { name: 'buttonEnabled4', type: 'checkbox', label: 'rollo_button_enabled', default: false },
                        { name: 'buttonValue4', type: 'number', label: 'rollo_button_value', default: 25 },
                    ],
                },
                {
                    name: 'button5',
                    label: 'rollo_button_group_5',
                    fields: [
                        { name: 'buttonEnabled5', type: 'checkbox', label: 'rollo_button_enabled', default: false },
                        { name: 'buttonValue5', type: 'number', label: 'rollo_button_value', default: 75 },
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
        return RolloWidget.getWidgetInfo();
    }

    static getI18nPrefix(): string {
        return `${RolloWidget.adapter}_`;
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

    // Reads the position OID and converts it to the logical 0=offen/100=zu convention,
    // undoing "invertPosition" if set. Returns undefined if no value has arrived yet.
    getLogicalPercent(): number | undefined {
        const { oidPosition, invertPosition } = this.state.rxData;
        const raw = this.getVal(oidPosition);
        if (raw === undefined || raw === null || raw === '') {
            return undefined;
        }
        const rawNum = Math.max(0, Math.min(100, Number(raw) || 0));
        return invertPosition ? 100 - rawNum : rawNum;
    }

    // Writes a desired logical percentage (0=offen/100=zu) to the position OID once, converting
    // to the raw convention if "invertPosition" is set. No pulse/reset - the actor drives to the
    // target itself and reports its own position back into the same OID.
    setLogicalPercent(target: number): void {
        const { oidPosition, invertPosition } = this.state.rxData;
        if (!oidPosition) {
            return;
        }
        const targetNum = Math.max(0, Math.min(100, Number(target) || 0));
        const raw = invertPosition ? 100 - targetNum : targetNum;
        this.props.context.setValue(oidPosition, raw);
    }

    // Draws the shutter graphic: a window frame with a slatted shutter covering it from the top
    // down, proportional to how "closed" (logical %) the position currently is.
    // eslint-disable-next-line class-methods-use-this
    renderShutterGraphic(closedPercent: number): React.JSX.Element {
        const frameX = 2;
        const frameY = 2;
        const frameW = 56;
        const frameH = 86;
        const innerX = 6;
        const innerY = 6;
        const innerW = 48;
        const innerH = 78;
        const shutterH = (Math.max(0, Math.min(100, closedPercent)) / 100) * innerH;
        const slatGap = 8;
        const slatCount = Math.floor(shutterH / slatGap);
        const slatLines = Array.from({ length: slatCount }, (_, i) => innerY + (i + 1) * slatGap).filter(
            y => y < innerY + shutterH,
        );

        return (
            <svg
                viewBox={`0 0 ${frameX + frameW + 2} ${frameY + frameH + 2}`}
                style={{ width: 'auto', height: '100%', maxWidth: '100%' }}
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Window / sky background - visible in the open (uncovered) part */}
                <rect x={innerX} y={innerY} width={innerW} height={innerH} fill="#4fc3f7" rx={2} />
                {/* Shutter covering the closed part, from the top down */}
                {shutterH > 0 ? (
                    <>
                        <rect x={innerX} y={innerY} width={innerW} height={shutterH} fill="#8a94a0" />
                        {slatLines.map(y => (
                            <line
                                key={y}
                                x1={innerX}
                                y1={y}
                                x2={innerX + innerW}
                                y2={y}
                                stroke="#5f6a75"
                                strokeWidth={1}
                            />
                        ))}
                        {/* Bottom rail of the shutter */}
                        <rect
                            x={innerX}
                            y={innerY + Math.max(0, shutterH - 4)}
                            width={innerW}
                            height={4}
                            fill="#5f6a75"
                            rx={1}
                        />
                    </>
                ) : null}
                {/* Window frame */}
                <rect
                    x={frameX}
                    y={frameY}
                    width={frameW}
                    height={frameH}
                    rx={4}
                    fill="none"
                    stroke="#cfd8dc"
                    strokeWidth={2}
                />
            </svg>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element {
        super.renderWidgetBody(props);

        const logicalPercent = this.getLogicalPercent();
        const percentText = logicalPercent === undefined ? '--' : `${Math.round(logicalPercent)}%`;
        const buttonSize = Number(this.state.rxData.buttonSize) || 40;

        const buttons = [1, 2, 3, 4, 5]
            .filter(n => !!(this.state.rxData as any)[`buttonEnabled${n}`])
            .map(n => ({
                key: n,
                value: Number((this.state.rxData as any)[`buttonValue${n}`]) || 0,
            }));

        return (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    justifyContent: 'center',
                    gap: 12,
                    padding: 8,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    color: '#fff',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        flex: '1 1 auto',
                        minWidth: 0,
                        minHeight: 0,
                    }}
                >
                    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center' }}>
                        {this.renderShutterGraphic(logicalPercent === undefined ? 0 : logicalPercent)}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85, flex: '0 0 auto' }}>{percentText}</div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        flex: '0 0 auto',
                    }}
                >
                    {buttons.map(({ key, value }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => this.setLogicalPercent(value)}
                            title={`${value}%`}
                            style={{
                                width: buttonSize * 1.6,
                                height: buttonSize,
                                padding: 0,
                                borderRadius: 6,
                                border: '2px solid transparent',
                                backgroundColor: '#333',
                                color: '#fff',
                                fontSize: Math.max(10, Math.round(buttonSize * 0.32)),
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {value}%
                        </button>
                    ))}
                </div>
            </div>
        );
    }
}
