import type { QuestionGraphData } from '@/lib/types'

interface Props { data: QuestionGraphData; className?: string }

const COLORS = ['#003366','#00a651','#f5a623','#0066cc','#e53e3e','#805ad5','#00b5d8','#dd6b20']

export function SimpleChart({ data, className = '' }: Props) {
  if (!data?.labels?.length || !data?.datasets?.length) return null

  if (data.type === 'bar') return <BarChart data={data} className={className} />
  if (data.type === 'line') return <LineChart data={data} className={className} />
  if (data.type === 'pie') return <PieChart data={data} className={className} />
  return null
}

function BarChart({ data, className }: { data: QuestionGraphData; className: string }) {
  const W = 480, H = 260, PAD = 40, BOTTOM = 50
  const all = data.datasets.flatMap(d => d.data)
  const max = Math.max(...all, 1)
  const barW = Math.floor((W - PAD * 2) / (data.labels.length * data.datasets.length + data.labels.length))
  const groupW = barW * data.datasets.length + 4
  return (
    <div className={className}>
      {data.title && <p className="text-sm font-medium text-center mb-1">{data.title}</p>}
      <svg viewBox={`0 0 ${W} ${H + BOTTOM}`} className="w-full max-w-lg mx-auto">
        {/* Y-axis */}
        {[0,25,50,75,100].map(pct => {
          const y = PAD + (H - PAD) * (1 - pct / 100)
          const val = Math.round(max * pct / 100)
          return <g key={pct}><line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#e2e8f0" strokeWidth="1"/><text x={PAD - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{val}</text></g>
        })}
        {/* Bars */}
        {data.labels.map((label, gi) => {
          const gx = PAD + gi * groupW
          return (
            <g key={gi}>
              {data.datasets.map((ds, di) => {
                const barH = Math.max(2, ((ds.data[gi] ?? 0) / max) * (H - PAD))
                const x = gx + di * barW + 2
                const y = H - barH
                return <rect key={di} x={x} y={y} width={barW - 2} height={barH} fill={ds.color ?? COLORS[di % COLORS.length]} rx="2"/>
              })}
              <text x={gx + groupW / 2} y={H + 16} textAnchor="middle" fontSize="10" fill="#64748b">{label}</text>
            </g>
          )
        })}
        {/* Legend */}
        {data.datasets.length > 1 && data.datasets.map((ds, i) => (
          <g key={i} transform={`translate(${PAD + i * 80}, ${H + BOTTOM - 12})`}>
            <rect width="10" height="10" fill={ds.color ?? COLORS[i % COLORS.length]} rx="2"/>
            <text x="14" y="9" fontSize="9" fill="#64748b">{ds.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function LineChart({ data, className }: { data: QuestionGraphData; className: string }) {
  const W = 480, H = 220, PAD = 45, BOTTOM = 40
  const all = data.datasets.flatMap(d => d.data)
  const max = Math.max(...all, 1)
  const n = data.labels.length
  const xStep = (W - PAD * 2) / Math.max(n - 1, 1)
  const toY = (v: number) => PAD + (H - PAD) * (1 - v / max)
  return (
    <div className={className}>
      {data.title && <p className="text-sm font-medium text-center mb-1">{data.title}</p>}
      <svg viewBox={`0 0 ${W} ${H + BOTTOM}`} className="w-full max-w-lg mx-auto">
        {[0,25,50,75,100].map(pct => {
          const y = toY(max * pct / 100)
          return <line key={pct} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#e2e8f0" strokeWidth="1"/>
        })}
        {data.datasets.map((ds, di) => {
          const pts = ds.data.map((v, i) => `${PAD + i * xStep},${toY(v)}`).join(' ')
          const color = ds.color ?? COLORS[di % COLORS.length]
          return (
            <g key={di}>
              <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
              {ds.data.map((v, i) => <circle key={i} cx={PAD + i * xStep} cy={toY(v)} r="4" fill={color}/>)}
            </g>
          )
        })}
        {data.labels.map((l, i) => (
          <text key={i} x={PAD + i * xStep} y={H + 16} textAnchor="middle" fontSize="10" fill="#64748b">{l}</text>
        ))}
      </svg>
    </div>
  )
}

function PieChart({ data, className }: { data: QuestionGraphData; className: string }) {
  const values = data.datasets[0]?.data ?? []
  const total = values.reduce((a, b) => a + b, 0) || 1
  const R = 80, CX = 120, CY = 100
  let angle = -Math.PI / 2
  const slices = values.map((v, i) => {
    const sweep = (v / total) * 2 * Math.PI
    const x1 = CX + R * Math.cos(angle), y1 = CY + R * Math.sin(angle)
    angle += sweep
    const x2 = CX + R * Math.cos(angle), y2 = CY + R * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return { path: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`, color: COLORS[i % COLORS.length], label: data.labels[i] ?? '', pct: Math.round(v / total * 100) }
  })
  return (
    <div className={className}>
      {data.title && <p className="text-sm font-medium text-center mb-1">{data.title}</p>}
      <svg viewBox="0 0 280 200" className="w-full max-w-xs mx-auto">
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2"/>)}
        {slices.map((s, i) => (
          <g key={i} transform={`translate(${CX * 2 + 8}, ${16 + i * 20})`}>
            <rect width="12" height="12" fill={s.color} rx="2"/>
            <text x="16" y="10" fontSize="11" fill="#374151">{s.label} ({s.pct}%)</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// Table renderer for question table data
import type { QuestionTableData } from '@/lib/types'
export function DataTable({ data, className = '' }: { data: QuestionTableData; className?: string }) {
  if (!data?.headers?.length) return null
  return (
    <div className={`overflow-x-auto rounded-lg border border-border ${className}`}>
      <table className="w-full text-sm">
        <thead><tr className="bg-muted">{data.headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold border-b border-border">{h}</th>)}</tr></thead>
        <tbody>{(data.rows ?? []).map((row, ri) => (
          <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/30'}>
            {row.map((cell, ci) => <td key={ci} className="px-3 py-2 border-b border-border/50">{cell}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}
