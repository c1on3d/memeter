import { DataTypes, Model, Sequelize } from 'sequelize';

// Token Model
export class Token extends Model {
  declare id: number;
  declare mint: string;
  declare name: string;
  declare symbol: string;
  declare decimals: number;
  declare uri?: string;
  declare description?: string;
  declare image?: string;
  declare creator?: string;
  declare marketCap?: number;
  declare marketCapSol?: number;
  declare volume24h?: number;
  declare price?: number;
  declare pool?: string;
  declare website?: string;
  declare twitter?: string;
  declare telegram?: string;
  declare discord?: string;
  declare youtube?: string;
  declare instagram?: string;
  declare reddit?: string;
  declare tiktok?: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

// Migration Model
export class Migration extends Model {
  declare id: number;
  declare tokenMint: string;
  declare tokenName: string;
  declare tokenSymbol: string;
  declare fromRaydium: boolean;
  declare toRaydium: boolean;
  declare marketCapAtMigration: number;
  declare volumeAtMigration: number;
  declare migrationTime: Date;
  declare createdAt: Date;
  declare updatedAt: Date;
}

export function defineModels(sequelize: Sequelize): void {
  // Define Token model
  Token.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      mint: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Token mint address',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      symbol: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      decimals: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 6,
      },
      uri: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      creator: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      marketCap: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
      },
      marketCapSol: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
      },
      volume24h: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(20, 12),
        allowNull: true,
      },
      pool: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      website: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      twitter: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      telegram: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      discord: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      youtube: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      instagram: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reddit: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tiktok: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'tokens',
      indexes: [
        {
          fields: ['mint'],
          unique: true,
        },
        {
          fields: ['createdAt'],
        },
        {
          fields: ['symbol'],
        },
      ],
    }
  );

  // Define Migration model
  Migration.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tokenMint: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Token mint address',
      },
      tokenName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      tokenSymbol: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      fromRaydium: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      toRaydium: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      marketCapAtMigration: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
      },
      volumeAtMigration: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
      },
      migrationTime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'migrations',
      indexes: [
        {
          fields: ['tokenMint'],
        },
        {
          fields: ['migrationTime'],
        },
      ],
    }
  );
}


