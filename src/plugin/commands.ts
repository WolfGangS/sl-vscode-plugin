import * as vscode from "vscode";
import { ConfigKey } from "../interfaces/configinterface";
import { configPrefix } from "../configservice";
import { logInfo, showOutputChannel, showStatusMessage } from "../utils";
import { SynchService } from "../synchservice";

export function registerCommands(context: vscode.ExtensionContext) : void {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "second-life-scripting.enable",
            commandEnable
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "second-life-scripting.connectWebSocket",
            commandConnectWebSocket
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "second-life-scripting.disconnectWebSocket",
            commandDisconnectWebSocket
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "second-life-scripting.showWebSocketClientStatus",
            commandShowWebSocketClientStatus
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "second-life-scripting.forceLanguageUpdate",
            commandForceLanguageUpdate
        )
    );
}

function commandEnable() : void {
    // TODO: Implement WebSocket connection logic
    vscode.workspace.getConfiguration(configPrefix).update(ConfigKey.Enabled, true);
}

function commandConnectWebSocket() : void {
    // TODO: Implement WebSocket connection logic
    vscode.window.showInformationMessage("Connect WebSocket command executed");
}

function commandDisconnectWebSocket() : void {
    // TODO: Implement WebSocket disconnection logic
    vscode.window.showInformationMessage("Disconnect WebSocket command executed");
}

function commandShowWebSocketClientStatus() : void {
    showOutputChannel();
    logInfo("WebSocket status requested");
    // TODO: Add actual status information
}

function commandForceLanguageUpdate() : void {
    vscode.window.showInformationMessage("Forcing Language Update");
    const sync = SynchService.getInstance();
    const promise = sync.forceLanguageUpdate();
    showStatusMessage("Forcing language update...", promise);
}


/*

async function processGitRequire(requirePath: string) : Promise<void> {
    if(!requirePath.startsWith("@git-")) {
        throw `Git require nor starting with 'git-'`;
    }
    requirePath = requirePath.substring(5);
    let parts = requirePath.split("@");
    if(parts.length < 2) {
        throw `Must include branch or version in git path e.g. '@main' or '@v1.0`;
    }
    const repo = parts.shift();
    parts = parts.join("@").split("/")
    const version = parts.shift();
    const remainder = parts.join("/");

    if(!repo || !version) {
        throw `Repo or version undefined`;
    }
    // git-github.com

    const host = repo.split("/")[0];
    const destination = path.join(".vscode","sl-vscode-plugin","external");
    const cloneDestination = normalizePath(path.join(destination,`${repo}@${version}`));
    const aliasDestination = path.join(destination,host);
    const alias = `git-${host}`;

    try {
        const exists = await this.host.existsInWorkspace(cloneDestination);
        const rcPath = ".luaurc";
        if(!exists) {
            const a = await this.host.runCommandInWorkspace("git",[
                "clone",
                `--branch`,
                `${version}`,
                `https://${repo}`,
                cloneDestination
            ]);
        }
        const luaurc : LuauRCFile = JSON.parse(await this.host.readWorkspaceFile(rcPath) ?? '{"aliases":{}}') ?? {aliases:{}};
        luaurc.aliases[alias] = aliasDestination;
        console.error(rcPath, luaurc);
        await this.host.writeWorkspaceFile(rcPath, JSON.stringify(luaurc,null,2));
    } catch (e) {
        console.error("COMMAND ERROR",e);
    }

    //const a = await runCmd("pwd")
}
*/
