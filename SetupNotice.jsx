export default function SetupNotice() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-bold">Connect Firebase to get started</h1>
      <p className="mt-3 text-muted">
        This app needs your Firebase project settings. Copy <code>.env.example</code> to <code>.env</code>, paste the
        four values from the Firebase console, then restart <code>npm run dev</code>.
      </p>
      <p className="mt-3 text-muted">The README walks through every step, including creating the first admin.</p>
    </main>
  );
}
