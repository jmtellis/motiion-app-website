import "./buyer-ui.css";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`buyer-skeleton ${className}`.trim()} aria-hidden />;
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-8">
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-12 w-20" />
        </div>
      </div>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-2xl" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectsSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading projects">
      <div className="space-y-3">
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-72 rounded-full" />
      <Skeleton className="h-[320px] w-full rounded-2xl" />
      <div className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading library">
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-12 w-full max-w-md rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading calendar">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}

export function TalentSkeleton() {
  return (
    <div className="h-full min-h-[60vh]" aria-busy="true" aria-label="Loading talent">
      <Skeleton className="h-full min-h-[60vh] rounded-none" />
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading project">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
