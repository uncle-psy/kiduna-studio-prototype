'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'


const API = process.env.NEXT_PUBLIC_AGENT_API_URL || 'http://localhost:8000'

interface TraceStep {
  index: number; tool: string; input: string; description: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  started_at: string | null; completed_at: string | null
  result: string | null; error: string | null
}
interface Trace {
  exec_id: string; skill_name: string; trigger_type: string; goal: string
  status: 'running' | 'completed' | 'cancelled' | 'failed'
  started_at: string; completed_at: string | null; steps: TraceStep[]
}

const TRIGGER_LABELS: Record<string,string> = { COMMAND:'Manual run', TIME:'Scheduled', EVENT:'Event detected', CONDITION:'Condition met' }

function StepResult({ result, tool, input: toolInput }: { result: string; tool: string; input: string }) {
  const [open, setOpen] = useState(false)
  const clean = result.replace(/^\[\w+\]\s*/, '').trim()
  if (!clean || clean === 'Done') return null

  // Build detailed sub-steps from result patterns (generic, no tool-specific code)
  function buildDetails(): string[] {
    const steps: string[] = []
    const email = toolInput.match(/[\w.+-]+@[\w.-]+\.\w{2,}/)?.[0]

    // Pattern: "Found X records/members/skills..."
    const foundMatch = clean.match(/Found (\d+) (\w+)/)
    if (foundMatch) {
      steps.push('Connected to the database')
      steps.push('Searched for matching records')
      steps.push(`Found ${foundMatch[1]} ${foundMatch[2]} in total`)
      return steps
    }

    // Pattern: "No records found"
    if (clean.toLowerCase().includes('no records') || clean.toLowerCase().includes('no data') || clean.includes('0 results')) {
      steps.push('Connected to the database')
      steps.push('Searched for matching records')
      steps.push('No matching records were found')
      return steps
    }

    // Pattern: email sent / delivered / success with email context
    if (clean.toLowerCase().includes('sent') || clean.toLowerCase().includes('delivered')) {
      if (email) steps.push(`Prepared message for ${email}`)
      steps.push('Connected to the service')
      steps.push(clean)
      return steps
    }

    // Pattern: created / published / posted
    if (clean.toLowerCase().includes('created') || clean.toLowerCase().includes('published') || clean.toLowerCase().includes('posted')) {
      steps.push('Connected to the service')
      steps.push('Prepared the content')
      steps.push(clean)
      return steps
    }

    // Generic fallback
    steps.push('Executed the action')
    steps.push(clean)
    return steps
  }

  const details = buildDetails()
  const summary = details[details.length - 1] || clean

  return (
    <div style={{marginTop:8,borderTop:'1px solid var(--sk-border)',paddingTop:8}}>
      <button onClick={()=>setOpen(!open)} style={{
        background:'none',border:'none',cursor:'pointer',padding:0,
        display:'flex',alignItems:'center',gap:6,width:'100%',textAlign:'left',
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--sk-tx-faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:open?'rotate(90deg)':'rotate(0)',transition:'transform .2s',flexShrink:0}}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
        <span style={{fontSize:11,color:'var(--sk-ok)'}}>{summary}</span>
      </button>
      {open && (
        <div style={{marginTop:6,paddingLeft:4}}>
          {details.map((d, i) => {
            const isLast = i === details.length - 1
            return (
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:11.5,lineHeight:1.8,color: isLast ? 'var(--sk-ok)' : 'var(--sk-tx-faint)'}}>
                <span style={{flexShrink:0}}>{isLast ? '✓' : '→'}</span>
                <span>{d}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function friendlyDetail(tool: string, input: string): string {
  if (!tool || !input) return ''
  // Extract email if present
  const email = input.match(/[\w.+-]+@[\w.-]+\.\w{2,}/)?.[0]
  if (email) return `to ${email}`
  // Hide raw technical input if too long
  if (input.length > 50) return ''
  return ''
}

function elapsed(s: string, e?: string | null): string {
  const sec = Math.round((new Date(e || new Date().toISOString()).getTime() - new Date(s).getTime()) / 1000)
  if (sec < 0) return '0s'
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`
}

function fmtTime(t: string): string {
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function TracePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: execId } = use(params)
  const router = useRouter()
  const [trace, setTrace] = useState<Trace | null>(null)
  const [notFound, setNotFound] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function f() {
      try {
        const r = await fetch(`${API}/api/skills/executions/${execId}/trace`)
        if (!r.ok) { setNotFound(true); return }
        const d = await r.json()
        if (d.status === 'not_found') { setNotFound(true); return }
        setTrace(d)
        if (d.status !== 'running') { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
      } catch { setNotFound(true) }
    }
    f(); pollRef.current = setInterval(f, 1000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [execId])

  if (notFound) return (
    <div className="sk-page"><div style={{marginTop:20}}>
      <div className="detail-header">
        <button className="detail-back" onClick={() => router.push('/align')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h1 className="detail-title">Trace expired</h1>
          <div className="detail-badges"><span style={{fontSize:11,color:'var(--sk-tx-faint)'}}>Traces are available for 5 minutes after completion.</span></div>
        </div>
      </div>
    </div></div>
  )
  if (!trace) return <div className="sk-page"><p style={{color:'var(--sk-tx-faint)',fontSize:13,marginTop:40}}>Loading...</p></div>

  const done = trace.steps.filter(s => s.status === 'done').length
  const failed = trace.steps.filter(s => s.status === 'failed' || s.status === 'skipped').length
  const total = trace.steps.length
  const el = elapsed(trace.started_at, trace.completed_at)
  const isRunning = trace.status === 'running'
  const allGood = trace.status === 'completed' && failed === 0
  const noStepsPending = total > 0 && !trace.steps.some(s => s.status === 'running' || s.status === 'pending')
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="sk-page">

      {/* Header — back + heading on same line */}
      <div className="page-head" style={{marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <button className="detail-back" onClick={() => router.push('/align')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 style={{marginBottom:4}}>{trace.skill_name}</h1>
            <div className="detail-badges">
              <span className="detail-badge" style={{background:'var(--sk-info-soft)',color:'var(--sk-info)'}}>
                {TRIGGER_LABELS[trace.trigger_type?.toUpperCase()] || trace.trigger_type}
              </span>
              <span className="detail-badge" style={{
                background: isRunning ? 'var(--sk-ok-soft)' : allGood ? 'var(--sk-ok-soft)' : 'var(--sk-warn-soft)',
                color: isRunning ? 'var(--sk-ok)' : allGood ? 'var(--sk-ok)' : 'var(--sk-warn)',
              }}>
                {isRunning ? '● Running' : allGood ? '● Completed' : failed > 0 ? '● Has errors' : '● Cancelled'}
              </span>
              <span style={{fontSize:11,color:'var(--sk-tx-faint)'}}>
                {trace.started_at ? fmtTime(trace.started_at) : ''} · {el}
              </span>
            </div>
          </div>
        </div>
        {isRunning && (
          <button className="btn" onClick={()=>fetch(`${API}/api/skills/executions/${execId}/cancel`,{method:'POST'})} style={{background:'var(--sk-bad)',boxShadow:'0 4px 14px -2px rgba(239,68,68,.4)'}}>
            Stop
          </button>
        )}
      </div>

      {/* Goal card */}
      {trace.goal && (
        <div style={{padding:'14px 18px',background:'var(--sk-surface)',border:'1px solid var(--sk-border)',borderRadius:12,marginBottom:24,fontSize:13,color:'var(--sk-tx-2)',lineHeight:1.6}}>
          {trace.goal}
        </div>
      )}

      {/* Workflow */}
      <div style={{position:'relative',paddingLeft:40}}>

        {/* Vertical connector line */}
        <div style={{position:'absolute',left:18,top:0,bottom:0,width:2,background:'var(--sk-surface-3)'}}/>

        {/* Start node */}
        <div style={{position:'relative',marginBottom:16,paddingBottom:8}}>
          <div style={{position:'absolute',left:-32,top:0,width:28,height:28,borderRadius:'50%',background:'var(--sk-ok)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{color:'#fff',fontSize:12,fontWeight:700}}>▶</span>
          </div>
          <div style={{fontSize:12,fontWeight:600,color:'var(--sk-ok)',paddingTop:5}}>
            Started {trace.started_at ? fmtTime(trace.started_at) : ''}
          </div>
        </div>

        {/* Steps */}
        {trace.steps.map((step, i) => {
          const p = step.status === 'pending', a = step.status === 'running', d = step.status === 'done', f = step.status === 'failed' || step.status === 'skipped'
          const detail = step.tool ? friendlyDetail(step.tool, step.input) : ''
          const stepDuration = step.completed_at && step.started_at ? elapsed(step.started_at, step.completed_at) : ''
          const isLast = i === trace.steps.length - 1
          const hasResult = (d || f) && step.result && step.result !== 'Done'

          return (
            <div key={i} style={{position:'relative',marginBottom: isLast && !isRunning ? 16 : 8}}>
              {/* Node circle */}
              <div style={{
                position:'absolute',left:-35,top:8,width:32,height:32,borderRadius:'50%',
                display:'flex',alignItems:'center',justifyContent:'center',
                background: d?'var(--sk-ok)' : f?'var(--sk-bad)' : a?'rgba(34,197,94,.15)' : 'var(--sk-surface-2)',
                border: a ? '2px solid var(--sk-ok)' : '2px solid transparent',
                boxShadow: a ? '0 0 12px rgba(34,197,94,.3)' : 'none',
                transition:'all .3s',
              }}>
                {d && <span style={{color:'#fff',fontSize:12,fontWeight:700}}>✓</span>}
                {f && <span style={{color:'#fff',fontSize:12,fontWeight:700}}>✗</span>}
                {a && <span style={{width:8,height:8,borderRadius:'50%',background:'var(--sk-ok)',animation:'sk-pulse 1.5s ease-out infinite'}}/>}
                {p && <span style={{color:'var(--sk-tx-faint)',fontSize:11,fontWeight:700}}>{i+1}</span>}
              </div>

              {/* Step card */}
              <div style={{
                padding:'12px 16px',borderRadius:10,
                background: a ? 'rgba(34,197,94,.04)' : f ? 'rgba(239,68,68,.03)' : 'var(--sk-surface)',
                border: `1px solid ${a ? 'rgba(34,197,94,.15)' : f ? 'rgba(239,68,68,.1)' : 'var(--sk-border)'}`,
                opacity: p ? .4 : 1, transition:'all .3s',
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13.5,fontWeight:600,color: a?'var(--sk-ok)' : f?'var(--sk-bad)' : d?'var(--sk-tx)' : 'var(--sk-tx-faint)'}}>
                      {step.description || 'Processing...'}
                    </div>
                    {detail && !p && <div style={{fontSize:11,color:'var(--sk-tx-faint)',marginTop:2}}>{detail}</div>}
                    {f && step.error && <div style={{fontSize:11,color:'var(--sk-bad)',marginTop:3}}>{step.error}</div>}
                  </div>
                  <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                    {step.started_at && <div style={{fontSize:10,color:'var(--sk-tx-faint)'}}>{fmtTime(step.started_at)}</div>}
                    {stepDuration && stepDuration !== '0s' && <div style={{fontSize:10,color:'var(--sk-tx-faint)'}}>{stepDuration}</div>}
                  </div>
                </div>

                {/* Expandable result */}
                {hasResult && <StepResult result={step.result!} tool={step.tool || ''} input={step.input || ''} />}
              </div>
            </div>
          )
        })}

        {/* Waiting for next step */}
        {isRunning && total > 0 && !trace.steps.some(s => s.status === 'running') && done < total && (
          <div style={{position:'relative',marginBottom:8}}>
            <div style={{position:'absolute',left:-35,top:8,width:32,height:32,borderRadius:'50%',background:'rgba(34,197,94,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'var(--sk-ok)',animation:'sk-pulse 1.5s ease-out infinite'}}/>
            </div>
            <div style={{padding:'12px 16px',borderRadius:10,background:'var(--sk-surface)',border:'1px solid var(--sk-border)'}}>
              <span style={{fontSize:12,color:'var(--sk-tx-faint)'}}>Working on next step...</span>
            </div>
          </div>
        )}

        {/* Planning */}
        {isRunning && total === 0 && (
          <div style={{position:'relative',marginBottom:8}}>
            <div style={{position:'absolute',left:-35,top:8,width:32,height:32,borderRadius:'50%',background:'rgba(34,197,94,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'var(--sk-ok)',animation:'sk-pulse 1.5s ease-out infinite'}}/>
            </div>
            <div style={{padding:'12px 16px',borderRadius:10,background:'var(--sk-surface)',border:'1px solid var(--sk-border)'}}>
              <span style={{fontSize:12,color:'var(--sk-tx-faint)'}}>Planning steps...</span>
            </div>
          </div>
        )}

        {/* End node — show immediately when all steps are done */}
        {total > 0 && (!isRunning || noStepsPending) && (
          <div style={{position:'relative'}}>
            <div style={{
              position:'absolute',left:-32,top:4,width:28,height:28,borderRadius:'50%',
              background: allGood ? 'var(--sk-ok)' : failed > 0 ? 'var(--sk-warn)' : 'var(--sk-surface-3)',
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <span style={{color:'#fff',fontSize:11,fontWeight:700}}>{allGood ? '✓' : '!'}</span>
            </div>
            <div style={{
              padding:'12px 16px',borderRadius:10,
              background: allGood ? 'rgba(34,197,94,.04)' : 'rgba(245,158,11,.04)',
              border: `1px solid ${allGood ? 'rgba(34,197,94,.12)' : 'rgba(245,158,11,.12)'}`,
            }}>
              <div style={{fontSize:13,fontWeight:600,color: allGood ? 'var(--sk-ok)' : 'var(--sk-warn)'}}>
                {allGood && `All ${done} steps completed`}
                {failed > 0 && `${done} completed, ${failed} failed`}
                {trace.status === 'cancelled' && `Cancelled — ${done} of ${total} completed`}
              </div>
              <div style={{fontSize:11,color:'var(--sk-tx-faint)',marginTop:2}}>Finished in {el}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}