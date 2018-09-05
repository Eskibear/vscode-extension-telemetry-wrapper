import { OperationStartEvent, OperationEndEvent, OperationalErrorEvent, ErrorEvent, ErrorCodes, ErrorType, TelemetryEvent, ErrorInfo, EventName, DimensionEntries } from "./event";
import { ErrorCode } from "./ErrorCode";

interface RichError extends Error {
    isUserError?: boolean;
    errorCode?: number;
}

export function setUserError(err: Error): Error {
    return { isUserError: true, ...err } as Error;
}

export function setErrorCode(err: Error, errorCode: number): Error {
    return { errorCode, ...err } as Error;
}

export function instrumentCommand(commandName: string, cb: (...args: any[]) => any): (...args: any[]) => any {
    return async (...args: any[]) => {
        let error = undefined;
        let operationId = "some id";
        const startAt: number = Date.now();

        try {
            sendOperationStart(operationId, commandName);
            return await cb(operationId, ...args);
        } catch (e) {
            error = e;
            sendOperationalError(operationId, commandName, e);
        } finally {
            const duration = Date.now() - startAt;
            sendOperationEnd(operationId, commandName, duration, error);
        }
    }
}

export function sendOperationStart(operationId: string, operationName: string) {
    const event: OperationStartEvent = {
        eventName: EventName.OPERATION_START,
        operationId: operationId,
        operationName: operationName
    };

    sendEvent(event);
}

export function sendOperationEnd(operationId: string, operationName: string, duration: number, err: Error) {
    const event: OperationEndEvent = {
        eventName: EventName.OPERATION_END,
        operationId: operationId,
        operationName: operationName,
        duration: duration,
        ...extractErrorInfo(err)
    };

    sendEvent(event);
}

export function sendError(err: Error) {
    const event: ErrorEvent = {
        eventName: EventName.ERROR,
        ...extractErrorInfo(err)
    };

    sendEvent(event);
}

export function sendOperationalError(operationId: string, operationName: string, err: Error) {
    const event: OperationalErrorEvent = {
        eventName: EventName.ERROR,
        operationId: operationId,
        operationName: operationName,
        ...extractErrorInfo(err)
    };

    sendEvent(event);
}

function extractErrorInfo(err: Error): ErrorInfo {
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

}
