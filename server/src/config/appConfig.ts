import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  publicBaseUrl: string;
  port: number;
  nodeEnv: string;
  features: {
    database: boolean;
    pumpPortal: boolean;
  };
  database?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    dialect: 'postgres' | 'sqlite';
    logging: boolean;
    // Google Cloud SQL specific options
    socketPath?: string; // Unix socket path for Cloud SQL
    ssl?: boolean | {
      ca?: string;
      key?: string;
      cert?: string;
      rejectUnauthorized?: boolean;
    };
  };
}

export function getConfig(): AppConfig {
  const config: AppConfig = {
    publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    features: {
      database: process.env.ENABLE_DATABASE === 'true',
      pumpPortal: process.env.ENABLE_PUMPPORTAL !== 'false', // enabled by default
    },
  };

  // Database configuration (optional)
  if (config.features.database) {
    const usePostgres = process.env.DB_DIALECT !== 'sqlite';
    
    if (usePostgres) {
      // Google Cloud SQL connection options
      const socketPath = process.env.DB_SOCKET_PATH; // e.g., /cloudsql/PROJECT:REGION:INSTANCE
      const useSSL = process.env.DB_USE_SSL === 'true';
      
      config.database = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'memeter',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        dialect: 'postgres',
        logging: process.env.DB_LOGGING === 'true',
        socketPath, // For Cloud SQL unix socket connection
        ssl: useSSL ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
          ca: process.env.DB_SSL_CA,
          key: process.env.DB_SSL_KEY,
          cert: process.env.DB_SSL_CERT,
        } : false,
      };
    } else {
      // SQLite configuration for development
      config.database = {
        host: '',
        port: 0,
        database: process.env.DB_NAME || './memeter.sqlite',
        username: '',
        password: '',
        dialect: 'sqlite',
        logging: process.env.DB_LOGGING === 'true',
      };
    }
  }

  return config;
}

