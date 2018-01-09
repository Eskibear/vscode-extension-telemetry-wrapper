import * as fse from 'fs-extra';
import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { Transaction } from "./Transaction";
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

    export function registerCommand(command: string, task: (currentTransaction?: Transaction) => (...args: any[]) => any): vscode.Disposable {
        return vscode.commands.registerCommand(command, async (param: any[]) => {
            const transaction: Transaction = startTransaction(command);
            report(EventType.COMMAND_START, { properties: { command, transactionId: transaction.id } });
            const callback: (...args: any[]) => any = task(transaction);
            try {
                await callback(param);
                transaction.end();
                report(EventType.COMMAND_END, Object.assign({},
                    transaction.getCustomEvent(),
                    { properties: { command, transactionId: transaction.id } }
                ));
            } catch (error) {
                transaction.end();
                report(EventType.COMMAND_ERROR, Object.assign({},
                    transaction.getCustomEvent(),
                    { properties: { command, error, transactionId: transaction.id } }
                ));
                throw error;
            }
        });
    }

    export function getReporter(): TelemetryReporter {
        return reporter;
    }

    export function startTransaction(name: string): Transaction {
        const trans: Transaction = new Transaction(name);
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

