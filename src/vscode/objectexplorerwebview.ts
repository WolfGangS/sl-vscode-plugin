/**
 * @file objectexplorerwebview.ts
 * WebviewViewProvider for the "Second Life (Inworld)" Explorer panel.
 * Replaces the TreeDataProvider with a fully custom webview UI.
 * Copyright (C) 2025, Linden Research, Inc.
 */
import * as vscode from "vscode";
import { ObjectContentService } from "./objectcontentservice";
import { PublishedObject } from "./objectcontentinterfaces";
import { ViewerEditWSClient } from "../viewereditwsclient";
import { displayName } from "./objectcontentprovider";

function getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export class ObjectExplorerWebviewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
    public static readonly viewType = "slInworldExplorer";

    private _view?: vscode.WebviewView;
    private readonly _extensionUri: vscode.Uri;
    private readonly _service: ObjectContentService;
    private readonly _disposables: vscode.Disposable[] = [];

    constructor(
        extensionUri: vscode.Uri,
        private readonly isConnected: () => boolean,
        onConnectionChange: vscode.Event<boolean>,
        private readonly getWebSocket: () => ViewerEditWSClient | undefined,
    ) {
        this._extensionUri = extensionUri;
        this._service = ObjectContentService.getInstance();

        this._disposables.push(
            this._service.onDidChangeObjects(() => this._refresh()),
            this._service.onDidChangeRunningState((e) => this._updateItem(e)),
            onConnectionChange(() => this._updateConnectionState())
        );
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, "out"),
                vscode.Uri.joinPath(this._extensionUri, "icons"),
            ],
        };

        webviewView.webview.html = this._getHtmlContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            (message) => this._handleMessage(message),
            undefined,
            this._disposables
        );

        this._refresh();
    }

    private _refresh(): void {
        if (!this._view) { return; }
        const objects: PublishedObject[] = this._service.getObjects().map((e) => e.object);
        this._view.webview.postMessage({
            type: "refresh",
            payload: { objects, connected: this.isConnected() },
        });
    }

    private _updateConnectionState(): void {
        if (!this._view) { return; }
        this._view.webview.postMessage({
            type: "connectionState",
            payload: { connected: this.isConnected() },
        });
    }

    private _updateItem(e: { object_id: string; prim_id: string; item_id: string; running: boolean }): void {
        if (!this._view) { return; }
        this._view.webview.postMessage({
            type: "updateItem",
            payload: { object_id: e.object_id, prim_id: e.prim_id, item_id: e.item_id, running: e.running },
        });
    }

    public sendViewerCommands(commands: string[]): void {
        if (!this._view) { return; }
        this._view.webview.postMessage({ type: "viewerCommands", payload: { commands } });
    }

    private async _handleMessage(message: { command: string; payload: Record<string, unknown> }): Promise<void> {
        switch (message.command) {
            case "openItem": {
                const uri = vscode.Uri.parse(message.payload["uri"] as string);
                const preview = message.payload["preview"] !== false;
                await vscode.window.showTextDocument(uri, { preview, preserveFocus: false });
                break;
            }
            case "toggleRunning": {
                const { object_id, prim_id, item_id, running } = message.payload as {
                    object_id: string; prim_id: string; item_id: string; running: boolean;
                };
                const client = this.getWebSocket();
                if (!client) { break; }
                try {
                    const result = await client.setScriptRunning({ prim_id, item_id, running });
                    if (result.success) {
                        this._service.setScriptRunningState(object_id, prim_id, item_id, running);
                    }
                } catch {
                    // Viewer will report error via its own channel
                }
                break;
            }
            case "restartScript": {
                const { object_id, prim_id, item_id } = message.payload as {
                    object_id: string; prim_id: string; item_id: string;
                };
                const client = this.getWebSocket();
                if (!client) { break; }
                try {
                    await client.resetScript({ prim_id, item_id });
                    this._service.setScriptRunningState(object_id, prim_id, item_id, true);
                } catch {
                    // Viewer will report error via its own channel
                }
                break;
            }
            case "unpublishObject": {
                const { object_id } = message.payload as { object_id: string };
                this._service.handleUnpublish({ object_id });
                break;
            }
            case "renameItem": {
                const { prim_id, item_id, newName } = message.payload as {
                    object_id: string; prim_id: string; item_id: string; newName: string;
                };
                const client = this.getWebSocket();
                if (!client) { break; }
                try {
                    const result = await client.modifyObjectItem({ prim_id, item_id, name: newName });
                    if (!result.success) {
                        vscode.window.showErrorMessage(`Failed to rename: ${result.message}`);
                    }
                } catch (err) {
                    vscode.window.showErrorMessage(`Failed to rename item: ${err}`);
                }
                break;
            }
            case "renameObject": {
                const { prim_id, newName: newObjName } = message.payload as {
                    object_id: string; prim_id: string; newName: string;
                };
                const client = this.getWebSocket();
                if (!client) { break; }
                try {
                    const result = await client.modifyObject({ prim_id, name: newObjName });
                    if (!result.success) {
                        vscode.window.showErrorMessage(`Failed to rename: ${result.message}`);
                    }
                } catch (err) {
                    vscode.window.showErrorMessage(`Failed to rename: ${err}`);
                }
                break;
            }
            case "deleteItem": {
                const { object_id, prim_id, item_id } = message.payload as {
                    object_id: string; prim_id: string; item_id: string;
                };
                const client = this.getWebSocket();
                if (!client) { break; }
                const item = this._service.getItem(object_id, prim_id, item_id);
                if (!item) { break; }
                const name = displayName(item);
                const confirm = await vscode.window.showWarningMessage(
                    `Delete "${name}" from object?`,
                    { modal: true },
                    "Delete"
                );
                if (confirm !== "Delete") { break; }
                try {
                    const result = await client.deleteObjectItem({ prim_id, item_id });
                    if (!result.success) {
                        vscode.window.showErrorMessage(`Failed to delete "${name}".`);
                    }
                } catch (err) {
                    vscode.window.showErrorMessage(`Error deleting "${name}": ${err}`);
                }
                break;
            }
            case "createItem": {
                const { object_id, prim_id, filename } = message.payload as {
                    object_id: string; prim_id: string; filename: string;
                };
                const client = this.getWebSocket();
                if (!client) { break; }
                const inventory = this._service.getInventory(object_id, prim_id) ?? [];
                const existingNames = new Set(inventory.map((i) => displayName(i).toLowerCase()));
                const trimmed = filename?.trim();
                if (!trimmed) { break; }
                if (existingNames.has(trimmed.toLowerCase())) {
                    vscode.window.showErrorMessage(`"${trimmed}" already exists in this prim`);
                    break;
                }
                const lower = trimmed.toLowerCase();
                let type: "script" | "notecard";
                let vm: "luau" | "lsl2" | undefined;
                let name: string;
                if (lower.endsWith(".luau")) {
                    type = "script"; vm = "luau"; name = trimmed.slice(0, -5);
                } else if (lower.endsWith(".lsl")) {
                    type = "script"; vm = "lsl2"; name = trimmed.slice(0, -4);
                } else {
                    type = "notecard"; name = trimmed;
                }
                try {
                    const result = await client.createObjectItem({ prim_id, name, type, vm });
                    this._service.addItem(object_id, prim_id, result);
                    vscode.window.showInformationMessage(`Created "${displayName(result)}".`);
                } catch (err) {
                    vscode.window.showErrorMessage(`Error creating "${trimmed}": ${err}`);
                }
                break;
            }
            case "connect":
                await vscode.commands.executeCommand("second-life-scripting.connectWebSocket");
                break;
            case "refresh":
                this._refresh();
                break;
            case "copyUuid":
                await vscode.env.clipboard.writeText(message.payload["uuid"] as string);
                vscode.window.showInformationMessage("UUID copied to clipboard");
                break;
            case "teleportToObject": {
                const { object_id } = message.payload as { object_id: string };
                this.getWebSocket()?.executeCommand({ command: "viewer.teleport", params: { object_id } });
                break;
            }
            case "zoomInOnObject": {
                const { object_id } = message.payload as { object_id: string };
                this.getWebSocket()?.executeCommand({ command: "viewer.camera.focus", params: { object_id } });
                break;
            }
        }
    }

    private _getHtmlContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "out", "webview", "explorer", "explorer.js")
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "out", "webview", "explorer", "explorer.css")
        );
        const iconUri = (name: string): vscode.Uri => webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, "icons", name)
        );
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet" />
    <style>
        :root {
            --icon-script-lsl:   url("${iconUri("Inv_Script.png")}");
            --icon-script-luau:  url("${iconUri("Inv_Script_Luau.png")}");
            --icon-notecard:     url("${iconUri("Inv_Notecard.png")}");
            --icon-object:       url("${iconUri("Inv_Object.png")}");
            --icon-object-multi: url("${iconUri("Inv_Object_Multi.png")}");
            --icon-no-mod:       url("${iconUri("no-mod.png")}");
            --icon-no-copy:      url("${iconUri("no-copy.png")}");
            --icon-no-trans:     url("${iconUri("no-trans.png")}");
        }
    </style>
    <title>Second Life Objects</title>
</head>
<body>
    <div id="header">
        <span id="connection-status"></span>
        <div id="header-actions">
            <button id="btn-refresh" title="Refresh">&#8635;</button>
        </div>
    </div>
    <div id="filter-container">
        <input type="text" id="filter-input" placeholder="Filter..." />
    </div>
    <div id="tree-container"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    dispose(): void {
        for (const d of this._disposables) {
            d.dispose();
        }
        this._disposables.length = 0;
    }
}
