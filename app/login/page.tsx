import { Panel } from "@/components/primitives/panel";
import { DiscordLoginButton } from "@/features/auth/discord-login-button";

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
  const rawNext = readParam(params.next);
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const error = readParam(params.error);

  return (
    <div className="mx-auto max-w-xl py-12">
      <Panel title="Login" subtitle="Sign in with Discord">
        <DiscordLoginButton next={next} />

        {error ? (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        ) : null}
      </Panel>
    </div>
  );
}
