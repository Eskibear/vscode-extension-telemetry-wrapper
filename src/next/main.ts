import * as fse from 'fs-extra';
import * as uuid from "uuid";
import TelemetryReporter from "vscode-extension-telemetry";

// Determine whether in debugging extension. Copied from:
// https://github.com/redhat-developer/vscode-java/blob/e8716fd827061b5d96b2483734279b6d76694fe3/src/javaServerStarter.ts#L9
declare var v8debug: any;
const DEBUG = (typeof v8debug === 'object') || startedInDebugMode();
function startedInDebugMode(): boolean {
    let args = (process as any).execArgv;
    if (args) {
        return args.some((arg: any) => /^--debug=?/.test(arg) || /^--debug-brk=?/.test(arg) || /^--inspect-brk=?/.test(arg));
    }
    return false;
}

let reporter: TelemetryReporter;

/**
 * Initialize TelemetryReporter by parsing attributes from a JSON file.
 * It reads these attributes: publisher, name, version, aiKey.
 * @param jsonFilepath absolute path of a JSON file.
 */
export async function initilizeFromJsonFile(jsonFilepath: string): Promise<void> {
    if (await fse.pathExists(jsonFilepath)) {
        const { publisher, name, version, aiKey } = await fse.readJSON(jsonFilepath);
        initilizeFromAttributes(`${publisher}.${name}`, version, aiKey);
    } else {
        throw new Error(`The Json file '${jsonFilepath}' does not exist.`);
    }
}

/**
 * Initialize TelemetryReporter from given attributes.
 * @param extensionId Idenfier of the extension, used as prefix of EventName in telemetry data.
 * @param version Version of the extension.
 * @param aiKey Key of Application Insights.
 */
export function initilizeFromAttributes(extensionId: string, version: string, aiKey: string): void {
    if (reporter) {
        throw new Error("TelemetryReporter already initilized.");
    }
    if (aiKey) {
        reporter = new TelemetryReporter(extensionId, version, aiKey);
    }
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
        if (DEBUG) {
            console.log(eventName, {eventName, properties, measurements});
        }
    } else {
        if (DEBUG) {
            console.warn("TelemetryReporter is not initialized.");
        }
    }
}

