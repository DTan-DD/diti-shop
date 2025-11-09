"use client";
// có sửa chữa component nây
import { Progress } from "@/components/ui/progress";
import Rating from "./rating";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { ChevronDownIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function RatingDistributionSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[50px_1fr_30px] gap-2 items-center">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

type RatingSummaryProps = {
  asPopover?: boolean;
  avgRating: number;
  numReviews: number;
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
};

type RatingDistributionProps = {
  avgRating: number;
  numReviews: number;
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
  t: ReturnType<typeof useTranslations>;
};

// ✅ Đưa component nhỏ này ra ngoài để React không báo lỗi
function RatingDistribution({ avgRating, numReviews, ratingDistribution, t }: RatingDistributionProps) {
  const ratingPercentageDistribution = ratingDistribution.map((x) => ({
    ...x,
    percentage: Math.round((x.count / numReviews) * 100),
  }));

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 cursor-help">
        <Rating rating={avgRating} />
        <span className="text-lg font-semibold">
          {t("Product.avgRating out of 5", {
            avgRating: avgRating.toFixed(1),
          })}
        </span>
      </div>
      <div className="text-lg ">{t("Product.numReviews ratings", { numReviews })}</div>

      <div className="space-y-3">
        {ratingPercentageDistribution
          .sort((a, b) => b.rating - a.rating)
          .map(({ rating, percentage }) => (
            <div key={rating} className="grid grid-cols-[50px_1fr_30px] gap-2 items-center">
              <div className="text-sm">{t("Product.rating star", { rating })}</div>
              <Progress value={percentage} className="h-4" />
              <div className="text-sm text-right">{percentage}%</div>
            </div>
          ))}
      </div>
    </>
  );
}

export default function RatingSummary({ asPopover, avgRating = 0, numReviews = 0, ratingDistribution = [] }: RatingSummaryProps) {
  const t = useTranslations();

  return asPopover ? (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="px-2 [&_svg]:size-6 text-base">
            <span>{avgRating.toFixed(1)}</span>
            <Rating rating={avgRating} />
            <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <div className="flex flex-col gap-2">
            {!ratingDistribution.length ? <RatingDistributionSkeleton /> : <RatingDistribution avgRating={avgRating} numReviews={numReviews} ratingDistribution={ratingDistribution} t={t} />}
            <Separator />
            <Link className="highlight-link text-center" href="#reviews">
              {t("Product.See customer reviews")}
            </Link>
          </div>
        </PopoverContent>
      </Popover>
      <div>
        <Link href="#reviews" className="highlight-link">
          {t("Product.numReviews ratings", { numReviews })}
        </Link>
      </div>
    </div>
  ) : !ratingDistribution.length ? (
    <RatingDistributionSkeleton />
  ) : (
    <RatingDistribution avgRating={avgRating} numReviews={numReviews} ratingDistribution={ratingDistribution} t={t} />
  );
}
