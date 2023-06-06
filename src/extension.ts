import * as vscode from "vscode";
import querystring from "querystring";
import { text } from "stream/consumers";

async function isFileAtUri(uri: vscode.Uri): Promise<boolean> {
  try {
    return (
      ((await vscode.workspace.fs.stat(uri)).type & vscode.FileType.File) !== 0
    );
  } catch {
    return false;
  }
}

type TextDocument = {
  uri: vscode.Uri;
  options: vscode.TextDocumentShowOptions;
};

async function editorTextDocuments(path: string): Promise<TextDocument[]> {
  // Without any workspace folders we will not be able to open the requested path
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return [];
  }

  // See if any workspace folder contains a file at the provided path
  const candidates = workspaceFolders.map(({ uri }) =>
    vscode.Uri.joinPath(uri, path)
  );
  const fileUri = candidates.find(isFileAtUri);
  if (!fileUri) {
    return [];
  }

  const textDocuments: TextDocument[] = [];
  const appendTextDocument = (uri: vscode.Uri) => {
    const firstDocument = textDocuments.length === 0;
    const viewColumn = firstDocument
      ? vscode.ViewColumn.Active
      : vscode.ViewColumn.Beside;

    textDocuments.push({
      uri,
      options: {
        preserveFocus: !firstDocument,
        preview: !firstDocument,
        viewColumn,
      },
    });
  };

  // If the filepath is a view component, open a split view with the HTML file as the first editor
  const viewComponentHtmlPath = fileUri.path.replace(".rb", ".html.erb");
  if (fileUri.path !== viewComponentHtmlPath) {
    const componentHtmlUri = vscode.Uri.file(viewComponentHtmlPath);
    if (await isFileAtUri(componentHtmlUri)) {
      appendTextDocument(componentHtmlUri);
    }
  }

  appendTextDocument(fileUri);

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
