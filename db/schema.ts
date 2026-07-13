import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* =========================================================
   Enums
   ========================================================= */

export const characterRoleEnum = pgEnum("character_role", [
  "killer",
  "survivor",
]);

export const planTypeEnum = pgEnum("plan_type", [
  "lottery",              // 抽選型
  "roleplay",             // ロールプレイ型
  "chain",                // 連鎖・ミッションチェーン型
  "tracking",             // 進捗トラッキング型
  "data_accumulation",    // データ蓄積・統計型
  "escalation",           // エスカレーション型
  "target_pick",          // ターゲット指定型
  "trigger_internal",     // イベントトリガー型（配信者内）
  "draft",                // ドラフト型
  "betting",              // 予想・ベッティング型
]);

export const planTargetEnum = pgEnum("plan_target", [
  "survivor",
  "killer",
  "both",
  "viewer",
]);

export const stateModelEnum = pgEnum("state_model", [
  "stateless",
  "session_persistent",
  "cross_stream_persistent",
]);

export const rarityEnum = pgEnum("rarity", [
  "common",
  "uncommon",
  "rare",
  "very_rare",
  "ultra_rare",
  "event",
]);

/* =========================================================
   エンティティプール系
   ========================================================= */

export const characters = pgTable("characters", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  role: characterRoleEnum("role").notNull(),
  iconUrl: text("icon_url"),
  chapter: text("chapter"), // 追加された章/DLC名
  releasedAt: timestamp("released_at", { mode: "date" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  slugUnique: uniqueIndex("characters_slug_unique").on(t.slug),
}));

export const perks = pgTable("perks", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  role: characterRoleEnum("role").notNull(),
  originCharacterId: uuid("origin_character_id").references(() => characters.id),
  iconUrl: text("icon_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  slugUnique: uniqueIndex("perks_slug_unique").on(t.slug),
}));

export const items = pgTable("items", {
  // サバイバーアイテムのカテゴリ（医療キット/工具箱/懐中電灯/鍵/地図 等）
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
}, (t) => ({
  slugUnique: uniqueIndex("items_slug_unique").on(t.slug),
}));

export const addons = pgTable("addons", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  rarity: rarityEnum("rarity").notNull(),
  iconUrl: text("icon_url"),
  // killerId と itemId は片方のみセットされる想定（アプリ側で担保）
  killerId: uuid("killer_id").references(() => characters.id),
  itemId: uuid("item_id").references(() => items.id),
}, (t) => ({
  slugUnique: uniqueIndex("addons_slug_unique").on(t.slug),
}));

export const offerings = pgTable("offerings", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  rarity: rarityEnum("rarity").notNull(),
  iconUrl: text("icon_url"),
  role: planTargetEnum("role").notNull(), // survivor / killer / both
}, (t) => ({
  slugUnique: uniqueIndex("offerings_slug_unique").on(t.slug),
}));

export const maps = pgTable("maps", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  realm: text("realm"),
  iconUrl: text("icon_url"),
}, (t) => ({
  slugUnique: uniqueIndex("maps_slug_unique").on(t.slug),
}));

/* =========================================================
   タグ（ポリモーフィック / エンティティ横断）
   ========================================================= */

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  label: text("label").notNull(),
  color: text("color"), // UI上のチップカラー(hex)
}, (t) => ({
  slugUnique: uniqueIndex("tags_slug_unique").on(t.slug),
}));

export const taggables = pgTable("taggables", {
  id: uuid("id").defaultRandom().primaryKey(),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  // "perk" | "killer" | "survivor" | "addon" | "offering" | "map" | "plan"
  taggableType: text("taggable_type").notNull(),
  taggableId: uuid("taggable_id").notNull(),
}, (t) => ({
  uniqueTag: uniqueIndex("taggables_unique").on(t.tagId, t.taggableType, t.taggableId),
}));

/* =========================================================
   企画定義（コア）
   ========================================================= */

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: planTypeEnum("type").notNull(),
  target: planTargetEnum("target").notNull(),

  // 抽選対象プールの定義
  // 例: { source: "perk", filterTags: ["communication"], excludeTags: [], count: 4, weighting: "equal", fixedSlots: [] }
  poolConfig: jsonb("pool_config"),

  // 配信者が設定する入力項目の定義
  // 例: [{ key: "category", label: "カテゴリ", type: "select", options: ["survivor","killer"] }]
  inputFields: jsonb("input_fields"),

  // 結果の表示方法
  // 例: { layout: "card_grid", shareable: true, ogpTemplate: "default" }
  outputDisplay: jsonb("output_display"),

  stateModel: stateModelEnum("state_model").default("stateless").notNull(),

  // 進捗トラッキング型/データ蓄積型のみ使用
  // 例: { goal: 20, resetCondition: "manual" }
  progressConfig: jsonb("progress_config"),

  isPublished: boolean("is_published").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  slugUnique: uniqueIndex("plans_slug_unique").on(t.slug),
}));

/* =========================================================
   実行結果 / 進捗（Phase2〜4で利用）
   ========================================================= */

export const planResults = pgTable("plan_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  userId: uuid("user_id"), // 匿名Cookie IDまたは実ユーザーID(users.id)。あえてFKは張らない(下記参照)
  shareCode: text("share_code"), // パーク交換チャレンジ等の共有コード
  resultPayload: jsonb("result_payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  shareCodeUnique: uniqueIndex("plan_results_share_code_unique").on(t.shareCode),
}));

export const planProgress = pgTable("plan_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(), // 匿名Cookie IDまたは実ユーザーID(users.id)。ログイン時にlib/migrate-anon.tsで引き継ぐためFKは張らない
  progressPayload: jsonb("progress_payload").notNull(), // チェックリスト状態・カウンター等
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniquePerUserPlan: uniqueIndex("plan_progress_user_plan_unique").on(t.planId, t.userId),
}));

/* =========================================================
   認証（Auth.js / @auth/drizzle-adapter）
   ========================================================= */

export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

/* =========================================================
   Relations（Drizzle Query API用）
   ========================================================= */

export const charactersRelations = relations(characters, ({ many }) => ({
  perks: many(perks),
  addons: many(addons),
}));

export const perksRelations = relations(perks, ({ one }) => ({
  originCharacter: one(characters, {
    fields: [perks.originCharacterId],
    references: [characters.id],
  }),
}));

export const addonsRelations = relations(addons, ({ one }) => ({
  killer: one(characters, {
    fields: [addons.killerId],
    references: [characters.id],
  }),
  item: one(items, {
    fields: [addons.itemId],
    references: [items.id],
  }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  results: many(planResults),
  progress: many(planProgress),
}));

export const planResultsRelations = relations(planResults, ({ one }) => ({
  plan: one(plans, {
    fields: [planResults.planId],
    references: [plans.id],
  }),
}));

export const planProgressRelations = relations(planProgress, ({ one }) => ({
  plan: one(plans, {
    fields: [planProgress.planId],
    references: [plans.id],
  }),
}));
