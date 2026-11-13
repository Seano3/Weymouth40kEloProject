import { loginAction } from "./actions";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <form
        action={loginAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-black/10 p-8 dark:border-white/10"
      >
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Admin Login
        </h1>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15 dark:bg-black"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Log in
        </button>
      </form>
    </div>
  );
}
