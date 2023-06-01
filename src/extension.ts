import * as vscode from "vscode";
import querystring from "querystring";

class UriEventHandler
  extends vscode.EventEmitter<vscode.Uri>
  implements vscode.UriHandler
{
  public handleUri(uri: vscode.Uri) {
    this.fire(uri); // is this needed?

    // Without any workspace folders we will not be able to open the requested path
    if (!vscode.workspace.workspaceFolders) {
      console.debug("No workspace folders found");
      return;
    }

    if (uri.path === "/partial" && uri.query) {
      console.debug(`URI handled: ${uri.toString()}`);

      // Parse the query string for the path to the file
      const { path } = querystring.parse(uri.query);
      if (typeof path !== "string") {
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders.find(
        async ({ uri }) => {
          const workspaceFileUri = vscode.Uri.joinPath(uri, path);
          try {
            await vscode.workspace.fs.stat(workspaceFileUri);
          } catch (error) {
            return false;
          }
        }
      );

      if (!workspaceFolder) {
        vscode.window.showErrorMessage(
          `Could not find ${path} in any workspace folders in the current window. Try another window.`,
          {
            modal: true,
          }
        );
        return;
      }

      const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, path);
      // Open the file in the editor
      vscode.workspace.openTextDocument(fileUri).then((textDocument) => {
        vscode.window
          .showTextDocument(textDocument, {
            preserveFocus: false,
            preview: false,
          })
          .then(
            (editor: vscode.TextEditor) => {
              console.debug(`File opened successfully: ${fileUri}`);
            },
            (reason) => {
              vscode.window.showErrorMessage(`File failed to open: ${reason}`, {
                modal: true,
              });
            }
          );
      });
    }
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const uriHandler = new UriEventHandler();
  context.subscriptions.push(uriHandler);
  context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));
}

// This method is called when your extension is deactivated
export function deactivate() {}
