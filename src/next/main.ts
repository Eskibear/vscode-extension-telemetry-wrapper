import * as fse from 'fs-extra';
import * as uuid from "uuid";
import TelemetryReporter from "vscode-extension-telemetry";
import { ErrorCode } from './ErrorCode';
import { EventName } from "./EventName";
import { UserError } from './UserError';

let _isDebug: boolean = false;
let reporter: TelemetryReporter;

/**
 * Initialize TelemetryReporter by parsing attributes from a JSON file.
 * It reads these attributes: publisher, name, version, aiKey.
 * @param jsonFilepath absolute path of a JSON file.
 */
export async function initilizeFromJsonFile(jsonFilepath: string, _debug?: boolean): Promise<void> {
    if (!await fse.pathExists(jsonFilepath)) {
        throw new Error(`The Json file '${jsonFilepath}' does not exist.`);
    }
    const { publisher, name, version, aiKey } = await fse.readJSON(jsonFilepath);
    initilize(`${publisher}.${name}`, version, aiKey, !!_debug);
}

/**
 * Initialize TelemetryReporter from given attributes.
 * @param extensionId Idenfier of the extension, used as prefix of EventName in telemetry data.
 * @param version Version of the extension.
 * @param aiKey Key of Application Insights.
 */
export function initilize(extensionId: string, version: string, aiKey: string, _debug?: boolean): void {
    if (reporter) {
        throw new Error("TelemetryReporter already initilized.");
    }

    if (aiKey) {
        reporter = new TelemetryReporter(extensionId, version, aiKey);
    }
    _isDebug = !!_debug;
}

/**
 * Instrument callback for a command to auto send OPEARTION_START, OPERATION_END, ERROR telemetry.
 * @param commandName 
 * @param cb The callback function for the command.
 * @returns A new callback with telemetry logic injected.
 */
export function instrumentCommand(commandName: string, cb: (...args: any[]) => any): (...args: any[]) => any {
    return async (...args: any[]) => {
        let error = undefined;
        let oId = uuid.v4();
        const startAt: number = Date.now();
        try {
            sendOpStart(oId, commandName);
            return await cb(...args);
        } catch (e) {
            error = e;
            sendError(oId, error);
        } finally {
            const duration = Date.now() - startAt;
            sendOpEnd(oId, commandName, duration, error);
        }
    }
};

/**
 * Send ERROR telemetry data, supposed to be used when an error occurs.
 * @param oId Operation Id.
 * @param errorObject An object containing error details.
 */
export function sendError(oId: string, errorObject: any) {
    if (!errorObject || errorObject.errorCode === ErrorCode.NO_ERROR) {
        if (_isDebug) {
            console.warn("No error indicated by: ", errorObject);
        }
    } else {
        const errorProperties: Properties = extractErrorProperties(errorObject);
        report(EventName.ERROR, { oId, ...errorProperties });
    }
}

/**
 * Send OPERATION_START telemetry data, supposed to be used when an operation starts.
 * @param oId Operation Id.
 * @param oName Operation name.
 */
export function sendOpStart(oId: string, oName: string) {
    report(EventName.OPERATION_START, { oId, oName });
}

/**
 * Send OPERATION_END telemetry data, supposed to be used when an operation ends.
 * @param oId Operation Id.
 * @param oName Operation name.
 * @param duration Time elapsed for the operation, in milliseconds.
 * @param errorObject An optional object containing error details.
 */
export function sendOpEnd(oId: string, oName: string, duration: number, errorObject?: any) {
    const errorProperties: Properties = extractErrorProperties(errorObject);
    report(EventName.OPERATION_END, { oId, oName, ...errorProperties }, { duration });
}

type Properties = {
    [key: string]: string;
};

type Measurements = {
    [key: string]: number;
};

function report(eventName: string, properties?: Properties, measurements?: Measurements): void {
    if (reporter) {
        reporter.sendTelemetryEvent(eventName, properties, measurements);
        if (_isDebug) {
            console.log(eventName, { eventName, properties, measurements });
        }
    } 
}

const ERROR_KEYS: string[] = [
    "errorCode",    // Preserve "0" for no error, "1" for general error.
    "message",      // For message of an Error.
    "stack",        // For callstack of an Error.
    "isUserError",  // Indicator of user error. Possible values: "true", "false".
];

function extractErrorProperties(object: any): Properties {
    const ret: Properties = {};
    if (object) {
        for (const key of ERROR_KEYS) {
            if (object[key]) {
                ret[key] = object[key];
            }
        }
        ret.errorCode = ret.errorCode || ErrorCode.GENERAL_ERROR;
        ret.isUserError = ret.isUserError || object instanceof UserError ? "true" : "false";
    } else {
        ret.errorCode = ErrorCode.NO_ERROR;
    }
    return ret;
}
