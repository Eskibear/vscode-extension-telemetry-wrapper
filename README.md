[![npm Package](https://img.shields.io/npm/v/vscode-extension-telemetry-wrapper.svg)](https://www.npmjs.org/package/vscode-extension-telemetry-wrapper)
[![License](https://img.shields.io/npm/l/express.svg)](https://github.com/eskibear/vscode-extension-telemetry-wrapper/blob/master/LICENSE)
[![downloads per month](https://img.shields.io/npm/dm/vscode-extension-telemetry-wrapper.svg)](https://www.npmjs.org/package/vscode-extension-telemetry-wrapper)

Inject code to send telemetry to Application Insight when register commands.
It sends `commandStart` and `commandEnd` for execution of each the command.

## Usage

```
import { TelemetryWrapper } from "vscode-extension-telemetry-wrapper";

// initialize with specific parameters
TelemetryWrapper.initilize(publisher, extensionName, version, aiKey);

// or directly from Json file, e.g. package.json
TelemetryWrapper.initilizeFromJsonFile(context.asAbsolutePath("./package.json"));
```

For compatibility, the legacy `TelemetryReporter` can be accessed by `TelemetryWrapper.getReporter()`.


### Previous without wrapper

```
export function activate(context: vscode.ExtensionContext): void {

    vscode.commands.registerCommand("commandName", 
        (args: any[]): void => {
            // TODO
        }
    );

}
```

### Now

**Basic usage**

```
export function activate(context: vscode.ExtensionContext): void {

    TelemetryWrapper.registerCommand("commandName", () => {
        return (args: any[]): void => {
            // TODO
        }
    });

}
```

**Send custom usage data during the session**
```
export function activate(context: vscode.ExtensionContext): void {

    TelemetryWrapper.registerCommand("commandName", (t: Session) => {
        return (args: any[]): void => {
            // TODO: initialize
            t.sendTelemetryEvent(“initializeDone”);
            // TODO: pre tasks
            t.sendTelemetryEvent("preTasksDone");
            // TODO: final tasks
        }
    });

}
```

Result:

* publisher.extension/commandStart      {sessionId: xxx}
* publisher.extension/initilizeDone     {sessionId: xxx}
* publisher.extension/preTasksDone      {sessionId: xxx}
* publisher.extension/commandEnd        {sessionId: xxx, exitCode: 0}


**Send custom usage data with different log level**
```
export function activate(context: vscode.ExtensionContext): void {

    TelemetryWrapper.registerCommand("commandName", (t: Session) => {
        return (args: any[]): void => {
            // TODO: initialize
            t.info(“initializeDone”);
            // TODO: pre tasks with error
            t.error("preTasksNotDone");
            // TODO: final tasks
        }
    });
}
```
Result:

* publisher.extension/commandStart      {sessionId: xxx}
* publisher.extension/info              {message: "initilizeDone", sessionId: xxx}
* publisher.extension/error             {message: "preTasksDone", sessionId: xxx}
* publisher.extension/commandEnd        {sessionId: xxx, exitCode: 255}


**Inject customized properties into the a session**
```
export function activate(context: vscode.ExtensionContext): void {

    TelemetryWrapper.registerCommand("commandName", (t: Session) => {
        return (args: any[]): void => {
            t.customProperties.finishedSteps = [];
            // TODO: initialize
            t.customProperties.finishedSteps.push("initialize");
            // TODO: pre tasks
            t.customProperties.finishedSteps.push("preTasks");
            // TODO: final tasks
            t.customProperties.finishedSteps.push("finalTasks");
        }
    });

}
```

Result:

* publisher.extension/commandStart
    ```
    {
        sessionId: xxx
    }
    ```
* publisher.extension/commandEnd
    ```
    {
        sessionId: xxx,
        exitCode: 0,
        finishedSteps: [
            "initialize",
            "preTasks",
            "finalTasks"
        ]
    }
    ```


