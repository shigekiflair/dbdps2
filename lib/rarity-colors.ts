// アドオンのレアリティ別カラー定義（DBD本家の配色に準拠）
// ultra_rare だけ他と質的に違う特別感を出すため、グラデーション+虹縁にしている

export type Rarity = "common" | "uncommon" | "rare" | "very_rare" | "ultra_rare" | "event";

export const RARITY_STYLE: Record<
  Rarity,
  { bg: string; border: string; text: string; label: string; labelText: string }
> = {
  common: { bg: "#3a3530", border: "#5a5248", text: "#e8e2d8", label: "common", labelText: "#c9c2b6" },
  uncommon: { bg: "#4a3f14", border: "#b8952a", text: "#f5e6b0", label: "uncommon", labelText: "#e8c65a" },
  rare: { bg: "#173a1f", border: "#3a9450", text: "#bdeec7", label: "rare", labelText: "#6fd487" },
  very_rare: { bg: "#341a42", border: "#8a3fb0", text: "#e6c3f7", label: "very rare", labelText: "#c983ec" },
  ultra_rare: {
    bg: "linear-gradient(135deg,#4a1030,#301a4a)",
    border: "#e05fb0",
    text: "#ffd4ee",
    label: "ultra rare",
    labelText: "#ff9ad9",
  },
  event: { bg: "#1a2f42", border: "#3f8fb0", text: "#c3e8f7", label: "event", labelText: "#83c9ec" },
};
