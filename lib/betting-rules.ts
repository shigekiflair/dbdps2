/**
 * DB・セッションに依存しない純粋なロジックだけを集めたファイル。
 * ポイント計算・的中判定はミスるとポイント(ユーザーの資産)に直結するため、
 * ここだけ切り出してユニットテストの対象にしている（tests/betting-rules.test.ts）。
 */

export type BettingMode = "win" | "exacta" | "trifecta";

const PICK_COUNT: Record<BettingMode, number> = { win: 1, exacta: 2, trifecta: 3 };
const POINTS: Record<BettingMode, number> = { win: 10, exacta: 30, trifecta: 50 };
const REASON: Record<BettingMode, "betting_win" | "betting_exacta" | "betting_trifecta"> = {
  win: "betting_win",
  exacta: "betting_exacta",
  trifecta: "betting_trifecta",
};

export function pickCountFor(mode: BettingMode): number {
  return PICK_COUNT[mode];
}

export function pointsFor(mode: BettingMode): number {
  return POINTS[mode];
}

export function reasonFor(mode: BettingMode) {
  return REASON[mode];
}

/**
 * 競馬と同じ「完全一致のみ的中」判定。長さ・順序ともに完全に一致していなければfalse。
 * 空配列同士など不正な入力は的中扱いにしない。
 */
export function isExactMatch(picks: string[], correctPicks: string[]): boolean {
  if (picks.length === 0 || correctPicks.length === 0) return false;
  if (picks.length !== correctPicks.length) return false;
  return picks.every((p, i) => p === correctPicks[i]);
}
