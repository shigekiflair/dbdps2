import { LoginButtons } from "@/components/login-buttons";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-16 text-center">
      <p className="mb-1 text-[11px] text-bone-muted">TRIAL FORGE</p>
      <h1 className="mb-8 text-lg font-medium text-bone">ログイン</h1>
      <LoginButtons />
    </main>
  );
}
