"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ConfirmOptions = {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // 削除等、取り消しにくい操作の場合は赤系のボタンにする
};

type ConfirmContextValue = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * window.confirm()の代わりに使う、サイトのデザインに合わせた確認ダイアログ。
 * ブラウザ標準のポップアップは見た目が浮いて信頼感を損ねるため(詐欺サイトのポップアップのように見える)、
 * 非技術者のユーザーにも安心感のある見た目で統一する。
 *
 * 使い方: const confirm = useConfirm(); const ok = await confirm("本当に削除しますか？");
 */
export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirmはConfirmProviderの内側でのみ使用できます");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmContextValue>((opts) => {
    const normalized = typeof opts === "string" ? { message: opts } : opts;
    setOptions(normalized);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function respond(result: boolean) {
    setOptions(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
          role="alertdialog"
          aria-modal="true"
          onClick={() => respond(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-[#2C2C2A] bg-ash2 p-5 shadow-xl"
          >
            <p className="mb-5 text-sm leading-relaxed text-bone">{options.message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => respond(false)}
                className="rounded-lg border border-[#2C2C2A] px-4 py-2 text-xs text-bone-muted"
              >
                {options.cancelLabel ?? "キャンセル"}
              </button>
              <button
                onClick={() => respond(true)}
                className={`rounded-lg px-4 py-2 text-xs font-medium ${
                  options.danger ? "bg-blood text-[#FCEBEB]" : "bg-fog-teal-dark text-[#9FE1CB]"
                }`}
              >
                {options.confirmLabel ?? "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
