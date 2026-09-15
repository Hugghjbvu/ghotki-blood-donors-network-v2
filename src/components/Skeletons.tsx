import React from "react";

export function DonorCardSkeleton() {
  return (
    <div className="w-full relative overflow-hidden rounded-2xl glass-panel p-6 border border-white/40 shadow-sm animate-pulse flex flex-col justify-between h-48">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            {/* Name bar */}
            <div className="h-5 w-40 bg-rose-100 rounded-md mb-2" />
            {/* Father name bar */}
            <div className="h-4 w-28 bg-gray-100 rounded-md" />
          </div>
          {/* Blood group badge mock */}
          <div className="h-10 w-10 bg-rose-200 rounded-lg shrink-0" />
        </div>
        
        {/* Address and City placeholder */}
        <div className="space-y-2">
          <div className="h-3.5 w-3/4 bg-gray-100 rounded" />
          <div className="h-3.5 w-1/2 bg-gray-100 rounded" />
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
        {/* Status badge and date mockup */}
        <div className="h-5 w-20 bg-gray-100 rounded-full" />
        {/* Button mockup */}
        <div className="h-9 w-28 bg-rose-100 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <DonorCardSkeleton key={i} />
      ))}
    </div>
  );
}
