export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-52 animate-pulse rounded-lg bg-black/8" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-2xl bg-black/6" />
        ))}
      </div>
    </div>
  );
}
