import Link from 'next/link'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import ButtonGhost from '@/components/landing/ui/ButtonGhost'

/* ── Types ── */
export interface DunaDetailProps {
  name: string
  coin: string
  subtitle: string
  badges: string[]
  lede: string
  stats: { num: string; label: string; small?: boolean }[]
  cards: { kicker: string; title: string; body: string }[]
  strip: { label: string; date: string }
  sidebar:
    | { type: 'live'; price: string; delta: string; deltaDir: 'up' | 'down'; rows: { label: string; value: string }[]; tradeCta: string; joinCta: string }
    | { type: 'forming'; description: string; rows: { label: string; value: string }[]; joinCta: string }
    | { type: 'raising'; coin: string; committed: string; goal: string; pct: number; rows: { label: string; value: string }[]; joinCta: string }
}

/* ── Reusable bits ── */
function DunaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 46, height: 46, color: 'var(--wv-gold, #EAAA00)', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>
      <path d="M3 17 9 7l4 6 3-4 5 8" />
      <path d="M3 20.5c1.5 0 1.5-1.3 3-1.3s1.5 1.3 3 1.3 1.5-1.3 3-1.3 1.5 1.3 3 1.3 1.5-1.3 3-1.3" />
    </svg>
  )
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize:'0.62rem',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,padding:'0.22rem 0.6rem',borderRadius:9999,border:'1px solid var(--border,rgba(255,255,255,0.12))',color:'var(--fg-soft,rgba(255,255,255,0.60))' }}>{children}</span>
}
function Stat({ num, label, small }: { num: string; label: string; small?: boolean }) {
  return (
    <div style={{ padding:'26px 24px',borderRight:'1px solid var(--border,rgba(255,255,255,0.12))' }}>
      <div style={{ fontFamily:'var(--font-display)',fontSize: small ? '1.5rem' : 'clamp(2rem,3.2vw,2.75rem)',color:'var(--fg,#fff)',lineHeight:1 }}>{num}</div>
      <div style={{ marginTop:'0.5rem',fontSize:'0.72rem',letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--fg-soft,rgba(255,255,255,0.60))',fontWeight:700 }}>{label}</div>
    </div>
  )
}
function PanelRow({ label, value }: { label: string; value: string }) {
  return <div style={{ display:'flex',justifyContent:'space-between',gap:10,fontSize:'0.9rem',color:'var(--fg-muted,#CDCDCD)',padding:'0.5rem 0',borderBottom:'1px solid var(--border,rgba(255,255,255,0.12))' }}><span>{label}</span><b style={{ color:'var(--fg,#fff)',fontWeight:700 }}>{value}</b></div>
}
function InfoCard({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div style={{ padding:'26px 28px',borderRadius:14,border:'1px solid var(--border,rgba(255,255,255,0.12))',background:'var(--surface,#0A0D33)' }}>
      <div style={{ fontSize:'0.7rem',letterSpacing:'0.16em',textTransform:'uppercase',fontWeight:700,color:'var(--accent,#EAAA00)',marginBottom:'0.6rem' }}>{kicker}</div>
      <h3 style={{ fontFamily:'var(--font-display)',fontWeight:400,fontSize:'1.5rem',margin:'0 0 0.6rem',color:'var(--fg,#fff)',lineHeight:1.1 }}>{title}</h3>
      <p style={{ color:'var(--fg-muted,#CDCDCD)',margin:0,fontSize:'0.96rem' }}>{body}</p>
    </div>
  )
}

/* ── Main ── */
export default function DunaDetailPage({ d }: { d: DunaDetailProps }) {
  const sb = d.sidebar
  return (
    <>
      <LandingHeader />
      <section style={{ paddingTop:30,paddingBottom:80 }}>
        <div className="w-full max-w-[1180px] mx-auto px-6">
          <Link href="/dunas" style={{ display:'inline-block',marginBottom:14,fontWeight:700,fontSize:'0.85rem',color:'var(--link,#03CCD9)' }}>&larr; All DUNAs</Link>
          <style>{`
            .dd-grid{display:grid;grid-template-columns:1.7fr 1fr;gap:28px;align-items:start}
            @media(max-width:860px){.dd-grid{grid-template-columns:1fr}.dd-panel{position:static!important}}
            .dd-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:linear-gradient(135deg,#100E59,#0A0D33);border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:14px;overflow:hidden}
            @media(max-width:900px){.dd-stats{grid-template-columns:repeat(2,1fr)}}
            @media(max-width:480px){.dd-stats{grid-template-columns:1fr}.dd-stats>div{border-right:0;border-bottom:1px solid var(--border,rgba(255,255,255,0.12))}}
            .dd-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
            @media(max-width:640px){.dd-cards{grid-template-columns:1fr}}
          `}</style>
          <div className="dd-grid">
            {/* Main */}
            <div>
              <div style={{ display:'flex',alignItems:'center',gap:20,marginBottom:4 }}>
                <div style={{ position:'relative',width:104,height:104,flex:'0 0 auto',borderRadius:14,border:'1px solid var(--border,rgba(255,255,255,0.12))',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'radial-gradient(circle at 50% 32%,var(--surface-elev,#100E59),var(--bg,#09073A) 70%)' }}>
                  <DunaIcon />
                  <span style={{ position:'absolute',right:8,bottom:8,height:28,padding:'0 10px',borderRadius:9999,display:'inline-flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:'0.7rem',color:'var(--on-accent,#09073A)',background:'var(--accent,#EAAA00)',border:'1px solid rgba(255,255,255,0.35)',boxShadow:'0 3px 10px rgba(0,0,0,0.35)' }}>{d.coin}</span>
                </div>
                <div>
                  <h1 style={{ fontFamily:'var(--font-display)',fontWeight:400,fontSize:'2.1rem',color:'var(--fg,#fff)',lineHeight:1.05,margin:0 }}>{d.name}</h1>
                  <p style={{ color:'var(--fg-muted,#CDCDCD)',fontSize:'0.95rem',margin:'0.25rem 0 0' }}>{d.subtitle}</p>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginTop:10 }}>{d.badges.map(b=><Chip key={b}>{b}</Chip>)}</div>
                </div>
              </div>
              <p style={{ fontSize:'clamp(1.05rem,1.5vw,1.25rem)',color:'var(--fg-muted,#CDCDCD)',maxWidth:'62ch',lineHeight:1.55,marginTop:6 }}>{d.lede}</p>
              <div className="dd-stats" style={{ marginTop:8 }}>{d.stats.map(s=><Stat key={s.label} num={s.num} label={s.label} small={s.small} />)}</div>
              <div className="dd-cards" style={{ marginTop:22 }}>{d.cards.map(c=><InfoCard key={c.kicker} kicker={c.kicker} title={c.title} body={c.body} />)}</div>
              <div style={{ marginTop:22,border:'1px solid rgba(234,170,0,0.4)',borderRadius:14,padding:'26px 30px',display:'flex',alignItems:'center',gap:'1.4rem',flexWrap:'wrap',background:'rgba(234,170,0,0.14)' }}>
                <span style={{ fontFamily:'var(--font-display)',color:'var(--accent,#EAAA00)',fontSize:'1.3rem' }}>{d.strip.label}</span>
                <span style={{ color:'var(--fg-muted,#CDCDCD)',fontSize:'0.95rem' }}>{d.strip.date}</span>
                <ButtonGhost href="/founders" className="!ml-auto !text-[0.82rem] !px-4 !py-2">Meet the founders</ButtonGhost>
              </div>
            </div>
            {/* Sidebar */}
            <aside className="dd-panel" style={{ position:'sticky',top:96,padding:'26px 28px',borderRadius:14,border:'1px solid var(--border,rgba(255,255,255,0.12))',background:'var(--surface,#0A0D33)' }}>
              {sb.type === 'live' && <>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:12 }}>
                  <span style={{ fontSize:'0.62rem',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,padding:'0.22rem 0.6rem',borderRadius:9999,color:'var(--accent,#EAAA00)',border:'1px solid rgba(234,170,0,0.5)',background:'rgba(234,170,0,0.14)' }}>Live</span>
                  <span style={{ fontFamily:'var(--font-mono)',fontSize:'0.78rem',color:'var(--fg-soft,rgba(255,255,255,0.60))' }}>{d.coin}</span>
                </div>
                <div style={{ fontFamily:'var(--font-display)',fontSize:'2.4rem',color:'var(--fg,#fff)',lineHeight:1,marginTop:6 }}>
                  {sb.price}{' '}<span style={{ fontSize:'1rem',color: sb.deltaDir==='up' ? 'var(--success,#00EB75)' : 'var(--danger,#FF3A3A)' }}>{sb.delta}</span>
                </div>
                <p style={{ color:'var(--fg-dim,rgba(255,255,255,0.35))',fontSize:'0.82rem',margin:'0.2rem 0 1rem' }}>24h price · token trades on Solana</p>
                {sb.rows.map(r=><PanelRow key={r.label} label={r.label} value={r.value} />)}
                <Link href="/login" style={{ display:'block',width:'100%',marginTop:14,textAlign:'center',fontFamily:'var(--font-sans)',fontWeight:700,fontSize:'0.95rem',padding:'0.75rem 1.5rem',borderRadius:4,background:'var(--accent,#EAAA00)',color:'var(--on-accent,#09073A)',textDecoration:'none' }}>{sb.tradeCta}</Link>
                <Link href="/login" style={{ display:'block',width:'100%',marginTop:8,textAlign:'center',fontFamily:'var(--font-sans)',fontWeight:700,fontSize:'0.95rem',padding:'0.75rem 1.5rem',borderRadius:4,background:'transparent',color:'var(--fg,#fff)',border:'1px solid var(--border-strong,rgba(255,255,255,0.22))',textDecoration:'none' }}>{sb.joinCta}</Link>
              </>}
              {sb.type === 'forming' && <>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:12 }}>
                  <span style={{ fontSize:'0.62rem',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,padding:'0.22rem 0.6rem',borderRadius:9999,border:'1px solid var(--border,rgba(255,255,255,0.12))',color:'var(--fg-soft,rgba(255,255,255,0.60))' }}>Forming</span>
                  <span style={{ fontFamily:'var(--font-mono)',fontSize:'0.78rem',color:'var(--fg-soft,rgba(255,255,255,0.60))' }}>{d.coin}</span>
                </div>
                <p style={{ color:'var(--fg-muted,#CDCDCD)',fontSize:'0.92rem',margin:'0.4rem 0 1rem' }}>{sb.description}</p>
                {sb.rows.map(r=><PanelRow key={r.label} label={r.label} value={r.value} />)}
                <Link href="/login" style={{ display:'block',width:'100%',marginTop:14,textAlign:'center',fontFamily:'var(--font-sans)',fontWeight:700,fontSize:'0.95rem',padding:'0.75rem 1.5rem',borderRadius:4,background:'var(--accent,#EAAA00)',color:'var(--on-accent,#09073A)',textDecoration:'none' }}>{sb.joinCta}</Link>
              </>}
              {sb.type === 'raising' && <>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:12 }}>
                  <span style={{ fontSize:'0.62rem',letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:700,padding:'0.22rem 0.6rem',borderRadius:9999,color:'var(--accent,#EAAA00)',border:'1px solid rgba(234,170,0,0.5)',background:'rgba(234,170,0,0.14)' }}>Raising</span>
                  <span style={{ fontFamily:'var(--font-mono)',fontSize:'0.78rem',color:'var(--fg-soft,rgba(255,255,255,0.60))' }}>{d.coin}</span>
                </div>
                <div style={{ height:7,borderRadius:9999,background:'var(--surface-elev,#100E59)',overflow:'hidden',marginBottom:'0.5rem' }}><span style={{ display:'block',height:'100%',background:'var(--accent,#EAAA00)',borderRadius:9999,width:`${sb.pct}%` }} /></div>
                <div style={{ display:'flex',justifyContent:'space-between',gap:8,fontSize:'0.82rem',color:'var(--fg-muted,#CDCDCD)',marginBottom:'1.1rem' }}><span><b style={{ color:'var(--fg,#fff)',fontWeight:700 }}>{sb.committed}</b> committed</span><span>{sb.goal} · {sb.pct}%</span></div>
                {sb.rows.map(r=><PanelRow key={r.label} label={r.label} value={r.value} />)}
                <Link href="/login" style={{ display:'block',width:'100%',marginTop:14,textAlign:'center',fontFamily:'var(--font-sans)',fontWeight:700,fontSize:'0.95rem',padding:'0.75rem 1.5rem',borderRadius:4,background:'var(--accent,#EAAA00)',color:'var(--on-accent,#09073A)',textDecoration:'none' }}>{sb.joinCta}</Link>
              </>}
            </aside>
          </div>
        </div>
      </section>
      <LandingFooter />
    </>
  )
}
