import * as path from "path";

import { downloadAndUnzipVSCode, runTests } from "vscode-test";

async function go() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite");
    const testWorkspace = path.resolve(__dirname, "../../test-fixtures");
    const vscodeExecutablePath = await downloadAndUnzipVSCode("1.40.2");
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspace,
        "--disable-extensions",
      ],
    });
  } catch (err) {
    process.exit(1);
  }
}

go();
