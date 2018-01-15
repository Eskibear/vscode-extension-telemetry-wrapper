import * as fse from 'fs-extra';
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { Session } from "./Session";
import { ICustomEvent } from "./Interfaces";

export module TelemetryWrapper {
    let reporter: TelemetryReporter;

    export async function initilizeFromJsonFile(fsPath: string): Promise<void> {
        if (await fse.pathExists(fsPath)) {
            const { publisher, name, version, aiKey } = await fse.readJSON(fsPath);
            initilize(publisher, name, version, aiKey);
        } else {
            throw new Error(`The Json file '${fsPath}' does not exist.`);
        }
    }

    export function initilize(publisher: string, name: string, version: string, aiKey: string): void {
        if (reporter) {
            throw new Error("TelemetryReporter already initilized.");
        }
        if (aiKey) {
            reporter = new TelemetryReporter(`${publisher}.${name}`, version, aiKey);
            report(EventType.ACTIVATION);
        }
    }

    export function registerCommand(command: string, task: (currentSession?: Session) => (...args: any[]) => any): vscode.Disposable {
        return vscode.commands.registerCommand(command, async (param: any[]) => {
            const session: Session = startSession(command);
            report(EventType.COMMAND_START, {
                properties: Object.assign({}, session.getCustomEvent().properties)
            });
            const callback: (...args: any[]) => any = task(session);
            try {
                await callback(param);
                session.end();
                const customEvent = session.getCustomEvent();
                report(EventType.COMMAND_END, {
                    properties: Object.assign({}, customEvent.properties),
                    measures: Object.assign({}, customEvent.measures)
                });
            } catch (error) {
                session.end();
                const customEvent = session.getCustomEvent();
                report(EventType.COMMAND_ERROR, {
                    properties: Object.assign({}, customEvent.properties, { error }),
                    measures: Object.assign({}, customEvent.measures)
                });
                throw error;
            }
        });
    }

    export function getReporter(): TelemetryReporter {
        return reporter;
    }

    export function startSession(name: string): Session {
        const trans: Session = new Session(name);
        trans.startAt = new Date();
        return trans;
    }

    function report(eventType: EventType, event?: ICustomEvent): void {
        if (reporter) {
            reporter.sendTelemetryEvent(eventType, event && event.properties, event && event.measures);
        }
    }

    enum EventType {
        ACTIVATION = "activation",
        COMMAND_START = "commandStart",
        COMMAND_ERROR = "commandError",
        COMMAND_END = "commandEnd"
    }
}

