import ShortlistReviewClient from "./shortlist-review-client";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function ShortlistPage({ params }: PageProps) {
  const { token } = await params;
  return <ShortlistReviewClient token={token} />;
}
