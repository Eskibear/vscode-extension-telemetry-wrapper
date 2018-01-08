import * as uuid from "uuid";
import { ICustomEvent } from "./Interfaces";

export class Transaction {
    public id: string;
    public name: string;
    public startAt: Date;
    public stopAt: Date;

    private customMeasures: { [key: string]: ICustomMeasure } = {};
    private customProperties?: { [key: string]: {} } = {};

    constructor(name: string) {
        this.id = uuid.v4();
        this.name = name;
    }

    getCustomEvent(): ICustomEvent {
        const ret: ICustomEvent = {};
        ret.measures = Object.assign(
            {},
            ...Object.keys(this.customMeasures).map((k: string) => ({ [k]: this.customMeasures[k].reduceFunc(this.customMeasures[k].observes) })),
            { duration: this.stopAt.getTime() - this.startAt.getTime() }
        );
        ret.properties = Object.assign({}, this.customProperties, { name: this.name, startAt: this.startAt, stopAt: this.stopAt });
        return ret;
    }

    public initMeasure<T>(key: string, reduceFunc: (observes: T[]) => number): void {
        if (!this.customMeasures[key]) {
            this.customMeasures[key] = { observes: [], reduceFunc };
        }
    }

    public observeMeasure<T>(key: string, observe: T): void {
        if (this.customMeasures[key]) {
            this.customMeasures[key].observes.push(observe);
        }
    }

    public end(): void {
        this.stopAt = new Date();
    }

}
interface ICustomMeasure {
    observes: {}[];
    reduceFunc(observes: {}[]): number;
}