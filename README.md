Inject code to send telemetry to Application Insight when register commands.
It sends `commandStart` and `commandEnd`/`commandError` for execution of each the command.

## Usage

```
import { TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
```

For compatibility, the legacy `TelemetryReporter` can be accessed by `TelemetryWrapper.getReporter()`.


### Previous without wrapper

```
export function activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.commands.registerCommand("commandName", 
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
    TelemetryWrapper.registerCommand(context, "commandName", () => {
        return (args: any[]): void => {
            // TODO
        }
    });
}
```

**Send custom usage data during the transaction**
```
export function activate(context: vscode.ExtensionContext): void {
    TelemetryWrapper.registerCommand(context, "commandName", (t: Transaction) => {
        return (args: any[]): void => {
            // TODO: initialize
            TelemetryWrapper.getReporter().sendTelemetryEvent("initilizeDone", {transectionId: t.id});
            // TODO: pre tasks
            TelemetryWrapper.getReporter().sendTelemetryEvent("preTasksDone", {transectionId: t.id});
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


**Inject customized properties into the transaction**
```
export function activate(context: vscode.ExtensionContext): void {
    TelemetryWrapper.registerCommand(context, "commandName", (t: Transaction) => {
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
        transectionId: xxx
    }
    ```
* publisher.extension/commandEnd
    ```
    {
        transectionId: xxx,
        finishedSteps: [
            "initialize",
            "preTasks",
             "finalTasks"
        ]
    }
    ```


