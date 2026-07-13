import { auth, signOut } from "@/auth";

export async function UserNav() {
  const session = await auth();

  if (!session?.user) {
    return (
      <a href="/login" className="text-xs text-bone-muted">
        ログイン
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-bone">{session.user.name ?? session.user.email ?? "ログイン中"}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/plans" });
        }}
      >
        <button type="submit" className="text-bone-muted underline">
          ログアウト
        </button>
      </form>
    </div>
  );
}
