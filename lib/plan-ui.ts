const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  lottery: { label: "抽選型", className: "bg-blood-dark text-[#F5C4B3]" },
  roleplay: { label: "ロールプレイ型", className: "bg-[#4B1528] text-[#F4C0D1]" },
  chain: { label: "連鎖型", className: "bg-fog-teal-dark text-[#9FE1CB]" },
  tracking: { label: "進捗型", className: "bg-[#412402] text-[#FAC775]" },
  data_accumulation: { label: "データ蓄積型", className: "bg-[#042C53] text-[#B5D4F4]" },
  escalation: { label: "エスカレーション型", className: "bg-blood-dark text-[#F5C4B3]" },
  target_pick: { label: "ターゲット指定型", className: "bg-[#4B1528] text-[#F4C0D1]" },
  trigger_internal: { label: "トリガー型", className: "bg-fog-teal-dark text-[#9FE1CB]" },
  draft: { label: "ドラフト型", className: "bg-[#042C53] text-[#B5D4F4]" },
  betting: { label: "予想型", className: "bg-[#412402] text-[#FAC775]" },
};

export function planTypeBadge(type: string) {
  return TYPE_BADGES[type] ?? { label: type, className: "bg-ash2 text-bone-muted" };
}
