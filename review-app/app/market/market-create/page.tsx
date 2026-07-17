"use client";

import Link from "next/link";
import { Button, Card, CardSub, CardTitle, Explainer, ImagePicker } from "@/components/ui/index";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  return (
    <>

      <div className="pageheader">
        <div>
          <div className="crumbs">Markets / Create / <span className="text-accent-2">Step 2 · Basics</span></div>
          <div className="pagetitle">Create a new Market.</div>
          <div className="pagedesc">Four steps. Takes about 10 minutes. You can save &amp; continue anytime.</div>
        </div>
      </div>

      <div className="step-rail">
        <Link href="/market/market-create/connect" className="step done"><span className="num">✓</span>Connect</Link>
        <div className="step active"><span className="num">2</span>Basics</div>
        <Link href="/market/market-create-3" className="step"><span className="num">3</span>Configure</Link>
        <Link href="/market/market-create-5" className="step"><span className="num">4</span>Review</Link>
      </div>

      <div className="grid-2">
        <Card>
          <CardTitle>1 · Tell us about your team</CardTitle>
          <CardSub>This creates the top-level container for all your decisions. You can change these anytime.</CardSub>

          <div className="field">
            <label>Market name</label>
            <input placeholder="e.g. Acme, Loom Co-op, Inkwell Studio"/>
            <div className="hint">The name your team and members will recognize. This isn't visible publicly unless you want it to be.</div>
          </div>

          <div className="field">
            <label>One-line description</label>
            <input placeholder="e.g. Acme's team decision log"/>
            <div className="hint">A short line that explains what this Market is for.</div>
          </div>

          <div className="field">
            <label>Longer description (optional)</label>
            <textarea rows={3} placeholder="What decisions will this Market make? Who participates? What's the purpose?"></textarea>
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-[16px] items-start mt-[4px]">
            <div className="field">
              <label>Logo (optional)</label>
              <ImagePicker hint="Square works best (256×256 or larger)" />
            </div>
            <div className="field">
              <label>URL</label>
              <input defaultValue="kiduna.club/m/acme"/>
              <div className="hint">A short, memorable web address. Lowercase, no spaces.</div>
            </div>
          </div>
        </Card>

        <div>
          <Explainer>
            <h4>What is a Market?</h4>
            <p>A Market is the top-level container for everything: your treasury, your team members (we call them <b>Citizens</b>), the Objectives you organize decisions under, and all the proposals ever made.</p>
            <p>One team usually has one Market. Larger orgs might have several (one per business unit, for example).</p>
          </Explainer>
        </div>
      </div>

      <div className="flex gap-[8px] mt-[24px]">
        <Button className="cursor-pointer" onClick={() => router.push("/market/market-create/connect")}>← Back</Button>
        <Button data-alert="Draft saved (wireframe demo).">Save draft</Button>
        <Button variant="primary" className="cursor-pointer" onClick={() => router.push("/market/market-create-3")}>Continue →</Button>
      </div>
    </>
  );
}
