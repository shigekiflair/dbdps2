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
import { relations, sql } from "drizzle-orm";

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
  "tier_list",            // ティア表（配信者が作成し公開する静的コンテンツ）
]);

// ユーザー作成企画の公開範囲。既存の運営キュレーション企画(createdByがnull)には適用されない。
export const planVisibilityEnum = pgEnum("plan_visibility", [
  "private",   // 自分だけ
  "unlisted",  // URLを知っている人だけ
  "public",    // 「みんなの企画」に掲載（Phase2で解禁）
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

export const bettingRoundStatusEnum = pgEnum("betting_round_status", [
  "open",      // 投票受付中
  "closed",    // 投票締切・結果確定待ち
  "resolved",  // 正解確定済み
]);

// 単勝(1つ的中)・2連単(1位2位を順番通り)・3連単(1位2位3位を順番通り)。競馬と同じく完全一致のみ的中扱い
export const bettingModeEnum = pgEnum("betting_mode", ["win", "exacta", "trifecta"]);

export const pointTransactionReasonEnum = pgEnum("point_transaction_reason", [
  "betting_win",
  "betting_exacta",
  "betting_trifecta",
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

  // ユーザー作成企画用。運営がCSV/シードで投入した既存企画はnullのまま(常に公開扱い)。
  // ユーザーが/plans/newから作成した企画はここに作成者のuserIdが入る。
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  // createdByがnullの企画では実質未使用(常に公開扱い)。ユーザー作成企画のみこの値で制御する
  visibility: planVisibilityEnum("visibility").default("public").notNull(),

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

// お気に入り企画（マイページ機能）。
// userIdはplan_progressと同じ考え方で、匿名Cookie ID/実ユーザーIDどちらも受け入れるためFKを張らない。
export const planFavorites = pgTable("plan_favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniquePerUserPlan: uniqueIndex("plan_favorites_user_plan_unique").on(t.planId, t.userId),
}));

/** ユーザー作成企画の通報。公開機能(Phase2)を作る前の最低限のモデレーション手段として先に用意しておく */
export const planReports = pgTable("plan_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id"), // 匿名Cookie or 実ユーザー。null許容(将来の運用都合で入れられないケースに備える)
  reason: text("reason").notNull(),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================================================
   予想・ベッティング型（視聴者オッズ予想戦／裁判ガチャ等）
   ========================================================= */

// 1つの「お題」。配信者が試合前後にquestion+options+modeで作成し、視聴者はresolveされるまで投票できる。
// 1企画(plan)に対して同時に有効なラウンドは基本1つの運用を想定（新しいラウンドを開始すれば前のラウンドは
// 過去ログとして残り続ける。getLatestRoundで最新の1件だけを「現在のお題」として扱う）。
export const bettingRounds = pgTable("betting_rounds", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  mode: bettingModeEnum("mode").default("win").notNull(),
  // [{ id: string, label: string }] の配列。idはキャラクターの場合characters.id、自由入力の場合はランダム文字列
  options: jsonb("options").notNull(),
  status: bettingRoundStatusEnum("status").default("open").notNull(),
  // 正解の並び。単勝は1件、2連単は2件、3連単は3件のoptionId配列(順序が意味を持つ)
  correctPicks: jsonb("correct_picks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at", { mode: "date" }),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
});

// 各視聴者(匿名Cookie or 実ユーザー)の1票。ラウンドがopenの間は投票し直し(上書き)できる。
// picksは順序を持つoptionId配列(単勝なら1件、2連単なら2件、3連単なら3件)
export const bettingVotes = pgTable("betting_votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  roundId: uuid("round_id").notNull().references(() => bettingRounds.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  picks: jsonb("picks").default(sql`'[]'::jsonb`).notNull(),
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  uniquePerUserRound: uniqueIndex("betting_votes_user_round_unique").on(t.roundId, t.userId),
}));

// サイト全体のポイント履歴。ベッティング以外の獲得経路にも今後拡張できるよう理由(reason)を持たせている。
// 合計値はここから都度SUMして算出する(累積カラムを別で持つと二重管理になるため)
export const pointTransactions = pgTable("point_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  amount: integer("amount").notNull(),
  reason: pointTransactionReasonEnum("reason").notNull(),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
  roundId: uuid("round_id").references(() => bettingRounds.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================================================
   認証（Auth.js / @auth/drizzle-adapter）
   ========================================================= */

export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // 配信者本人(サイトオーナー)かどうか。予想・ベッティング型のラウンド作成/正解確定など
  // 「配信者だけができる操作」を区別するために使う。初回ログイン後、DB側で手動でtrueに切り替える運用
  isAdmin: boolean("isAdmin").default(false).notNull(),
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

export const plansRelations = relations(plans, ({ one, many }) => ({
  results: many(planResults),
  progress: many(planProgress),
  favorites: many(planFavorites),
  creator: one(users, {
    fields: [plans.createdBy],
    references: [users.id],
  }),
}));

export const planFavoritesRelations = relations(planFavorites, ({ one }) => ({
  plan: one(plans, {
    fields: [planFavorites.planId],
    references: [plans.id],
  }),
}));

export const bettingRoundsRelations = relations(bettingRounds, ({ one, many }) => ({
  plan: one(plans, {
    fields: [bettingRounds.planId],
    references: [plans.id],
  }),
  votes: many(bettingVotes),
}));

export const bettingVotesRelations = relations(bettingVotes, ({ one }) => ({
  round: one(bettingRounds, {
    fields: [bettingVotes.roundId],
    references: [bettingRounds.id],
  }),
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
