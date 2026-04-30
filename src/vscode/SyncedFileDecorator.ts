import {
    FileDecorationProvider,
    Uri,
    FileDecoration,
    EventEmitter,
    ProviderResult,
    CancellationToken,
    ThemeColor
} from "vscode";

import { SynchService } from "../synchservice";

export class SyncedFileDecorator implements FileDecorationProvider {
    private syncService: SynchService;
    private _onDidChangeFileDecorations = new EventEmitter<Uri | Uri[] | undefined>();
    readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

    constructor(syncService:SynchService) {
        this.syncService = syncService;
    }

    provideFileDecoration(uri: Uri, _token: CancellationToken): ProviderResult<FileDecoration> {
        if(this.syncService.findSyncByMasterFilePath(uri.fsPath)) {
            return {
                badge: '🔗',
                tooltip: 'Synchronized with secondlife viewer',
                color: new ThemeColor('secondlife.syncedfile'),
            };
        }
    }

    public refresh(uri?: Uri | Uri[]) : void {
        this._onDidChangeFileDecorations.fire(uri);
    }
}
