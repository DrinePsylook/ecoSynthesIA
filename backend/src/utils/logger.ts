import pino, { Logger, DestinationStream } from 'pino';
import pinoPretty from 'pino-pretty';
import fs from 'fs';
import path from 'path';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

const LOG_DIR = path.resolve(process.cwd(), 'logs');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * In development: pretty console output
 * In production: JSON to files + console
 * 
 * We use pino.multistream to write to multiple destinations
 */

// Define log file paths
const APP_LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

// Create write streams for files
const appLogStream = fs.createWriteStream(APP_LOG_FILE, { flags: 'a' });
const errorLogStream = fs.createWriteStream(ERROR_LOG_FILE, { flags: 'a' });

let logger: Logger;

if (IS_PRODUCTION) {
    // Production: JSON format, write to files and console
    const streams: { level: string; stream: DestinationStream | NodeJS.WriteStream }[] = [
      { level: 'info', stream: appLogStream },      // All logs to app.log
      { level: 'error', stream: errorLogStream },   // Errors to error.log
      { level: 'info', stream: process.stdout },    // Also to console for Docker
    ];

    logger = pino(
        {
            level: LOG_LEVEL,
            base: {
                pid: process.pid,
                env: NODE_ENV,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream(streams),
    );
} else {
    // Development: pretty console output without worker threads (ts-node compatible)
    const prettyStream = pinoPretty({
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
    });

    logger = pino(
        { level: LOG_LEVEL },
        pino.multistream([
            { stream: prettyStream },           // Pretty console output
            { stream: appLogStream },           // Also write to file
            { level: 'error', stream: errorLogStream },  // Errors to error.log
        ])
    );
}

export default logger;

  /**
   * Create a child logger with additional context
   * Useful for adding request ID, user ID, etc.
   * 
   * @example
   * const reqLogger = createChildLogger({ requestId: 'abc-123', userId: 42 });
   * reqLogger.info('Processing request');
   */
  export const createChildLogger = (bindings: Record<string, unknown>): Logger => {
    return logger.child(bindings);
  };

  /**
 * Log levels available:
 * - logger.fatal() : System is unusable
 * - logger.error() : Error conditions
 * - logger.warn()  : Warning conditions
 * - logger.info()  : Informational messages
 * - logger.debug() : Debug-level messages
 * - logger.trace() : Most detailed logging
 */