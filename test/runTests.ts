import * as path from "path";

import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from "@vscode/test-electron";

async function go() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite");
    const testWorkspace = path.resolve(__dirname, "../../test-fixtures");
    const vscodeExecutablePath = await downloadAndUnzipVSCode();
    const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspace,
        "--disable-extensions",
        "--disable-workspace-trust"
      ],
    });
  } catch (err) {
    process.exit(1);
  }
}

go();
