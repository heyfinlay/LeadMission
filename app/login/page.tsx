import { Panel } from "@/components/primitives/panel";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { Input } from "@/components/ui/input";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const readParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = readParam(params.next) || "/companies";
  const sent = readParam(params.sent);
  const error = readParam(params.error);
  const email = readParam(params.email);

  return (
    <div className="mx-auto max-w-xl py-12">
      <Panel title="Login" subtitle="Sign in with a magic link">
        <form action="/auth/login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Email</span>
            <Input type="email" name="email" placeholder="you@company.com" required />
          </label>

          <label className="hidden" aria-hidden>
            Keep empty
            <Input tabIndex={-1} autoComplete="off" type="text" name="company_website" />
          </label>

          <UnderlitButton type="submit">Send magic link</UnderlitButton>
        </form>

        {sent ? (
          <p className="mt-3 text-sm text-emerald-300">
            Magic link sent{email ? ` to ${email}` : ""}. Check your inbox.
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        ) : null}
      </Panel>
    </div>
  );
}
