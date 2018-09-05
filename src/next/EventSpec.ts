import { ErrorType } from "./ErrorType";

export enum EventName {
    ERROR = "error",
    INFO = "info",
    OPERATION_START = "opStart",
    OPERATION_END = "opEnd"
}

export interface ErrorBody {
    errorCode: string;
    errorType?: ErrorType;
    message?: string;
    stack?: string;
}

export const ERROR_KEYS: string[] = [
    "errorCode",    // Preserve "0" for no error, "1" for general error.
    "errorType",    // Indicator of error type. Possible values: USER_ERROR, SYSTEM_ERROR.
    "message",      // For message of an Error.
    "stack",        // For callstack of an Error.
];

export interface Dimensions {
    // placeholder for common fields. E.g. extra data carried with an event.
}

export interface Measurements {
    // placeholder for common fields.
}

export interface OperationIdenfier {
    oId: string;
    oName: string;
}

export interface OptionalOperationIdenfier {
    oId?: string;
    oName?: string;
}

export interface ErrorDimensions extends Dimensions, ErrorBody, OptionalOperationIdenfier {}
export interface OperationStartDimensions extends Dimensions, OperationIdenfier {}
export interface OperationEndDimensions extends Dimensions, OperationIdenfier, ErrorBody {}
