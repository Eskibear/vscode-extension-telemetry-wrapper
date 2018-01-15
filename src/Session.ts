import * as uuid from "uuid";
import { ICustomEvent } from "./Interfaces";

export class Session {
    public id: string;
    public action: string;
    public startAt: Date;
    public stopAt: Date;

    public customMeasures: { [key: string]: any } = {};
    public customProperties: { [key: string]: any } = {};

    constructor(action: string) {
        this.id = uuid.v4();
        this.action = action;
    }

    getCustomEvent(): ICustomEvent {
        const ret: ICustomEvent = {};
        ret.measures = Object.assign({}, this.customMeasures, { duration: (this.startAt && this.stopAt) ? this.stopAt.getTime() - this.startAt.getTime() : undefined });
        ret.properties = Object.assign({}, this.customProperties, { sessionId: this.id, action: this.action, startAt: this.startAt, stopAt: this.stopAt });
        return ret;
    }

    public end(): void {
        this.stopAt = new Date();
    }
}
