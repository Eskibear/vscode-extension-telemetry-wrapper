import * as fs from "fs";
import * as uuid from "uuid";
import * as vscode from "vscode";
import TelemetryReporter, { ReplacementOption } from "@vscode/extension-telemetry";
import {
    DimensionEntries,
    ErrorCodes,
    ErrorEvent,
    ErrorInfo,
    ErrorType,
    EventName,
    MeasurementEntries,
    OperationEndEvent,
    OperationErrorEvent,
    OperationStartEvent,
    OperationStepEvent,
    TelemetryEvent,
} from "./event";
import { Output } from "./output";

interface RichError extends Error {
    isUserError?: boolean;
    errorCode?: number;
}
interface IOptions {
    /**
     * @deprecated This field is deprecated and will not have any effect.
     */
    firstParty?: boolean;
    replacementOptions?: ReplacementOption[]
    debug?: boolean;
}

interface ReplacementRule {
    pattern: RegExp;
    replace: string;
}

let isDebug: boolean = false;
let reporters: TelemetryReporter[];
const contextProperties: { [key: string]: string } = {};
const replacementRules: ReplacementRule[] = [];
const SENSITIVE_EVENTS = [EventName.ERROR, EventName.OPERATION_END, EventName.OPERATION_STEP];

/**
 * Initialize TelemetryReporter by parsing attributes from a JSON file.
 * It reads these attributes: publisher, name, version, aiKey.
 * @param jsonFilepath absolute path of a JSON file.
 * @param options debug: if set as true, debug information be printed to console.
 */

export { ReplacementOption } from "@vscode/extension-telemetry";

export async function initializeFromJsonFile(jsonFilepath: string, options?: IOptions): Promise<void> {
    try {
        await fs.promises.access(jsonFilepath);
        const { publisher, name, aiKey } = JSON.parse(fs.readFileSync(jsonFilepath, "utf-8"));
        initialize(`${publisher}.${name}`, "", aiKey, options);
    } catch (error) {
        throw new Error(`The JSON file '${jsonFilepath}' does not exist.`);
    }
}

/**
 * Initialize TelemetryReporter from given attributes.
 * @param extensionId Identifier of the extension, used as prefix of EventName in telemetry data.
 * @param version Version of the extension. (Deprecated, will not have any effect)
 * @param aiKey Key of Application Insights.
 * @param options debug: if set as true, debug information be printed to console.
 */
export function initialize(extensionId: string, _version: string, aiKey: string | string[], options?: IOptions): void {
    if (reporters) {
        throw new Error("TelemetryReporter already initialized.");
    }

    if (aiKey) {
        if (aiKey instanceof Array) {
            reporters = aiKey.map((key: string) => new TelemetryReporter(key, options?.replacementOptions));
        } else {
            reporters = [new TelemetryReporter(aiKey, options?.replacementOptions)];
        }
    }

    Output.setExtensionId(extensionId);
    isDebug = !!(options && options.debug) || process.env.DEBUG_TELEMETRY === "true";
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
 * Instrument callback for a command to auto send OPERATION_START, OPERATION_END, ERROR telemetry.
 * A unique Id is created and accessible in the callback.
 * @param operationName For extension activation, use "activation", for VS Code commands, use command name.
 * @param cb The callback function **with a unique Id passed by its 1st parameter**.
 * @param thisArg The `this` context used when invoking the handler function.
 * @returns The instrumented callback.
 */
export function instrumentOperation(
    operationName: string,
    cb: (operationId: string, ...args: any[]) => any,
    thisArg?: any,
): (...args: any[]) => any {
    return async (...args: any[]) => {
        let error;
        const operationId = createUuid();
        const startAt: number = Date.now();

        try {
            sendOperationStart(operationId, operationName);
            return await cb.apply(thisArg, [operationId, ...args]);
        } catch (e) {
            error = e as Error;
            sendOperationError(operationId, operationName, error);
        } finally {
            const duration = Date.now() - startAt;
            sendOperationEnd(operationId, operationName, duration, error);
        }
    };
}

/**
 * Instrument callback for a command to auto send OPERATION_START, OPERATION_END, ERROR telemetry.
 * @param operationName For extension activation, use "activation", for VS Code commands, use command name.
 * @param cb The callback function.
 * @param thisArg The `this` context used when invoking the handler function.
 * @returns The instrumented callback.
 */
export function instrumentSimpleOperation(operationName: string, cb: (...args: any[]) => any, thisArg?: any): (...args: any[]) => any {
    return instrumentOperation(operationName, async (operationId, ...args) => await cb.apply(thisArg, args), thisArg /** unnecessary */);
}

/**
 * A shortcut to instrument and operation and register it as a VSCode command.
 * Note that operation Id will no longer be accessible in this approach.
 * @param command A unique identifier for the command.
 * @param cb A command handler function.
 * @param thisArg The `this` context used when invoking the handler function.
 */
export function instrumentOperationAsVsCodeCommand(command: string, cb: (...args: any[]) => any, thisArg?: any): vscode.Disposable {
    return vscode.commands.registerCommand(command, instrumentSimpleOperation(command, cb, thisArg));
}

/**
 * Send OPERATION_START event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 */
export function sendOperationStart(operationId: string, operationName: string) {
    const event: OperationStartEvent = {
        eventName: EventName.OPERATION_START,
        operationId,
        operationName,
    };

    sendEvent(event);
}

/**
 * Send OPERATION_END event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param duration Time elapsed for the operation, in milliseconds.
 * @param err An optional Error instance if occurs during the operation.
 */
export function sendOperationEnd(operationId: string, operationName: string, duration: number, err?: Error) {
    const event: OperationEndEvent = {
        eventName: EventName.OPERATION_END,
        operationId,
        operationName,
        duration,
        ...extractErrorInfo(err),
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
        ...extractErrorInfo(err),
    };

    sendEvent(event);
}

/**
 * Send an ERROR event during an operation, carrying id and name of the operation.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param err An Error instance containing details.
 */
export function sendOperationError(operationId: string, operationName: string, err: Error) {
    const event: OperationErrorEvent = {
        eventName: EventName.ERROR,
        operationId,
        operationName,
        ...extractErrorInfo(err),
    };

    sendEvent(event);
}

/**
 * Send an INFO event during an operation.
 * @param operationId Unique id of the operation.
 * @param data Values of string type go to customDimensions, values of number type go to customMeasurements.
 */
export function sendInfo(operationId: string, data: { [key: string]: string | number }): void;

/**
 * Send an INFO event during an operation.
 * Note that: operationId will overwrite dimensions['operationId'] if it exists.
 * @param operationId Unique id of the operation.
 * @param dimensions The object recorded as customDimensions.
 * @param measurements The object recorded as customMeasurements.
 */
export function sendInfo(
    operationId: string,
    dimensions: { [key: string]: string },
    measurements: { [key: string]: number },
): void;

/**
 * Implementation of sendInfo.
 */
export function sendInfo(
    operationId: string,
    dimensionsOrMeasurements: { [key: string]: string } | { [key: string]: string | number },
    optionalMeasurements?: { [key: string]: number },
): void {
    if (!reporters) {
        console.warn("TelemetryReporter not initialized.");
        return;
    }

    let dimensions: { [key: string]: string };
    let measurements: { [key: string]: number };

    if (optionalMeasurements) {
        dimensions = dimensionsOrMeasurements as { [key: string]: string };
        measurements = optionalMeasurements;
    } else {
        dimensions = {};
        measurements = {};
        for (const key in dimensionsOrMeasurements) {
            if (typeof dimensionsOrMeasurements[key] === "string") {
                dimensions[key] = dimensionsOrMeasurements[key] as string;
            } else if (typeof dimensionsOrMeasurements[key] === "number") {
                measurements[key] = dimensionsOrMeasurements[key] as number;
            } else {
                // discard unsupported types.
            }
        }
    }

    sendTelemetryEvent(EventName.INFO, { ...dimensions, operationId }, measurements);
}

/**
 * Instrument callback for a procedure (regarded as a step in an operation).
 * @param operationId A unique identifier for the operation to which the step belongs.
 * @param stepName Name of the step.
 * @param cb The callback function with a unique Id passed by its 1st parameter.
 * @returns The instrumented callback.
 */
export function instrumentOperationStep(
    operationId: string,
    stepName: string,
    cb: (...args: any[]) => any,
): (...args: any[]) => any {
    return async (...args: any[]) => {
        let error;
        const startAt: number = Date.now();

        try {
            return await cb(...args);
        } catch (e) {
            error = e as Error;
            throw e;
        } finally {
            const event: OperationStepEvent = {
                eventName: EventName.OPERATION_STEP,
                operationId,
                stepName,
                duration: Date.now() - startAt,
                ...extractErrorInfo(error),
            };

            sendEvent(event);
        }
    };
}

/**
 * Create a UUID string using uuid.v4().
 */
export function createUuid(): string {
    return uuid.v4();
}

/**
 * Dispose the reporter.
 */
export async function dispose(): Promise<any> {
    if (reporters) {
        return await Promise.all(reporters.map((reporter: TelemetryReporter) => reporter.dispose()));
    }
}

/**
 * Add a context property that will be set for all "info" events.
 * It will be overwritten by the property with the same name, if it's explicitly set in an event.
 * @param name name of context property
 * @param value value of context property
 */
export function addContextProperty(name: string, value: string) {
    contextProperties[name] = value;
}


/**
 * @deprecated This method is deprecated. Use replacementOptions in IOptions instead.
 * Add a replacement rule that will be applied to all properties. Useful when you want to wipe sensitive data.
 *
 * Note: rules will not affect context properties.
 *
 * @param pattern RegExp pattern to search
 * @param replaceString target string to repalce matched parts
 */
export function addReplacementRule(pattern: RegExp, replaceString?: string) {
    replacementRules.push({
        pattern,
        replace: replaceString ?? ""
    });
}

function extractErrorInfo(err?: Error): ErrorInfo {
    if (!err) {
        return {
            errorCode: ErrorCodes.NO_ERROR,
        };
    }

    const richError = err as RichError;
    return {
        errorCode: richError.errorCode || ErrorCodes.GENERAL_ERROR,
        errorType: richError.isUserError ? ErrorType.USER_ERROR : ErrorType.SYSTEM_ERROR,
        message: err.message,
        stack: err.stack,
    };
}

function sendEvent(event: TelemetryEvent) {
    if (!reporters) {
        console.warn("TelemetryReporter not initialized.");
        return;
    }
    const dimensions: { [key: string]: string } = {};
    for (const key of DimensionEntries) {
        const value = (event as any)[key];
        if (value !== undefined) {
            dimensions[key] = String(value);
        }
    }

    const measurements: { [key: string]: number } = {};
    for (const key of MeasurementEntries) {
        const value = (event as any)[key];
        if (value !== undefined) {
            measurements[key] = value;
        }
    }

    sendTelemetryEvent(event.eventName, dimensions, measurements);
}

function sendTelemetryEvent(
    eventName: string,
    dimensions?: {
        [key: string]: string;
    },
    measurements?: {
        [key: string]: number;
    }): void {

    if (!reporters) {
        console.warn("TelemetryReporter not initialized.");
        return;
    }

    // apply replacement rules
    dimensions = dimensions ?? {};
    for (const k of Object.keys(dimensions)) {
        dimensions[k] = applyRules(replacementRules, dimensions[k]);
    }
    // add context props
    dimensions = {...contextProperties, ...dimensions};

    if (eventName in SENSITIVE_EVENTS) { // for GDPR
        reporters.forEach((reporter: TelemetryReporter) => {
            reporter.sendTelemetryErrorEvent(eventName, dimensions, measurements);
        });
    } else {
        reporters.forEach((reporter: TelemetryReporter) => {
            reporter.sendTelemetryEvent(eventName, dimensions, measurements);
        });
    }
    if (isDebug) {
        Output.getInstance().appendLine(`>> ${(new Date()).toISOString()}`);
        Output.getInstance().appendLine(JSON.stringify({ eventName, dimensions, measurements }, null, 2));
    }
}

function applyRules(rules: ReplacementRule[], content: string): string {
    for(const rule of rules) {
        content = content.replace(rule.pattern, rule.replace);
    }
    return content;
}
