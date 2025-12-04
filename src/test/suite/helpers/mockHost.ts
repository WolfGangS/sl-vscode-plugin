
import { ConfigKey, FullConfigInterface } from '../../../interfaces/configinterface';
import { normalizePath, HostInterface, NormalizedPath } from '../../../interfaces/hostinterface';
import { PreprocessorOptions } from '../../../shared/lexingpreprocessor';


/**
 * Mock configuration class for testing
 */
export class MockConfig implements FullConfigInterface {
    private configValues: Map<ConfigKey, any> = new Map();

    constructor(optionsOrMap?: PreprocessorOptions | Map<ConfigKey, any>) {
        if (optionsOrMap) {
            if (optionsOrMap instanceof Map) {
                this.configValues = new Map(optionsOrMap);
            } else {
                // Set individual config keys instead of PreprocessorOptions object
                this.configValues.set(ConfigKey.PreprocessorEnable, optionsOrMap.enable);
                this.configValues.set(ConfigKey.PreprocessorIncludePaths, optionsOrMap.includePaths ?? ['.']);
                this.configValues.set(ConfigKey.PreprocessorMaxIncludeDepth, optionsOrMap.maxIncludeDepth ?? 5);
            }
        }
    }

    isEnabled(): boolean {
        return true;
    }

    getConfig<T>(key: ConfigKey): T | undefined {
        return this.configValues.get(key) as T | undefined;
    }

    async setConfig<T>(key: ConfigKey, value: T, scope?: any): Promise<void> {
        this.configValues.set(key, value);
    }

    async getWorkspaceConfigPath(): Promise<NormalizedPath> {
        return normalizePath("");
    }

    async getGlobalConfigPath(): Promise<NormalizedPath> {
        return normalizePath("");
    }

    async getExtensionInstallPath(): Promise<NormalizedPath> {
        return normalizePath("");
    }

    getSessionValue<T>(key: ConfigKey): T | undefined {
        return undefined;
    }

    setSessionValue<T>(key: ConfigKey, value: T): void {
        // No-op for tests
    }

    useLocalConfig(): boolean {
        return false;
    }
}

/**
 * Helper to create default preprocessor options for testing
 */
export function createDefaultOptions(): PreprocessorOptions {
    return {
        enable: true,
        flags: {
            generateWarnings: true,
            generateDecls: true,
        },
        includePaths: ["."],
        maxIncludeDepth: 5,
    };
}

// Create a minimal mock host for testing URI conversions
export function createMockHost(options?: PreprocessorOptions): HostInterface {

    const preprocessorOptions = options || createDefaultOptions();
    return new class implements HostInterface {
        config: FullConfigInterface = new MockConfig(preprocessorOptions);

        async readFile(path: NormalizedPath): Promise<string | null> {
            return null;
        }
        async exists(path: NormalizedPath): Promise<boolean> {
            return false;
        }
        async resolveFile(
            filename: string,
            from: NormalizedPath,
            extensions?: string[],
            includePaths?: string[]
        ): Promise<NormalizedPath | null> {
            return null;
        }
        async writeFile(p: NormalizedPath, content: string | Uint8Array): Promise<boolean> {
            return false;
        }
        async readJSON<T = any>(p: NormalizedPath): Promise<T | null> {
            return null;
        }
        async readYAML<T = any>(p: NormalizedPath): Promise<T | null> {
            return null;
        }
        async readTOML<T = any>(p: NormalizedPath): Promise<T | null> {
            return null;
        }
        async writeJSON(p: NormalizedPath, data: any, pretty?: boolean): Promise<boolean> {
            return false;
        }
        async writeYAML(p: NormalizedPath, data: any): Promise<boolean> {
            return false;
        }
        async writeTOML(p: NormalizedPath, data: Record<string, any>): Promise<boolean> {
            return false;
        }
        fileNameToUri(fileName: NormalizedPath): string {
            // Strip path to only include directories/filename after "test" directory
            const testIndex = fileName.indexOf('test');
            const relativePath = testIndex !== -1 ? fileName.substring(testIndex) : fileName;
            // Normalize backslashes to forward slashes
            const normalizedPath = relativePath.replace(/\\/g, '/');
            return "unittest:///" + normalizedPath;
        }
        uriToFileName(uri: string): NormalizedPath {
            return normalizePath(uri.replace("unittest:///", ""));
        }
        existsInWorkspace(_p: NormalizedPath): Promise<NormalizedPath | null> {
            throw new Error('Method not implemented.');
        }

        readWorkspaceFile(_p: string): Promise<string | null> {
            throw new Error('Method not implemented.');
        }

        writeWorkspaceFile(_p: string, _content: string): Promise<boolean> {
            throw new Error('Method not implemented.');
        }

        runCommandInWorkspace(_cmd: string, _args: string[]): Promise<any> {
            throw new Error('Method not implemented.');
        }
    };
}