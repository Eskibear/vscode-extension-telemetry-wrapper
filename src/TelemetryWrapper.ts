import * as fse from 'fs-extra';
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { Session } from "./Session";
import { ICustomEvent } from "./Interfaces";
import { ExitCode } from "./ExitCode";
import { createNamespace, Namespace } from "continuation-local-storage";
import { LogLevel } from './LogLevel';

const SESSION_KEY: string = "session";

export module TelemetryWrapper {
    let reporter: TelemetryReporter;
    let sessionNamespace: Namespace;

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
        if (!sessionNamespace) {
            sessionNamespace = createNamespace("sessionNamespace");
        }
    }

    export function registerCommand(command: string, callback: (...args: any[]) => any): vscode.Disposable {
        return vscode.commands.registerCommand(command, async (param: any[]) => {
            await new Promise<void>((resolve, reject) => {
                sessionNamespace.run(async () => {
                    const session: Session = startSession(command);
                    sessionNamespace.set<Session>(SESSION_KEY, session);
                    report(EventType.COMMAND_START, {
                        properties: Object.assign({}, session.getCustomEvent().properties),
                        measures: { logLevel: LogLevel.INFO }
                    });
                    try {
                        await callback(param);
                        resolve();
                    } catch (error) {
                        fatal(error, ExitCode.GENERAL_ERROR);
                        reject(error);
                    } finally {
                        endSession(session);
                    }
                });
            });
        });
    }

    export function getReporter(): TelemetryReporter {
        return reporter;
    }

    export function startSession(name: string): Session {
        const trans: Session = new Session(name);
        return trans;
    }

    export function endSession(session: Session) {
        if (session) {
            session.end();
            const customEvent = session.getCustomEvent();
            report(EventType.COMMAND_END, {
                properties: Object.assign({}, customEvent.properties, { stopAt: session.stopAt, exitCode: session.exitCode }),
                measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.INFO })
            });
        }
    }

    export function currentSession() {
        return sessionNamespace && sessionNamespace.get(SESSION_KEY);
    }


    export function fatal(message: any, exitCode?: string): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(EventType.ERROR, {
            properties: Object.assign({}, customEvent.properties, { message }),
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.FATAL })
        });
        if (session) {
            session.exitCode = exitCode || ExitCode.GENERAL_ERROR;
        }
    }

    export function error(message: any, exitCode?: string): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(EventType.ERROR, {
            properties: Object.assign({}, customEvent.properties, { message }),
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.ERROR })
        });
        if (session) {
            session.exitCode = exitCode || ExitCode.GENERAL_ERROR;
        }
    }

    export function info(message: any): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(EventType.INFO, {
            properties: Object.assign({}, customEvent.properties, { message }),
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.INFO })
        });
    }

    export function  warn(message: any): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(EventType.WARN, {
            properties: Object.assign({}, customEvent.properties, { message }),
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.WARN })
        });
    }

    export function  verbose(message: any): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(EventType.VERBOSE, {
            properties: Object.assign({}, customEvent.properties, { message }),
            measures: Object.assign({}, customEvent.measures, { logLevel: LogLevel.VERBOSE })
        });
    }

    export function sendTelemetryEvent(eventName: string, properties?: {
        [key: string]: string;
    }, measures?: {
        [key: string]: number;
    }): void {
        const session: Session = currentSession();
        const customEvent: ICustomEvent = session ? session.getCustomEvent() : {};
        report(eventName, {
            properties: Object.assign({}, properties, customEvent.properties),
            measures: Object.assign({}, measures, customEvent.measures)
        });
    }

    export enum EventType {
        ACTIVATION = "activation",
        FATAL = "fatal",
        ERROR = "error",
        WARN = "warn",
        INFO = "info",
        VERBOSE = "verbose",
        COMMAND_START = "commandStart",
        COMMAND_END = "commandEnd"
    }

    function report(eventType: EventType | string, event?: ICustomEvent): void {
        if (reporter) {
            reporter.sendTelemetryEvent(eventType, event && event.properties, event && event.measures);
        }
    }
}

