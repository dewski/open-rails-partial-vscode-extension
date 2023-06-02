import * as vscode from "vscode";
import querystring from "querystring";
import { text } from "stream/consumers";

type TextDocument = {
  uri: vscode.Uri;
  options: vscode.TextDocumentShowOptions;
};

async function editorTextDocuments(path: string): Promise<TextDocument[]> {
  const textDocuments: TextDocument[] = [];
  if (!vscode.workspace.workspaceFolders) {
    return textDocuments;
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
    return textDocuments;
  }

  const workspaceFileUri = vscode.Uri.joinPath(workspaceFolder.uri, path);
  try {
    await vscode.workspace.fs.stat(workspaceFileUri);

    textDocuments.unshift({
      uri: workspaceFileUri,
      options: {
        preserveFocus: false,
        preview: false,
        viewColumn: vscode.ViewColumn.Active,
      },
    });
  } catch (error) {
    console.error(error);
    return textDocuments;
  }

  // If the filepath is a view component, open a split view with the HTML file as the first editor
  const viewComponentHtmlPath = path.replace(".rb", ".html.erb");
  if (path !== viewComponentHtmlPath) {
    const componentHtmlUri = vscode.Uri.joinPath(
      workspaceFolder.uri,
      path.replace(".rb", ".html.erb")
    );

    try {
      await vscode.workspace.fs.stat(componentHtmlUri);
      textDocuments.unshift({
        uri: componentHtmlUri,
        options: {
          preserveFocus: true,

          // If the user doesn't start editing this file, close it automatically
          preview: true,
          viewColumn: vscode.ViewColumn.Beside,
        },
      });
    } catch (error) {
      console.error(error);
      return textDocuments;
    }
  }

  return textDocuments;
}

class UriEventHandler
  extends vscode.EventEmitter<vscode.Uri>
  implements vscode.UriHandler
{
  public async handleUri(uri: vscode.Uri) {
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

      const textEditors = await editorTextDocuments(path);
      if (!textEditors.length) {
        vscode.window.showErrorMessage(
          `Could not find ${path} in any workspace folders in the current window. Try another window or make sure your codebase is up-to-date.`,
          {
            modal: true,
          }
        );
        return;
      }

      textEditors.forEach((textDocument) => {
        vscode.window
          .showTextDocument(textDocument.uri, textDocument.options)
          .then(
            (editor: vscode.TextEditor) => {
              console.debug(
                `File opened successfully ${textDocument.uri} in ${editor.viewColumn} with options ${textDocument.options}`
              );
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
