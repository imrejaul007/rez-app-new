/**
 * Error Reporter Utility
 *
 * Centralized error reporting and logging system.
 * Captures, categorizes, and reports errors to monitoring services.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';
export type ErrorCategory = 'network' | 'validation' | 'authentication' | 'authorization' | 'storage' | 'upload' | 'parsing' | 'rendering' | 'unknown';

export interface ErrorContext {
  context?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface CapturedError {
  id: string;
  message: string;
  name: string;
  stack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  timestamp: number;
  fingerprint: string;
  platform: string;
  appVersion?: string;
  userId?: string;
  sessionId?: string;
  breadcrumbs: Breadcrumb[];
  handled: boolean;
}

export interface Breadcrumb {
  type: 'navigation' | 'user_action' | 'network' | 'state_change' | 'error';
  message: string;
  timestamp: number;
  data?: Record<string, any>;
  category?: string;
  level?: ErrorSeverity;
}

const STORAGE_KEYS = { ERRORS: '@errorReporter:errors', BREADCRUMBS: '@errorReporter:breadcrumbs' };
const MAX_BREADCRUMBS = 50;
const MAX_STORED_ERRORS = 100;

const isBrowser = typeof window !== 'undefined';

class ErrorReporter {
  private breadcrumbs: Breadcrumb[] = [];
  private errors: CapturedError[] = [];
  private userId: string = '';
  private sessionId: string = '';
  private appVersion: string = '1.0.0';
  private isEnabled: boolean = true;
  private isInitialized: boolean = false;

  private async initialize(): Promise<void> {
    if (!isBrowser || this.isInitialized) return;
    try {
      await this.loadBreadcrumbs();
      await this.loadErrors();
      this.isInitialized = true;
    } catch {}
  }

  public setUserId(userId: string): void { this.userId = userId; }
  public setSessionId(sessionId: string): void { this.sessionId = sessionId; }
  public setAppVersion(version: string): void { this.appVersion = version; }
  public setEnabled(enabled: boolean): void { this.isEnabled = enabled; }

  private ensureInitialized(): void {
    if (!this.isInitialized && isBrowser) this.initialize();
  }

  public captureError(error: Error, context?: ErrorContext, severity: ErrorSeverity = 'error'): void {
    if (!this.isEnabled) return;
    this.ensureInitialized();
    try {
      const capturedError: CapturedError = {
        id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        message: error.message || 'Unknown error',
        name: error.name || 'Error',
        stack: error.stack,
        severity,
        category: this.categorizeError(error),
        context: { ...context, userId: context?.userId || this.userId, sessionId: context?.sessionId || this.sessionId },
        timestamp: Date.now(),
        fingerprint: this.generateFingerprint(error),
        platform: Platform.OS,
        appVersion: this.appVersion,
        breadcrumbs: [...this.breadcrumbs],
        handled: true,
      };
      this.errors.push(capturedError);
      if (this.errors.length > MAX_STORED_ERRORS) this.errors = this.errors.slice(-MAX_STORED_ERRORS);
    } catch {}
  }

  private categorizeError(error: Error): ErrorCategory {
    const m = error.message.toLowerCase();
    if (m.includes('network') || m.includes('fetch') || m.includes('timeout')) return 'network';
    if (m.includes('auth') || m.includes('token')) return 'authentication';
    if (m.includes('storage') || m.includes('asyncstorage')) return 'storage';
    if (m.includes('parse') || m.includes('json')) return 'parsing';
    return 'unknown';
  }

  private generateFingerprint(error: Error): string {
    return `${error.name}|${error.message}`.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) & 0x7fffffff, 0).toString(36);
  }

  private async loadBreadcrumbs(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BREADCRUMBS);
      if (data) this.breadcrumbs = JSON.parse(data);
    } catch {}
  }

  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    if (!this.isEnabled) return;
    this.ensureInitialized();
    this.breadcrumbs.push({ ...breadcrumb, timestamp: Date.now() });
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) this.breadcrumbs = this.breadcrumbs.slice(-MAX_BREADCRUMBS);
    AsyncStorage.setItem(STORAGE_KEYS.BREADCRUMBS, JSON.stringify(this.breadcrumbs)).catch(() => {});
  }

  private async loadErrors(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ERRORS);
      if (data) this.errors = JSON.parse(data);
    } catch {}
  }

  public getErrors(): CapturedError[] { return [...this.errors]; }
  public async clearErrors(): Promise<void> { this.errors = []; await AsyncStorage.removeItem(STORAGE_KEYS.ERRORS); }
}

export const errorReporter = new ErrorReporter();
export default errorReporter;
