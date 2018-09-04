import * as fse from 'fs-extra';
import * as uuid from "uuid";
import TelemetryReporter from "vscode-extension-telemetry";

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

