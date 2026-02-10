import Link from "next/link";
import { redirect } from "next/navigation";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { getUser } from "@/lib/supabase/auth";

export default async function LandingPage() {
  const user = await getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">TU Lead OS</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-100 sm:text-4xl">
        Command center for pipeline, tasks, and client delivery.
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-slate-300">
        Sign in with Discord to access the internal dashboard, manage company workflows, and monitor active execution queues.
      </p>
      <div className="mt-8">
        <Link href="/login">
          <UnderlitButton>Login</UnderlitButton>
        </Link>
      </div>
    </div>
  );
}
