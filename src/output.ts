import * as vscode from "vscode";

const OUTPUT_CHANNEL_NAME = "Telemetry Wrapper";

export class Output {
    private static INSTANCE: vscode.OutputChannel
    private constructor() {
    }

    public static getInstance() {
        if (!this.INSTANCE) {
            this.INSTANCE = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
        }
        return this.INSTANCE;
    }
}