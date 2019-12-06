"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var fs = require("fs");
var uuidv4 = require("uuid/v4");
var vscode = require("vscode");
var vscode_extension_telemetry_1 = require("vscode-extension-telemetry");
var event_1 = require("./event");
var isDebug = false;
var reporter;
/**
 * Initialize TelemetryReporter by parsing attributes from a JSON file.
 * It reads these attributes: publisher, name, version, aiKey.
 * @param jsonFilepath absolute path of a JSON file.
 * @param debug If set as true, debug information be printed to console.
 */
function initializeFromJsonFile(jsonFilepath, debug) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    fs.exists(jsonFilepath, function (exists) {
                        if (exists) {
                            var _a = JSON.parse(fs.readFileSync(jsonFilepath, "utf-8")), publisher = _a.publisher, name_1 = _a.name, version = _a.version, aiKey = _a.aiKey;
                            initialize(publisher + "." + name_1, version, aiKey, !!debug);
                            return resolve();
                        }
                        else {
                            return reject(new Error("The Json file '" + jsonFilepath + "' does not exist."));
                        }
                    });
                })];
        });
    });
}
exports.initializeFromJsonFile = initializeFromJsonFile;
/**
 * Initialize TelemetryReporter from given attributes.
 * @param extensionId Identifier of the extension, used as prefix of EventName in telemetry data.
 * @param version Version of the extension.
 * @param aiKey Key of Application Insights.
 * @param debug If set as true, debug information be printed to console.
 */
function initialize(extensionId, version, aiKey, debug) {
    if (reporter) {
        throw new Error("TelemetryReporter already initialized.");
    }
    if (aiKey) {
        reporter = new vscode_extension_telemetry_1["default"](extensionId, version, aiKey);
    }
    isDebug = !!debug;
}
exports.initialize = initialize;
/**
 * Mark an Error instance as a user error.
 */
function setUserError(err) {
    err.isUserError = true;
}
exports.setUserError = setUserError;
/**
 * Set custom error code or an Error instance.
 * @param errorCode A custom error code.
 */
function setErrorCode(err, errorCode) {
    err.errorCode = errorCode;
}
exports.setErrorCode = setErrorCode;
/**
 * Instrument callback for a command to auto send OPERATION_START, OPERATION_END, ERROR telemetry.
 * A unique Id is created and accessible in the callback.
 * @param operationName For extension activation, use "activation", for VS Code commands, use command name.
 * @param cb The callback function **with a unique Id passed by its 1st parameter**.
 * @param thisArg The `this` context used when invoking the handler function.
 * @returns The instrumented callback.
 */
function instrumentOperation(operationName, cb, thisArg) {
    var _this = this;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var error, operationId, startAt, e_1, duration;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        operationId = createUuid();
                        startAt = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        sendOperationStart(operationId, operationName);
                        return [4 /*yield*/, cb.apply(thisArg, [operationId].concat(args))];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        e_1 = _a.sent();
                        error = e_1;
                        sendOperationError(operationId, operationName, e_1);
                        return [3 /*break*/, 5];
                    case 4:
                        duration = Date.now() - startAt;
                        sendOperationEnd(operationId, operationName, duration, error);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
}
exports.instrumentOperation = instrumentOperation;
/**
 * Instrument callback for a command to auto send OPERATION_START, OPERATION_END, ERROR telemetry.
 * @param operationName For extension activation, use "activation", for VS Code commands, use command name.
 * @param cb The callback function.
 * @param thisArg The `this` context used when invoking the handler function.
 * @returns The instrumented callback.
 */
function instrumentSimpleOperation(operationName, cb, thisArg) {
    var _this = this;
    return instrumentOperation(operationName, function (_operationId) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, cb.apply(thisArg, args)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        }); });
    });
}
exports.instrumentSimpleOperation = instrumentSimpleOperation;
/**
 * A shortcut to instrument and operation and register it as a VSCode command.
 * Note that operation Id will no longer be accessible in this approach.
 * @param command A unique identifier for the command.
 * @param cb A command handler function.
 * @param thisArg The `this` context used when invoking the handler function.
 */
function instrumentOperationAsVsCodeCommand(command, cb, thisArg) {
    return vscode.commands.registerCommand(command, instrumentSimpleOperation(command, cb, thisArg));
}
exports.instrumentOperationAsVsCodeCommand = instrumentOperationAsVsCodeCommand;
/**
 * Send OPERATION_START event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 */
function sendOperationStart(operationId, operationName) {
    var event = {
        eventName: event_1.EventName.OPERATION_START,
        operationId: operationId,
        operationName: operationName
    };
    sendEvent(event);
}
exports.sendOperationStart = sendOperationStart;
/**
 * Send OPERATION_END event.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param duration Time elapsed for the operation, in milliseconds.
 * @param err An optional Error instance if occurs during the operation.
 */
function sendOperationEnd(operationId, operationName, duration, err) {
    var event = __assign({ eventName: event_1.EventName.OPERATION_END, operationId: operationId,
        operationName: operationName,
        duration: duration }, extractErrorInfo(err));
    sendEvent(event);
}
exports.sendOperationEnd = sendOperationEnd;
/**
 * Send an ERROR event.
 * @param err An Error instance.
 */
function sendError(err) {
    var event = __assign({ eventName: event_1.EventName.ERROR }, extractErrorInfo(err));
    sendEvent(event);
}
exports.sendError = sendError;
/**
 * Send an ERROR event during an operation, carrying id and name of the operation.
 * @param operationId Unique id of the operation.
 * @param operationName Name of the operation.
 * @param err An Error instance containing details.
 */
function sendOperationError(operationId, operationName, err) {
    var event = __assign({ eventName: event_1.EventName.ERROR, operationId: operationId,
        operationName: operationName }, extractErrorInfo(err));
    sendEvent(event);
}
exports.sendOperationError = sendOperationError;
/**
 * Implementation of sendInfo.
 */
function sendInfo(operationId, dimensionsOrMeasurements, optionalMeasurements) {
    var dimensions;
    var measurements;
    if (optionalMeasurements) {
        dimensions = dimensionsOrMeasurements;
        measurements = optionalMeasurements;
    }
    else {
        dimensions = {};
        measurements = {};
        for (var key in dimensionsOrMeasurements) {
            if (typeof dimensionsOrMeasurements[key] === "string") {
                dimensions[key] = dimensionsOrMeasurements[key];
            }
            else if (typeof dimensionsOrMeasurements[key] === "number") {
                measurements[key] = dimensionsOrMeasurements[key];
            }
            else {
                // discard unsupported types.
            }
        }
    }
    sendTelemetryEvent(event_1.EventName.INFO, __assign({}, dimensions, { operationId: operationId }), measurements);
}
exports.sendInfo = sendInfo;
/**
 * Instrument callback for a procedure (regarded as a step in an operation).
 * @param operationId A unique identifier for the operation to which the step belongs.
 * @param stepName Name of the step.
 * @param cb The callback function with a unique Id passed by its 1st parameter.
 * @returns The instrumented callback.
 */
function instrumentOperationStep(operationId, stepName, cb) {
    var _this = this;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var error, startAt, e_2, event_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startAt = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, cb.apply(void 0, args)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        e_2 = _a.sent();
                        error = e_2;
                        throw e_2;
                    case 4:
                        event_2 = __assign({ eventName: event_1.EventName.OPERATION_STEP, operationId: operationId,
                            stepName: stepName, duration: Date.now() - startAt }, extractErrorInfo(error));
                        sendEvent(event_2);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
}
exports.instrumentOperationStep = instrumentOperationStep;
/**
 * Create a UUID string using uuid.v4().
 */
function createUuid() {
    return uuidv4();
}
exports.createUuid = createUuid;
/**
 * Dispose the reporter.
 */
function dispose() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!reporter) return [3 /*break*/, 2];
                    return [4 /*yield*/, reporter.dispose()];
                case 1: return [2 /*return*/, _a.sent()];
                case 2: return [2 /*return*/];
            }
        });
    });
}
exports.dispose = dispose;
function extractErrorInfo(err) {
    if (!err) {
        return {
            errorCode: event_1.ErrorCodes.NO_ERROR
        };
    }
    var richError = err;
    return {
        errorCode: richError.errorCode || event_1.ErrorCodes.GENERAL_ERROR,
        errorType: richError.isUserError ? event_1.ErrorType.USER_ERROR : event_1.ErrorType.SYSTEM_ERROR,
        message: err.message,
        stack: err.stack
    };
}
function sendEvent(event) {
    if (!reporter) {
        return;
    }
    var dimensions = {};
    for (var _i = 0, DimensionEntries_1 = event_1.DimensionEntries; _i < DimensionEntries_1.length; _i++) {
        var key = DimensionEntries_1[_i];
        var value = event[key];
        if (value !== undefined) {
            dimensions[key] = String(value);
        }
    }
    var measurements = {};
    for (var _a = 0, MeasurementEntries_1 = event_1.MeasurementEntries; _a < MeasurementEntries_1.length; _a++) {
        var key = MeasurementEntries_1[_a];
        var value = event[key];
        if (value !== undefined) {
            measurements[key] = value;
        }
    }
    sendTelemetryEvent(event.eventName, dimensions, measurements);
}
function sendTelemetryEvent(eventName, dimensions, measurements) {
    reporter.sendTelemetryEvent(eventName, dimensions, measurements);
    if (isDebug) {
        // tslint:disable-next-line:no-console
        console.log(eventName, { eventName: eventName, dimensions: dimensions, measurements: measurements });
    }
}
