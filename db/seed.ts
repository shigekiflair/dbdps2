import { db } from "./index";
import { tags, plans } from "./schema";
import { eq } from "drizzle-orm";

/**
 * 実行方法:
 *   npx tsx db/seed.ts
 *
 * 3つの企画タイプ（抽選型 / 連鎖型 / 進捗トラッキング型）で
 * poolConfig / inputFields / outputDisplay / progressConfig が
 * 実際に機能する形になっているかを検証するためのサンプル。
 */

async function main() {
  // --- タグ ---------------------------------------------------
  const insertedTags = await db
    .insert(tags)
    .values([
      { slug: "communication", label: "コミュニケーション", color: "#2B7A68" },
      { slug: "healing", label: "治療", color: "#1D9E75" },
      { slug: "chase", label: "チェイス", color: "#C4342F" },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`tags: ${insertedTags.length}件 投入`);

  // --- 企画1: 抽選型（コミュニケーション縛り） -----------------
  await db.insert(plans).values({
    slug: "communication-lock",
    title: "コミュニケーション縛り",
    description: "タグが「コミュニケーション」のパークだけでスロットを回す縛り企画（サバイバー専用）",
    type: "lottery",
    target: "survivor",
    poolConfig: {
      source: "perk",
      filterTags: ["communication"],
      excludeTags: [],
      count: 4,
      weighting: "equal",
    },
    inputFields: [],
    outputDisplay: {
      layout: "card_grid",
      shareable: true,
      ogpTemplate: "default",
    },
    stateModel: "stateless",
    isPublished: true,
    sortOrder: 1,
  }).onConflictDoUpdate({
    target: plans.slug,
    set: {
      target: "survivor",
      description: "タグが「コミュニケーション」のパークだけでスロットを回す縛り企画（サバイバー専用）",
      inputFields: [],
    },
  });

  // --- 企画2: 連鎖・ミッションチェーン型（ミッションチェインガチャ） ---
  await db.insert(plans).values({
    slug: "mission-chain-gacha",
    title: "ミッションチェインガチャ",
    description: "試合中に達成すべきミッションを3〜5個、順番に開示していく企画",
    type: "chain",
    target: "both",
    poolConfig: {
      source: "custom_text",
      filterTags: [],
      excludeTags: [],
      count: 4,
      weighting: "equal",
      // 連鎖型は custom_text プールとして事前定義されたミッション文言を持つ
      customPool: [
        "発電機を1台修理するまで隠れ続ける",
        "板を1回キラーに当てる",
        "窓枠を3回通過する",
        "味方を1回救助する",
      ],
    },
    inputFields: [
      {
        key: "difficulty",
        label: "難易度",
        type: "select",
        options: ["easy", "normal", "hard"],
      },
    ],
    outputDisplay: {
      layout: "checklist",
      shareable: true,
      ogpTemplate: "default",
    },
    stateModel: "session_persistent",
    isPublished: true,
    sortOrder: 2,
  }).onConflictDoNothing();

  // --- 企画3: 進捗トラッキング型（全キラー全滅まで終われない） ---
  await db.insert(plans).values({
    slug: "all-killers-mori-endurance",
    title: "全キラーで全滅を取るまで終われない",
    description: "全キラーキャラクターで1回ずつ全滅を達成するまで続く耐久企画",
    type: "tracking",
    target: "killer",
    poolConfig: {
      source: "killer",
      filterTags: [],
      excludeTags: [],
      count: null,
      weighting: "equal",
    },
    inputFields: [],
    outputDisplay: {
      layout: "checklist",
      shareable: true,
      ogpTemplate: "default",
    },
    stateModel: "cross_stream_persistent",
    progressConfig: {
      goal: "all_killers_cleared",
      resetCondition: "manual",
    },
    isPublished: true,
    sortOrder: 3,
  }).onConflictDoNothing();

  console.log("plans: 3件 投入完了");

  // --- 企画4: ロールプレイ型（性格ロールガチャ） -------------
  await db.insert(plans).values({
    slug: "personality-roleplay-gacha",
    title: "性格ロールガチャ",
    description: "その試合中に演じる性格をランダムに1つ引く企画。プレイスタイルではなく演技が変わる",
    type: "roleplay",
    target: "both",
    poolConfig: {
      source: "custom_text",
      customPool: ["臆病者", "自信家", "復讐鬼", "優しい看護師", "初心者のフリ", "イライラMAX"],
    },
    inputFields: [],
    outputDisplay: { layout: "card_grid", shareable: false, ogpTemplate: "default" },
    stateModel: "stateless",
    isPublished: true,
    sortOrder: 4,
  }).onConflictDoNothing();

  // --- 企画5: データ蓄積型（世界記録チャレンジ） ---------------
  await db.insert(plans).values({
    slug: "world-record-challenge",
    title: "世界記録チャレンジ",
    description: "最速救助/最長チェイスなどのカテゴリごとに自己ベストを記録し続ける企画",
    type: "data_accumulation",
    target: "both",
    poolConfig: {
      source: "custom_text",
      customPool: ["最速救助", "最長チェイス", "最速全滅", "最速通電"],
    },
    inputFields: [],
    outputDisplay: { layout: "ranking", shareable: false, ogpTemplate: "default" },
    stateModel: "cross_stream_persistent",
    isPublished: true,
    sortOrder: 5,
  }).onConflictDoNothing();

  console.log("plans: 追加2件 投入完了");

  // --- 旧4企画は「ランダムセレクト」に統合したため非公開化 --------
  // (削除するとplan_results/plan_progressのFK先が無くなるためisPublished falseに留める)
  for (const oldSlug of [
    "random-survivor",
    "random-survivor-perks",
    "random-killer",
    "random-killer-perks",
  ]) {
    await db.update(plans).set({ isPublished: false }).where(eq(plans.slug, oldSlug));
  }

  // --- 企画6: ランダムセレクト（ロール+人数選択、キャラ+パーク一括） --
  await db.insert(plans).values({
    slug: "random-select",
    title: "ランダムセレクト",
    description: "サバイバー/キラーと人数を選び、キャラクター+パーク4つのセットを一括で抽選する",
    type: "lottery",
    target: "both",
    poolConfig: { source: "character_build" },
    inputFields: [
      { key: "role", label: "対象", type: "select", options: ["survivor", "killer"] },
      { key: "count", label: "人数", type: "select", options: ["1", "2", "3", "4"] },
    ],
    outputDisplay: { layout: "card_grid", shareable: true, ogpTemplate: "default" },
    stateModel: "stateless",
    isPublished: true,
    sortOrder: -4,
  }).onConflictDoUpdate({
    target: plans.slug,
    set: {
      title: "ランダムセレクト",
      description: "サバイバー/キラーと人数を選び、キャラクター+パーク4つのセットを一括で抽選する",
      target: "both",
      poolConfig: { source: "character_build" },
      inputFields: [
        { key: "role", label: "対象", type: "select", options: ["survivor", "killer"] },
        { key: "count", label: "人数", type: "select", options: ["1", "2", "3", "4"] },
      ],
      sortOrder: -4,
    },
  });

  console.log("plans: ランダムセレクト 投入完了");

  // --- 企画10: 全パーク制覇チャレンジ（サバイバー） -------------
  await db.insert(plans).values({
    slug: "all-survivor-perks-challenge",
    title: "全パーク制覇チャレンジ（サバイバー）",
    description: "サバイバーの全パークを1回ずつ使うまで終われない耐久企画",
    type: "tracking",
    target: "survivor",
    poolConfig: { source: "perk", role: "survivor" },
    inputFields: [],
    outputDisplay: { layout: "checklist", shareable: true, ogpTemplate: "default" },
    stateModel: "cross_stream_persistent",
    progressConfig: { goal: "all_perks_cleared", resetCondition: "manual" },
    isPublished: true,
    sortOrder: 6,
  }).onConflictDoUpdate({
    target: plans.slug,
    set: {
      title: "全パーク制覇チャレンジ（サバイバー）",
      description: "サバイバーの全パークを1回ずつ使うまで終われない耐久企画",
      poolConfig: { source: "perk", role: "survivor" },
      sortOrder: 6,
    },
  });

  // --- 企画11: 全パーク制覇チャレンジ（キラー） -----------------
  await db.insert(plans).values({
    slug: "all-killer-perks-challenge",
    title: "全パーク制覇チャレンジ（キラー）",
    description: "キラーの全パークを1回ずつ使うまで終われない耐久企画",
    type: "tracking",
    target: "killer",
    poolConfig: { source: "perk", role: "killer" },
    inputFields: [],
    outputDisplay: { layout: "checklist", shareable: true, ogpTemplate: "default" },
    stateModel: "cross_stream_persistent",
    progressConfig: { goal: "all_perks_cleared", resetCondition: "manual" },
    isPublished: true,
    sortOrder: 7,
  }).onConflictDoUpdate({
    target: plans.slug,
    set: {
      title: "全パーク制覇チャレンジ（キラー）",
      description: "キラーの全パークを1回ずつ使うまで終われない耐久企画",
      poolConfig: { source: "perk", role: "killer" },
      sortOrder: 7,
    },
  });

  // --- 企画12: 全キラー使用チャレンジ（全滅不要の軽量版） --------
  await db.insert(plans).values({
    slug: "all-killers-used-challenge",
    title: "全キラー使用チャレンジ",
    description: "全キラーキャラクターを1回ずつ使うまで終われない企画（全滅は不要、使用するだけでOK）",
    type: "tracking",
    target: "killer",
    poolConfig: { source: "killer" },
    inputFields: [],
    outputDisplay: { layout: "checklist", shareable: true, ogpTemplate: "default" },
    stateModel: "cross_stream_persistent",
    progressConfig: { goal: "all_killers_used", resetCondition: "manual" },
    isPublished: true,
    sortOrder: 8,
  }).onConflictDoUpdate({
    target: plans.slug,
    set: {
      title: "全キラー使用チャレンジ",
      description: "全キラーキャラクターを1回ずつ使うまで終われない企画（全滅は不要、使用するだけでOK）",
      poolConfig: { source: "killer" },
      sortOrder: 8,
    },
  });

  console.log("plans: 全制覇系3件 投入完了");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
