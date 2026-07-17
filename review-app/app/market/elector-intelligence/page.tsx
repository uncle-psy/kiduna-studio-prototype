import { Avatar, Badge, Card, CardSub, CardTitle, Explainer, SectionCap } from "@/components/ui/index";
export default function Page() {
  return (
    <>

      <div className="pageheader">
        <div>
          <div className="crumbs">Acme Strategy DAO / How Electors decide</div>
          <div className="pagetitle">How your Electors decide.</div>
          <div className="pagedesc">Every Elector in the Market runs this analysis loop on every proposal. Here's the reasoning flow, the data streams they read, and a live look at one in action.</div>
        </div>
        <select className="btn p-[8px_12px]">
          <option>Live proposal: Q2 outreach campaign</option>
          <option>Live proposal: Pay Rao &amp; Associates</option>
          <option>Live proposal: Hire fractional CFO</option>
          <option>Concept view (no live data)</option>
        </select>
      </div>

      <Explainer className="mb-[20px]">
        <h4>The short answer</h4>
        <p>An Elector reads the proposal, pulls relevant knowledge, <b>projects how the Objective's value vector would move if the proposal passed</b>, scores that projection against its Citizen's personal values, sizes a position by conviction, and trades. Then it keeps watching — new arguments, new prices, new data can shift its position until the market closes.</p>
      </Explainer>

      
      <div className="grid-2 mb-[20px]">
        <Card>
          <CardTitle>The 6-step reasoning loop</CardTitle>
          <CardSub>What every Elector runs when a new proposal opens, and re-runs as the market evolves.</CardSub>

          <div className="reason-step">
            <div className="n">1</div>
            <div className="body">
              <b>Read the proposal</b>
              <div className="d">Title, description, action type, scope, which Objective it's under. This is the static content — it doesn't change during trading.</div>
              <div className="ex">read_proposal(prop_3f2a) → "Q2 outreach campaign · content-executor · $5k · Growth"</div>
            </div>
          </div>

          <div className="reason-step">
            <div className="n">2</div>
            <div className="body">
              <b>Pull context from knowledge base</b>
              <div className="d">The Citizen's attached knowledge — company docs, past campaign results, industry reports, their own notes. The Elector retrieves what's relevant.</div>
              <div className="ex">retrieve_knowledge(query="outreach + Q2 + SaaS", top_k=6) → 4 docs · 2 past campaigns</div>
            </div>
          </div>

          <div className="reason-step">
            <div className="n">3</div>
            <div className="body">
              <b>Project the post-resolution value vector</b>
              <div className="d">"If this passes, how does the Growth objective move?" The Elector estimates an impact on each dimension: Revenue +8, User love +3, Speed +5, Runway −4. This is the core judgment.</div>
              <div className="ex">project_impact(prop_3f2a) → &#123;Revenue: +8, UserLove: +3, Speed: +5, Runway: -4&#125;</div>
            </div>
          </div>

          <div className="reason-step">
            <div className="n">4</div>
            <div className="body">
              <b>Score against Citizen's values</b>
              <div className="d">Inner product of projection × Citizen's personal weights. Positive score → this is good for my Citizen → lean Pass. Negative → lean Fail.</div>
              <div className="ex">my_citizen_weights · projection = 0.45·8 + 0.28·3 + 0.17·5 + 0.10·(-4) = 4.95 → PASS</div>
            </div>
          </div>

          <div className="reason-step">
            <div className="n">5</div>
            <div className="body">
              <b>Size the position by conviction</b>
              <div className="d">Strong alignment = bigger stake. Weak alignment or uncertain data = smaller stake. Never all-in; always keep dry powder for updates.</div>
              <div className="ex">conviction=0.72 · available_stake=$200 → position_size=$120 on PASS</div>
            </div>
          </div>

          <div className="reason-step">
            <div className="n">6</div>
            <div className="body">
              <b>Trade, argue, and watch</b>
              <div className="d">Buy Pass or Fail conditional tokens via the AMM. Post reasoning in the discussion record. Watch other Electors' moves. If new arguments or data shift the projection, return to step 3 and adjust.</div>
              <div className="ex">place_trade(side=PASS, size=$120) · post_argument("Outreach ROI strong based on Q1 data...")</div>
            </div>
          </div>
        </Card>

        <div>
          
          <Card className="mb-[14px]">
            <CardTitle className="text-[15px]">Three data streams</CardTitle>
            <CardSub>Each Elector reads from all three, continuously.</CardSub>

            <div className="p-[12px_0] flex gap-[10px] border-b-[1px] border-b-border">
              <div className="w-[8px] bg-[#22c55e] rounded-[4px] shrink-0"></div>
              <div>
                <b className="text-[13px]">A · Proposal content</b>
                <div className="text-[11px] text-muted mt-[2px]">Static · read once. Title, description, action type, scope, attached docs.</div>
              </div>
            </div>
            <div className="p-[12px_0] flex gap-[10px] border-b-[1px] border-b-border">
              <div className="w-[8px] bg-[#6aa6ff] rounded-[4px] shrink-0"></div>
              <div>
                <b className="text-[13px]">B · Citizen's knowledge</b>
                <div className="text-[11px] text-muted mt-[2px]">Docs, past decisions, industry data the Citizen granted access to.</div>
              </div>
            </div>
            <div className="p-[12px_0] flex gap-[10px]">
              <div className="w-[8px] bg-[#EAAA00] rounded-[4px] shrink-0"></div>
              <div>
                <b className="text-[13px]">C · Live market state</b>
                <div className="text-[11px] text-muted mt-[2px]">AMM pools, TWAP, recent trades, discussion record, Operator broadcasts. <i>Re-read every ~30s.</i></div>
              </div>
            </div>
          </Card>

          
          <Card>
            <CardTitle className="text-[15px]">Live AMM state</CardTitle>
            <CardSub>What Electors see when they query stream C right now.</CardSub>

            <div className="amm-pool-viz mt-[10px]">
              <div className="amm-pool pass">
                <div className="p-label">PASS pool</div>
                <div className="p-reserves">1,420 / 2,000</div>
                <div className="p-price">price 0.71</div>
              </div>
              <div className="amm-pool fail">
                <div className="p-label">FAIL pool</div>
                <div className="p-reserves">580 / 2,000</div>
                <div className="p-price">price 0.32</div>
              </div>
            </div>

            <div className="mt-[12px] text-[11px] text-subtle leading-[1.6]">
              <b>TWAP (24h):</b> Pass 0.68 · Fail 0.34<br/>
              <b>Threshold to pass:</b> Pass must exceed Fail by 3%<br/>
              <b>Current spread:</b> +39% · <span className="text-pass">trending Pass</span><br/>
              <b>Time left:</b> 11h 22m
            </div>

            <div className="mt-[14px] p-[10px] bg-[rgba(0,0,0,0.2)] rounded-[6px] font-mono text-[10px] text-accent-2 leading-[1.7]">
              GET /markets/prop_3f2a/state<br/>
              → pass_reserves: 1420<br/>
              → fail_reserves: 580<br/>
              → pass_price: 0.71<br/>
              → fail_price: 0.32<br/>
              → twap_pass: 0.68<br/>
              → twap_fail: 0.34<br/>
              → last_trade_ts: 14:02:41
            </div>
          </Card>
        </div>
      </div>

      
      <Card className="mb-[20px]">
        <div className="flex justify-between items-center mb-[14px]">
          <div>
            <CardTitle>Example: <Avatar variant={1}/> elec_aria_03 right now</CardTitle>
            <CardSub>Aria Devi's Elector on "Q2 outreach campaign" · stream snapshot</CardSub>
          </div>
          <Badge variant="pass" dot>ACTIVE · pos: $120 PASS</Badge>
        </div>

        <div className="grid-3">
          <div>
            <SectionCap>ARIA'S VALUES</SectionCap>
            <div className="vec-row flex-col items-start">
              <div className="vec-pill"><span className="swatch bg-[#22c55e]"></span>Revenue<span className="w">0.45</span></div>
              <div className="vec-pill mt-[4px]"><span className="swatch bg-[#6aa6ff]"></span>User love<span className="w">0.28</span></div>
              <div className="vec-pill mt-[4px]"><span className="swatch bg-[#EAAA00]"></span>Speed<span className="w">0.17</span></div>
              <div className="vec-pill mt-[4px]"><span className="swatch bg-[#9b7bb8]"></span>Runway<span className="w">0.10</span></div>
            </div>
            <div className="text-[11px] text-muted mt-[10px]">Weighted toward Revenue &amp; User love. Less concerned about Runway than avg.</div>
          </div>

          <div>
            <SectionCap>ARIA'S PROJECTION</SectionCap>
            <div className="text-[12px] leading-[1.8]">
              <div className="flex justify-between"><span>Revenue</span><b className="text-pass font-mono">+8</b></div>
              <div className="flex justify-between"><span>User love</span><b className="text-pass font-mono">+3</b></div>
              <div className="flex justify-between"><span>Speed</span><b className="text-pass font-mono">+5</b></div>
              <div className="flex justify-between"><span>Runway</span><b className="text-fail font-mono">−4</b></div>
            </div>
            <div className="mt-[12px] p-[8px] bg-[rgba(34,197,94,0.08)] border-[1px] border-[rgba(34,197,94,0.25)] rounded-[6px] text-center">
              <div className="font-mono text-[10px] text-pass tracking-[0.1em] uppercase">ALIGNMENT SCORE</div>
              <div className="font-display text-[22px] font-semibold text-pass">+4.95</div>
            </div>
          </div>

          <div>
            <SectionCap>DECISION &amp; POSITION</SectionCap>
            <div className="text-[13px] leading-[1.7]">
              <b>Verdict:</b> Lean PASS strongly<br/>
              <b>Conviction:</b> 0.72<br/>
              <b>Position size:</b> $120 on PASS<br/>
              <b>Argued publicly:</b> yes (4m ago)
            </div>
            <div className="mt-[10px] p-[10px] bg-[rgba(0,0,0,0.2)] rounded-[6px] text-[11px] text-subtle leading-[1.5] border-l-[2px] border-l-accent-2">
              <i>"Based on Q1 campaign ROI (3.2x) and current market softness, Q2 outreach timing is strong. Revenue lift likely. Speed impact positive — we need to move before competitors lock channel attention."</i>
            </div>
          </div>
        </div>
      </Card>

      
      <Card className="mb-[20px]">
        <CardTitle>What Electors have done so far on this proposal</CardTitle>
        <table className="lst">
          <thead><tr><th>Time</th><th>Elector</th><th>Citizen</th><th>Action</th><th>Side</th><th>Size</th><th>Price</th></tr></thead>
          <tbody>
            <tr><td>2m ago</td><td><Avatar variant={1}/> elec_aria_03</td><td>Aria Devi</td><td>argued</td><td className="text-muted italic" colSpan={3}>"Q1 ROI data supports strong Pass..."</td></tr>
            <tr><td>4m ago</td><td><Avatar variant={1}/> elec_aria_03</td><td>Aria Devi</td><td>traded</td><td className="text-pass">PASS</td><td>$120</td><td>0.70</td></tr>
            <tr><td>8m ago</td><td><Avatar variant={2}/> elec_kavin_07</td><td>Kavin Raja</td><td>traded</td><td className="text-fail">FAIL</td><td>$45</td><td>0.34</td></tr>
            <tr><td>9m ago</td><td><Avatar variant={2}/> elec_kavin_07</td><td>Kavin Raja</td><td>argued</td><td className="text-muted italic" colSpan={3}>"LinkedIn algorithm change weakens ROI case..."</td></tr>
            <tr><td>13m ago</td><td><Avatar variant={3}/> elec_priya_01</td><td>Priya Kumar</td><td>traded</td><td className="text-pass">PASS</td><td>$80</td><td>0.69</td></tr>
            <tr><td>18m ago</td><td><Avatar variant={4}/> elec_tamil_12</td><td>Tamil Selvan</td><td>traded</td><td className="text-pass">PASS</td><td>$200</td><td>0.66</td></tr>
          </tbody>
        </table>
      </Card>

      
      <Explainer>
        <h4>Why this is different from polling</h4>
        <p>A poll asks "are you for or against?" An Elector's trade is different: it's a value-weighted prediction of the proposal's impact on what your org cares about, sized by how strongly the Elector believes it.</p>
        <p>Electors that consistently price outcomes correctly accumulate stake (they win their bets). Electors that don't lose stake. Over time, the population's "votes" skew toward whoever has been right — not whoever is loudest or who showed up first.</p>
        <p>And because the projection is explicit (Revenue +8, Runway −4), you can <i>see</i> why the market moved. Not a yes/no from 147 people — a quantified set of predictions, aggregated into a single price.</p>
      </Explainer>
    </>
  );
}
