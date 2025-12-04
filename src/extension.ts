/**
 * @file extension.ts
 * Copyright (C) 2025, Linden Research, Inc.
 */
import * as vscode from "vscode";
import { SynchService } from "./synchservice";
import { LanguageService } from "./shared/languageservice";
import { ConfigService } from "./configservice";
import {
    VSCodeHost,
    getOutputChannel,
    logInfo,
    hasWorkspace,
    showErrorMessage
} from "./utils";
import { ConfigKey } from "./interfaces/configinterface";
import { registerCommands } from "./plugin/commands";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
    const configService = ConfigService.getInstance(context);
    const host = new VSCodeHost(context);
    // Initialize shared LSP services with injected host
    const languageService = LanguageService.getInstance(host);
    // Initialize the file sync functionality
    const synchService = SynchService.getInstance(context);

    // Register output channel for disposal
    context.subscriptions.push(getOutputChannel());

    if (!hasWorkspace()) {
        showErrorMessage("Second Life Scripting Extension: No workspace is opened.\nPlease open a folder in VSCode to enable full functionality.");
    }


    // Register commands
    registerCommands(context);

    configService.on(ConfigKey.Enabled, (configService) => {
        if(configService.isEnabled()) {
            synchService.activate();
            logInfo("Second Life Scripting Extension activated");
        } else {
            synchService.deactivate();
            logInfo("Second Life Scripting Extension deactivated");
        }
    });

    if(configService.isEnabled()) {
        synchService.activate();
        logInfo("Second Life Scripting Extension activated");
    }

    context.subscriptions.push(configService);
    context.subscriptions.push(languageService);
    context.subscriptions.push(synchService);
}

// This method is called when your extension is deactivated
export function deactivate(): void {
    const synchService = SynchService.getInstance();
    synchService.deactivate();
}
