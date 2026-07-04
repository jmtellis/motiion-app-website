export default function BuyerAppLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-white/10" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-2xl bg-white/6" />
        ))}
      </div>
    </div>
  );
}
