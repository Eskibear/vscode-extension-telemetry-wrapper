import * as uuid from "uuid";
import { ICustomEvent } from "./Interfaces";
import { TelemetryWrapper } from "./TelemetryWrapper";
import { LogLevel } from "./LogLevel";
import { ExitCode } from "./ExitCode";

export class Session {
    public id: string;
    public action: string;
    public exitCode: string;
    public startAt: Date;
    public stopAt: Date;

    public customMeasures: { [key: string]: any } = {};
    public customProperties: { [key: string]: any } = {};

    constructor(action: string) {
        this.id = uuid.v4();
        this.action = action;
        this.startAt = new Date();
    }

    getCustomEvent(): ICustomEvent {
        const ret: ICustomEvent = {};
        ret.properties = Object.assign({}, this.customProperties, { sessionId: this.id, action: this.action, startAt: this.startAt });
        ret.measures = Object.assign({}, this.customMeasures, { duration: (this.stopAt || new Date()).getTime() - this.startAt.getTime() }, { logLevel: LogLevel.INFO });
        return ret;
    }

    public end(): void {
        this.stopAt = new Date();
        this.exitCode = this.exitCode || ExitCode.SUCCESS;
        const customEvent = this.getCustomEvent();
        TelemetryWrapper.report(TelemetryWrapper.EventType.COMMAND_END, {
            properties: Object.assign({}, customEvent.properties, { stopAt: this.stopAt, exitCode: this.exitCode }),
            measures: Object.assign({}, customEvent.measures)
        });
    }

    public error(message: any, exitCode?: string): void {
        const customEvent: ICustomEvent = this.getCustomEvent();
        TelemetryWrapper.report(TelemetryWrapper.EventType.ERROR, {
            properties: Object.assign({}, customEvent.properties, { message }),
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.ERROR })
        });
        this.exitCode = exitCode || ExitCode.GENERAL_ERROR;
    }

    public info(message: any): void {
        const customEvent: ICustomEvent = this.getCustomEvent();
        TelemetryWrapper.report(TelemetryWrapper.EventType.INFO, {
            properties: Object.assign({}, customEvent.properties, { message }),
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.INFO })
        });
    }

    public warning(message: any): void {
        const customEvent: ICustomEvent = this.getCustomEvent();
        TelemetryWrapper.report(TelemetryWrapper.EventType.WARNING, {
            properties: Object.assign({}, customEvent.properties, { message }),
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.WARNING })
        });
    }

    public verbose(message: any): void {
        const customEvent: ICustomEvent = this.getCustomEvent();
        TelemetryWrapper.report(TelemetryWrapper.EventType.VERBOSE, {
            properties: Object.assign({}, customEvent.properties, { message }),
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.VERBOSE })
        });
    }

    public sendTelemetryEvent(eventName: string, properties?: {
        [key: string]: string;
    }, measures?: {
        [key: string]: number;
    }): void {
        const customEvent: ICustomEvent = this.getCustomEvent();
        TelemetryWrapper.report(eventName, {
            properties: Object.assign({}, properties, customEvent.properties),
            measures: Object.assign({}, measures, customEvent.measures)
        });
    }
}
