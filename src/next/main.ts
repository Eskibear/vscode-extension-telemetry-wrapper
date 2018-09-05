import * as fse from 'fs-extra';
import * as uuidv4 from "uuid/v4";
import TelemetryReporter from "vscode-extension-telemetry";
import { EventName, Measurements, Dimensions, ErrorBody, OperationStartDimensions, OperationEndDimensions, ErrorDimensions, ERROR_KEYS } from "./EventSpec";
import { UserError } from './UserError';
import { ErrorCode } from './ErrorCode';
import { ErrorType } from './ErrorType';

let _isDebug: boolean = false;
let reporter: TelemetryReporter;

/**
 * Initialize TelemetryReporter by parsing attributes from a JSON file.
 * It reads these attributes: publisher, name, version, aiKey.
 * @param jsonFilepath absolute path of a JSON file.
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
 */
export function initialize(extensionId: string, version: string, aiKey: string, _debug?: boolean): void {
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
        let oId = createUuid();
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
 * @param errorObject An object containing error details.
 * @param oId Operation Id.
 * @param oName Operation name.
 */
export function sendError(errorObject: any, oId?: string, oName?: string) {
    if (!errorObject || errorObject.errorCode === ErrorCode.NO_ERROR) {
        _isDebug && console.warn("No error indicated by: ", errorObject);
        return;
    }

    const errorBody: ErrorBody = extractErrorProperties(errorObject);
    const dimensions: ErrorDimensions = { oId, oName, ...errorBody };
    report(EventName.ERROR, dimensions);
}

/**
 * Send OPERATION_START telemetry data, supposed to be used when an operation starts.
 * @param oId Operation Id.
 * @param oName Operation name.
 */
export function sendOpStart(oId: string, oName: string) {
    const dimensions: OperationStartDimensions = { oId, oName };
    report(EventName.OPERATION_START, dimensions);
}

/**
 * Send OPERATION_END telemetry data, supposed to be used when an operation ends.
 * @param oId Operation Id.
 * @param oName Operation name.
 * @param duration Time elapsed for the operation, in milliseconds.
 * @param errorObject An optional object containing error details.
 */
export function sendOpEnd(oId: string, oName: string, duration: number, errorObject?: any) {
    const errorDimensions: ErrorBody = extractErrorProperties(errorObject);
    const dimensions: OperationEndDimensions = { oId, oName, ...errorDimensions };
    report(EventName.OPERATION_END, dimensions, { duration });
}

/**
 * Create a UUID string using uuid.v4().
 */
export function createUuid(): string {
    return uuidv4();
}

function report(eventName: string, properties?: Dimensions, measurements?: Measurements): void {
    if (!reporter) {
        return;
    }

    reporter.sendTelemetryEvent(eventName, properties as { [key: string]: string; }, measurements as { [key: string]: number; });
    if (_isDebug) {
        console.log(eventName, { eventName, properties, measurements });
    }
}

function extractErrorProperties(object: any): ErrorBody {
    if (!object) {
        return { errorCode: ErrorCode.NO_ERROR };
    }

    // filter out fields not in ERROR_KEYS.
    const ret: ErrorBody = Object.getOwnPropertyNames(object).filter(key => ERROR_KEYS.indexOf(key) >= 0).reduce(
        (obj, key) => ({ ...obj, [key]: object[key] }), {}
    ) as ErrorBody;

    ret.errorCode = ret.errorCode || ErrorCode.GENERAL_ERROR;
    ret.errorType = ret.errorType || object instanceof UserError ? ErrorType.USER_ERROR : ErrorType.SYSTEM_ERROR;
    return ret;
}
