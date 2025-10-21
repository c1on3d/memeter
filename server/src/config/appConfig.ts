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
    dialect: 'postgres';
    logging: boolean;
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
    config.database = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'memeter',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true',
    };
  }

  return config;
}

