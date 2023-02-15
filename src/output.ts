import * as vscode from "vscode";

export class Output {
    private static INSTANCE: vscode.OutputChannel;
    private static extensionId: string;
    private constructor() {
    }

    public static getInstance() {
        if (!this.INSTANCE) {
            this.INSTANCE = vscode.window.createOutputChannel(`Telemetry Wrapper (${Output.extensionId})`);
        }
        return this.INSTANCE;
    }

    public static setExtensionId(extensionId: string) {
        Output.extensionId = extensionId;
    }
}