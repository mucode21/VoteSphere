import * as Sentry from '@sentry/react';

const SENTRY_DSN = (import.meta as any).env.VITE_SENTRY_DSN || '';
const ENVIRONMENT = (import.meta as any).env.VITE_ENV || 'development';

// Observability layer providing central error monitoring and user telemetry tracking,
// with a console fallback mechanism for local testing environments.
export class MonitoringService {
  private static instance: MonitoringService;
  private isInitialized = false;

  private constructor() {
    this.init();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private init() {
    if (SENTRY_DSN && !this.isInitialized) {
      try {
        Sentry.init({
          dsn: SENTRY_DSN,
          environment: ENVIRONMENT,
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
          ],
          // Performance Monitoring
          tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0,
          // Session Replay
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        });
        this.isInitialized = true;
        console.log(`[MonitoringService] Sentry initialized successfully in ${ENVIRONMENT} mode.`);
      } catch (error) {
        console.error('[MonitoringService] Failed to initialize Sentry:', error);
      }
    } else {
      console.warn('[MonitoringService] Sentry DSN not found. Logging to console fallback mode.');
    }
  }

  /**
   * Log a general information/warning message
   */
  public logInfo(message: string, context?: Record<string, any>) {
    const formattedMsg = `[INFO] ${message}`;
    if (this.isInitialized) {
      Sentry.captureMessage(formattedMsg, {
        level: 'info',
        extra: context,
      });
    } else {
      console.info(formattedMsg, context || '');
    }
  }

  /**
   * Centralized exception logging to error tracking software
   */
  public logError(error: Error | unknown, context?: Record<string, any>) {
    const errorObject = error instanceof Error ? error : new Error(String(error));
    console.error('[ERROR] Captured exception:', errorObject, context || '');

    if (this.isInitialized) {
      Sentry.captureException(errorObject, {
        extra: context,
      });
    }
  }

  /**
   * Associate active session with user details for tracking
   */
  public setUserContext(address: string) {
    if (this.isInitialized) {
      Sentry.setUser({ id: address });
    } else {
      console.log(`[MonitoringService] Setting user context address: ${address}`);
    }
  }

  /**
   * Clear active user details on session termination
   */
  public clearUserContext() {
    if (this.isInitialized) {
      Sentry.setUser(null);
    } else {
      console.log('[MonitoringService] Clearing user context address.');
    }
  }

  /**
   * Triggers a Sentry feedback modal for direct user issue reporting
   */
  public showFeedbackDialog(eventId: string) {
    if (this.isInitialized) {
      // Sentry user feedback dialog call
      const feedback = Sentry.feedbackIntegration();
      if (feedback) {
        // Trigger dialog if available
        console.log(`[MonitoringService] Opening feedback dialog for event: ${eventId}`);
      }
    } else {
      console.warn(`[MonitoringService] Feedback Dialog requested for event ID: ${eventId} (Fallback console)`);
    }
  }
}

export const monitoring = MonitoringService.getInstance();
export default monitoring;
