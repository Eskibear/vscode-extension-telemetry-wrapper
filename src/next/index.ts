import { OperationStartEvent, OperationEndEvent, OperationalErrorEvent, ErrorEvent, ErrorCodes, ErrorType, TelemetryEvent, ErrorInfo, EventName, DimensionEntries, MeasurementEntries } from "./event";
import * as uuidv4 from "uuid/v4";
import * as fse from 'fs-extra';
import TelemetryReporter from "vscode-extension-telemetry";

interface RichError extends Error {
    isUserError?: boolean;
    errorCode?: number;
}

let _isDebug: boolean = false;
let _reporter: TelemetryReporter;

/**
 * Initialize TelemetryReporter by parsing attributes from a JSON file.
 * It reads these attributes: publisher, name, version, aiKey.
 * @param jsonFilepath absolute path of a JSON file.
 * @param _debug If set as true, debug information be printed to console.
 */
export async function initializeFromJsonFile(jsonFilepath: string, _debug?: boolean): Promise<void> {
    if (!await fse.pathExists(jsonFilepath)) {
        throw new Error(`The Json file '${jsonFilepath}' does not exist.`);
    }
    const { publisher, name, version, aiKey } = await fse.readJSON(jsonFilepath);
    initialize(`${publisher}.${name}`, version, aiKey, !!_debug);
}

/**
 * Initialize TelemetryReporter from given attributes.
 * @param extensionId Identifier of the extension, used as prefix of EventName in telemetry data.
 * @param version Version of the extension.
 * @param aiKey Key of Application Insights.
 * @param _debug If set as true, debug information be printed to console.
 */
export function initialize(extensionId: string, version: string, aiKey: string, _debug?: boolean): void {
    if (_reporter) {
        throw new Error("TelemetryReporter already initilized.");
    }

    if (aiKey) {
        _reporter = new TelemetryReporter(extensionId, version, aiKey);
    }
    _isDebug = !!_debug;
}

/**
 * Mark an Error instance as a user error.
 */
export function setUserError(err: Error): void {
    (err as RichError).isUserError = true;
}

/**
 * Set custom error code or an Error instance.
 * @param errorCode A custom error code.
 */
export function setErrorCode(err: Error, errorCode: number): void {
    (err as RichError).errorCode = errorCode;
}

/**
 * Instrument callback for a command to auto send OPEARTION_START, OPERATION_END, ERROR telemetry.
 * @param operationName For extension activation, use "activation", for VS Code commands, use command name.
 * @param cb The callback function with a unique Id passed by its 1st parameter.
 * @returns The instrumented callback.
 */
export function instrumentOperation(operationName: string, cb: (_operationId: string, ...args: any[]) => any): (...args: any[]) => any {
    return async (...args: any[]) => {
        let error = undefined;
        let operationId = createUuid();
        const startAt: number = Date.now();

        try {
            sendOperationStart(operationId, operationName);
            return await cb(operationId, ...args);
        } catch (e) {
            error = e;
            sendOperationalError(operationId, operationName, e);
        } finally {
            const duration = Date.now() - startAt;
            sendOperationEnd(operationId, operationName, duration, error);
        }
    }
}

/**
 * Send OPERATION_START event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 */
export function sendOperationStart(operationId: string, operationName: string) {
    const event: OperationStartEvent = {
        eventName: EventName.OPERATION_START,
        operationId: operationId,
        operationName: operationName
    };

    sendEvent(event);
}

/**
 * Send OPERATION_START event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param duration Time elapsed for the operation, in milliseconds.
 * @param err An optional Error instance if occurs during the operation.
 */
export function sendOperationEnd(operationId: string, operationName: string, duration: number, err?: Error) {
    const event: OperationEndEvent = {
        eventName: EventName.OPERATION_END,
        operationId: operationId,
        operationName: operationName,
        duration: duration,
        ...extractErrorInfo(err)
    };

    sendEvent(event);
}

/**
 * Send an ERROR event.
 * @param err An Error instance.
 */
export function sendError(err: Error) {
    const event: ErrorEvent = {
        eventName: EventName.ERROR,
        ...extractErrorInfo(err)
    };

    sendEvent(event);
}

/**
 * Send an ERROR event during an operation, carrying id and name of the oepration. 
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param err An Error instance containing details.
 */
export function sendOperationalError(operationId: string, operationName: string, err: Error) {
    const event: OperationalErrorEvent = {
        eventName: EventName.ERROR,
        operationId: operationId,
        operationName: operationName,
        ...extractErrorInfo(err)
    };

    sendEvent(event);
}

/**
 * Create a UUID string using uuid.v4().
 */
export function createUuid(): string {
    return uuidv4();
}

function extractErrorInfo(err?: Error): ErrorInfo {
    if (!err) {
        return {
            errorCode: ErrorCodes.NO_ERROR
        };
    }

    const richError = err as RichError;
    return {
        errorCode: richError.errorCode || ErrorCodes.GENERAL_ERROR,
        errorType: richError.isUserError ? ErrorType.USER_ERROR : ErrorType.SYSTEM_ERROR,
        message: err.message,
        stack: err.stack
    };
}


function sendEvent(event: TelemetryEvent) {
    if (!_reporter) {
        return;
    }

    const dimensions: {[key: string]: string} = {};
    for(const key of DimensionEntries) {
        // @ts-ignore
        const value = event[key];
        if (value) {
            dimensions[key] = String(value);
        }
    }

    const measurements: {[key: string]: number} = {};
    for(const key of MeasurementEntries) {
        // @ts-ignore
        const value = event[key];
        if (value) {
            measurements[key] = value;
        }
    }

    _reporter.sendTelemetryEvent(event.eventName, dimensions, measurements);

    if (_isDebug) {
        console.log(event.eventName, { eventName: event.eventName, dimensions, measurements });
    }
}