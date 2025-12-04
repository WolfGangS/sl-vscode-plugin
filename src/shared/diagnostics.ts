/**
 * @file diagnostics.ts
 * Diagnostic types and collection for preprocessor error reporting
 * Copyright (C) 2025, Linden Research, Inc.
 */

import { NormalizedPath } from "../interfaces/hostinterface";

//#region Diagnostic Types

/**
 * Diagnostic severity levels
 */
export enum DiagnosticSeverity {
    ERROR = 0,    // Prevents successful preprocessing
    WARNING = 1,  // Suspicious but processable
    INFO = 2,     // Informational messages
    HINT = 3      // Suggestions for improvement
}

/**
 * Related information for a diagnostic (e.g., where a macro was defined)
 */
export interface DiagnosticRelatedInfo {
    message: string;
    line: number;
    column: number;
    length: number;
    sourceFile: NormalizedPath;
}

/**
 * A preprocessor diagnostic (error, warning, info, or hint)
 */
export interface PreprocessorDiagnostic {
    severity: DiagnosticSeverity;
    message: string;
    location: DiagnosticLocation;
    code?: string;  // Optional error code (e.g., "PP001")
    relatedInfo?: DiagnosticRelatedInfo[];
}


export class PreprocessorDiagnosticException extends Error implements PreprocessorDiagnostic {
    severity: DiagnosticSeverity;
    location: DiagnosticLocation;
    code?: string | undefined;
    relatedInfo?: DiagnosticRelatedInfo[] | undefined;

    static error(
        message: string,
        location: DiagnosticLocation,
        code?: string,
        relatedInfo?: DiagnosticRelatedInfo[]
    ) : PreprocessorDiagnostic {
        return new PreprocessorDiagnosticException(
            message,
            DiagnosticSeverity.ERROR,
            location,
            code,
            relatedInfo
        );
    }

    constructor(
        message: string,
        severity: DiagnosticSeverity,
        location: DiagnosticLocation,
        code?: string,
        relatedInfo?: DiagnosticRelatedInfo[],
    ){
        super(message)
        this.severity = severity;
        this.location = location;
        this.code = code;
        this.relatedInfo = relatedInfo;
    }
}

export class PreprocessorIncludeException extends PreprocessorDiagnosticException {
    resolvedPath: NormalizedPath | null = null;
    setPath(path:NormalizedPath|null):PreprocessorIncludeException {
        this.resolvedPath = path;
        return this;
    }

    static error(
        message: string,
        location: DiagnosticLocation,
        code?: string,
        relatedInfo?: DiagnosticRelatedInfo[]
    ) : PreprocessorIncludeException {
        return new PreprocessorIncludeException(
            message,
            DiagnosticSeverity.ERROR,
            location,
            code,
            relatedInfo
        );
    }
}

export class PreprocessorRequireException extends PreprocessorDiagnosticException {
    require: string|null = null;
    alias: string|null = null;


    static error(
        message: string,
        location: DiagnosticLocation,
        code?: string,
        relatedInfo?: DiagnosticRelatedInfo[]
    ) : PreprocessorRequireException {
        return new PreprocessorRequireException(
            message,
            DiagnosticSeverity.ERROR,
            location,
            code,
            relatedInfo
        );
    }

    setRequire(require:string|null, alias:string|null) : PreprocessorRequireException {
        this.require = require;
        this.alias = alias;
        return this;
    }
}

/**
 * Location information for creating diagnostics
 */
export interface DiagnosticLocation {
    line: number;
    column: number;
    length: number;
    sourceFile: NormalizedPath;
}

//#endregion

//#region Diagnostic Collector

/**
 * Collects diagnostics during preprocessing
 */
export class DiagnosticCollector {
    private diagnostics: PreprocessorDiagnostic[] = [];

    /**
     * Add a diagnostic directly
     */
    add(diagnostic: PreprocessorDiagnostic): void {
        this.diagnostics.push(diagnostic);
    }

    addException(exception: PreprocessorDiagnosticException): void {
        this.add(exception);
    }

    /**
     * Add an error diagnostic
     */
    addError(message: string, location: DiagnosticLocation, code?: string, relatedInfo?: DiagnosticRelatedInfo[]): void {
        this.diagnostics.push({
            severity: DiagnosticSeverity.ERROR,
            message,
            location,
            code,
            relatedInfo,
        });
    }

    /**
     * Add a warning diagnostic
     */
    addWarning(message: string, location: DiagnosticLocation, code?: string, relatedInfo?: DiagnosticRelatedInfo[]): void {
        this.diagnostics.push({
            severity: DiagnosticSeverity.WARNING,
            message,
            location,
            code,
            relatedInfo,
        });
    }

    /**
     * Add an info diagnostic
     */
    addInfo(message: string, location: DiagnosticLocation, code?: string, relatedInfo?: DiagnosticRelatedInfo[]): void {
        this.diagnostics.push({
            severity: DiagnosticSeverity.INFO,
            message,
            location,
            code,
            relatedInfo,
        });
    }

    /**
     * Add a hint diagnostic
     */
    addHint(message: string, location: DiagnosticLocation, code?: string, relatedInfo?: DiagnosticRelatedInfo[]): void {
        this.diagnostics.push({
            severity: DiagnosticSeverity.HINT,
            message,
            location,
            code,
            relatedInfo,
        });
    }

    /**
     * Check if any errors have been collected
     */
    hasErrors(): boolean {
        return this.diagnostics.some(d => d.severity === DiagnosticSeverity.ERROR);
    }

    /**
     * Get all error diagnostics
     */
    getErrors(): PreprocessorDiagnostic[] {
        return this.diagnostics.filter(d => d.severity === DiagnosticSeverity.ERROR);
    }

    /**
     * Get all warning diagnostics
     */
    getWarnings(): PreprocessorDiagnostic[] {
        return this.diagnostics.filter(d => d.severity === DiagnosticSeverity.WARNING);
    }

    /**
     * Get all diagnostics
     */
    getAll(): PreprocessorDiagnostic[] {
        return [...this.diagnostics];
    }

    /**
     * Get count of diagnostics by severity
     */
    getCount(severity?: DiagnosticSeverity): number {
        if (severity === undefined) {
            return this.diagnostics.length;
        }
        return this.diagnostics.filter(d => d.severity === severity).length;
    }

    /**
     * Clear all diagnostics
     */
    clear(): void {
        this.diagnostics = [];
    }

    /**
     * Merge diagnostics from another collector
     */
    merge(other: DiagnosticCollector): void {
        this.diagnostics.push(...other.diagnostics);
    }
}

//#endregion

//#region Error Codes

/**
 * Standard error codes for preprocessor diagnostics
 */
export const ErrorCodes = {
    // Lexer errors (LEX prefix)
    UNTERMINATED_BLOCK_COMMENT: "LEX001",
    UNTERMINATED_STRING: "LEX002",
    INVALID_ESCAPE_SEQUENCE: "LEX003",
    INVALID_NUMBER_LITERAL: "LEX004",
    INVALID_CHARACTER: "LEX005",
    UNTERMINATED_VECTOR_LITERAL: "LEX006",

    // Parser errors (PAR prefix)
    MALFORMED_DIRECTIVE: "PAR001",
    MISSING_DIRECTIVE_ARGUMENT: "PAR002",
    INVALID_MACRO_DEFINITION: "PAR003",
    UNTERMINATED_CONDITIONAL: "PAR004",
    MISMATCHED_CONDITIONAL: "PAR005",
    INVALID_MACRO_INVOCATION: "PAR006",

    // Include errors (INC prefix)
    FILE_NOT_FOUND: "INC001",
    CIRCULAR_INCLUDE: "INC002",
    INCLUDE_DEPTH_EXCEEDED: "INC003",
    PATH_RESOLUTION_FAILED: "INC004",
    FILE_READ_ERROR: "INC005",
    INCLUDE_PATH_INVALID: "INC006",
    REQUIRE_INVALID: "INC007",
    REQUIRE_NOT_ALIASED: "INC008",

    // Macro errors (MAC prefix)
    UNDEFINED_MACRO: "MAC001",
    ARGUMENT_COUNT_MISMATCH: "MAC002",
    RECURSIVE_EXPANSION: "MAC003",
    INVALID_DEFINED_SYNTAX: "MAC004",

    // Conditional errors (COND prefix)
    INVALID_EXPRESSION: "COND001",
    TYPE_ERROR: "COND002",
    DIVISION_BY_ZERO: "COND003",
} as const;

//#endregion
