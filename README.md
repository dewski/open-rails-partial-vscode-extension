# Rails Open Partial VS Code Extension

`dewski.rails-open-partial` allows you to open Rails partials directly from your browser using the [Rails Open Partial](https://github.com/dewski/rails-open-partial-chrome-extension) Chrome Extension.

## Known Issues

This extension works by checking to see if a filepath exists in any of the workspaces you have open in the current window. When the Chrome extension activates this VS Code extension using the `vscode://dewski.open-rails-partial/partial` URL, it will open the file in the first workspace that matches the filepath.

If the file is not found in any of the workspaces of the last open window, it will return an error requiring you to bring focus to the window that has the workspace for the Rails project you are opening a partial for.

## Why is this extension necessary?

As Rails only includes the partial path relative to the root of the Rails project, we do not have access to the absolute path of the file. The built-in `vscode://file/path/to/file` URL scheme requires the absolute path of the file to open it in VS Code.

Additionally, projects in remote workspaces such as Codespaces are not supported by the built-in `vscode://file/path/to/file` URL scheme.
