import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReviewScreen from "../review-screen";
import { findReviewPage, reviewPages } from "../review-data";

type Props = { params: Promise<{ slug: string[] }> };

export function generateStaticParams() {
  return reviewPages.map((page) => ({ slug: page.slug.split("/") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = findReviewPage(slug.join("/"));
  return { title: page ? `${page.title} · Screen Review` : "Screen Review" };
}

export default async function ReviewRoute({ params }: Props) {
  const { slug } = await params;
  const page = findReviewPage(slug.join("/"));
  if (!page) notFound();
  return <ReviewScreen page={page} />;
}
