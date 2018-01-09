import * as uuid from "uuid";
import { ICustomEvent } from "./Interfaces";

export class Transaction {
    public id: string;
    public name: string;
    public startAt: Date;
    public stopAt: Date;

    public customMeasures: { [key: string]: any } = {};
    public customProperties: { [key: string]: any } = {};

    constructor(name: string) {
        this.id = uuid.v4();
        this.name = name;
    }

    getCustomEvent(): ICustomEvent {
        const ret: ICustomEvent = {};
        ret.measures = Object.assign({}, this.customMeasures, { duration: this.stopAt.getTime() - this.startAt.getTime() });
        ret.properties = Object.assign({}, this.customProperties, { name: this.name, startAt: this.startAt, stopAt: this.stopAt });
        return ret;
    }

    public end(): void {
        this.stopAt = new Date();
    }
}
