import { pgTable, serial, varchar, integer, timestamp, uniqueIndex, jsonb, boolean } from "drizzle-orm/pg-core";

export const users = pgTable(
  "mcp_users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    email: varchar("email", { length: 190 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    resetToken: varchar("reset_token", { length: 64 }),
    resetExpiresAt: timestamp("reset_expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("mcp_users_email_unique").on(table.email),
  })
);

export const serviceProviders = pgTable(
  "mcp_service_providers",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 40 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    enabled: boolean("enabled").default(true),
    version: varchar("version", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    keyUnique: uniqueIndex("mcp_service_providers_key_unique").on(table.key),
  })
);

export const serviceConnections = pgTable(
  "mcp_service_connections",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    providerId: integer("provider_id").notNull().references(() => serviceProviders.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    configJson: jsonb("config_json").notNull(),
    secretJson: jsonb("secret_json").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    tokenLast4: varchar("token_last4", { length: 8 }),
    tokenCreatedAt: timestamp("token_created_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("mcp_service_connections_token_unique").on(table.tokenHash),
  })
);

export const mcpTokens = pgTable(
  "mcp_tokens",
  {
    id: serial("id").primaryKey(),
    connectionId: integer("connection_id").notNull().references(() => serviceConnections.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("mcp_tokens_token_unique").on(table.tokenHash),
  })
);

export const auditLogs = pgTable(
  "mcp_audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    connectionId: integer("connection_id").references(() => serviceConnections.id, { onDelete: "set null" }),
    action: varchar("action", { length: 60 }).notNull(),
    data: jsonb("data"),
    createdAt: timestamp("created_at").defaultNow(),
  }
);