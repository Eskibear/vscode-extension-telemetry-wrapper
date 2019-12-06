"use strict";
exports.__esModule = true;
var EventName;
(function (EventName) {
    EventName["ERROR"] = "error";
    EventName["INFO"] = "info";
    EventName["OPERATION_START"] = "opStart";
    EventName["OPERATION_END"] = "opEnd";
    EventName["OPERATION_STEP"] = "opStep";
})(EventName = exports.EventName || (exports.EventName = {}));
var ErrorCodes;
(function (ErrorCodes) {
    ErrorCodes.NO_ERROR = 0;
    ErrorCodes.GENERAL_ERROR = 1;
})(ErrorCodes = exports.ErrorCodes || (exports.ErrorCodes = {}));
var ErrorType;
(function (ErrorType) {
    ErrorType["USER_ERROR"] = "userError";
    ErrorType["SYSTEM_ERROR"] = "systemError";
})(ErrorType = exports.ErrorType || (exports.ErrorType = {}));
exports.DimensionEntries = [
    "operationId",
    "operationName",
    "errorCode",
    "errorType",
    "message",
    "stack",
    "stepName",
];
exports.MeasurementEntries = [
    "duration",
];
