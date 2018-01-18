import * as fse from 'fs-extra';
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { Session } from "./Session";
import { ICustomEvent } from "./Interfaces";
import { ExitCode } from './ExitCode';

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
            } catch (error) {
                session.fatal(error, ExitCode.GENERAL_ERROR);
                throw error;
            } finally {
                session.end();
            }
        });
    }

    export function getReporter(): TelemetryReporter {
        return reporter;
    }

    export function startSession(name: string): Session {
        const trans: Session = new Session(name);
        return trans;
    }

    export function report(eventType: EventType | string, event?: ICustomEvent): void {
        if (reporter) {
            reporter.sendTelemetryEvent(eventType, event && event.properties, event && event.measures);
        }
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
}

