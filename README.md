Inject code to send telemetry to Application Insight when register commands.
It sends `commandStart` and `commandEnd`/`commandError` for execution of each the command.

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
            TelemetryWrapper.getReporter().sendTelemetryEvent("initilizeDone", {sessionId: t.id});
            // TODO: pre tasks
            TelemetryWrapper.getReporter().sendTelemetryEvent("preTasksDone", {sessionId: t.id});
            // TODO: final tasks
        }
    });

}
```

Result:

* publisher.extension/commandStart
* publisher.extension/initilizeDone
* publisher.extension/preTasksDone
* publisher.extension/commandEnd


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
        finishedSteps: [
            "initialize",
            "preTasks",
            "finalTasks"
        ]
    }
    ```


