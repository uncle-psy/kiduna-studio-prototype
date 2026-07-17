import type { Metadata } from "next";
import ReviewIndex from "./review-index";

export const metadata: Metadata = {
  title: "Screen Review · Kiduna",
  description: "Browse the isolated Kiduna screen review library.",
};

export default function ReviewHome() {
  return <ReviewIndex />;
}
