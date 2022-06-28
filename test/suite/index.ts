import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export function run(testsRoot: string, cb: (error: any, failures?: number) => void): void {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
    timeout: 1 * 60 * 1000,
  });

  glob('**/**.test.js', { cwd: testsRoot }, (err: any, files: any[]) => {
    if (err) {
      return cb(err);
    }

    // Add files to the test suite
    files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

    try {
      // Run the mocha test
      mocha
        .run(failures => {
          cb(null, failures);
        });

    } catch (err) {
      cb(err);
    }
  });
}
