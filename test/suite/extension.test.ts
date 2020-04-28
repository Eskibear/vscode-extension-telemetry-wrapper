import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import {
  initialize,
  instrumentOperation,
  instrumentOperationAsVsCodeCommand,
  instrumentSimpleOperation,
} from "../../src";

suite("Extension Test Suite 1", () => {
  vscode.window.showInformationMessage("Start all tests.");
  initialize("my.ext", "0.1.0", "fakeAIKey", {debug: false});

  test("instrumentOperation", async () => {
    const func = (operationId: string, a: any) => (a + 1);
    assert.equal(await instrumentOperation("add", func)(0), 1);
  });

  test("instrumentSimpleOperation", async () => {
    const func = (a: any) => (a + 1);
    assert.equal(await instrumentSimpleOperation("add", func)(0), 1);
  });

  test("instrumentOperationAsVsCodeCommand", async () => {
    const func = (a: any) => (a + 1);
    instrumentOperationAsVsCodeCommand("my.command.add", func);
    assert.equal(await vscode.commands.executeCommand("my.command.add", 0), 1);
  });

  test("instrumentOperation with thisArg", async () => {
    const obj = {
      msg: "hello",
      func(operationId: string, name: string) {
        return this.msg + " " + name;
      },
    };
    const obj2 = { msg: "hi" };
    assert.equal(await instrumentOperation("add", obj.func, obj)("world"), "hello world");
    assert.equal(await instrumentOperation("add", obj.func, obj2)("world"), "hi world");
    assert.equal(await instrumentOperation("add", obj.func)("world"), undefined);
  });

  test("instrumentSimpleOperation with thisArg", async () => {
    const obj = {
      msg: "hello",
      func(name: string) {
        return this.msg + " " + name;
      },
    };
    assert.equal(await instrumentSimpleOperation("add", obj.func, obj)("world"), "hello world");
    assert.equal(await instrumentSimpleOperation("add", obj.func)("world"), undefined);
  });

  test("instrumentSimpleOperation with super", async () => {
    class Base {
      private msg: string;
      constructor(msg: string) {
        this.msg = msg;
      }
      public func(name: string) {
        return this.msg + " " + name;
      }
    }

    // tslint:disable-next-line: max-classes-per-file
    class Derived extends Base {
      public subfunc(name: string) {
        return super.func(name) + "!";
      }
    }

    const obj = new Derived("hello");
    assert.equal(await instrumentSimpleOperation("add", obj.subfunc, obj)("world"), "hello world!");
    assert.equal(await instrumentSimpleOperation("add", obj.subfunc)("world"), undefined);
  });

});
