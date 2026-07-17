import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, PieChart, Pie, Cell, Legend,
  FunnelChart, Funnel, LabelList,
  AreaChart, Area,
} from 'recharts'

export const PALETTE = ['#2563eb', '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899']

const fmtMoney = (v) => 'R' + Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })
const fmtNumber = (v) => Number(v || 0).toLocaleString()

const tipStyle = {
  borderRadius: 12,
  border: '1px solid rgb(226 232 240)',
  boxShadow: '0 8px 30px rgba(2,6,23,.08)',
  fontSize: 12,
}

function NoData({ label = 'No data available' }) {
  return (
    <div className="h-full grid place-items-center text-center text-sm text-slate-400 px-4">
      {label}
    </div>
  )
}

export function BarChartLite({ data, xKey, yKey, money = false, color = '#2563eb', horizontal = false, height = '100%' }) {
  const formatter = money ? fmtMoney : fmtNumber
  if (!data || !data.length) return <NoData />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data || []} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 24, bottom: 8, left: horizontal ? 8 : 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatter} />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11 }} width={120} interval={0} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatter} />
          </>
        )}
        <Tooltip contentStyle={tipStyle} formatter={(v) => formatter(v)} />
        <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Waterfall — cumulative steps (green increase / red decrease) with a final
// blue Total bar. Mirrors the Power BI "Total Orders by Territory" visual.
function WaterfallTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const v = payload.find((p) => p.dataKey === 'value')
  const step = payload.find((p) => p.dataKey === 'value')?.payload
  return (
    <div style={{ ...tipStyle, background: '#fff', padding: '8px 10px' }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div>{fmtNumber(v?.value)}{step && step.name !== 'Total' ? `  ·  running ${fmtNumber(step.base + step.value)}` : ''}</div>
    </div>
  )
}

export function WaterfallChartLite({ data, xKey, yKey, height = '100%', totalLabel = 'Total' }) {
  const items = data || []
  if (!items.length) return <NoData />
  let run = 0
  const rows = items.map((d) => {
    const val = Number(d[yKey] || 0)
    const base = val >= 0 ? run : run + val
    run += val
    return { name: d[xKey], base, value: Math.abs(val), color: val >= 0 ? '#16a34a' : '#ef4444' }
  })
  rows.push({ name: totalLabel, base: 0, value: run, color: '#2548e0' })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtNumber} />
        <Tooltip content={<WaterfallTip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
        <Legend
          verticalAlign="top"
          height={26}
          payload={[
            { value: 'Increase', type: 'square', color: '#16a34a' },
            { value: 'Decrease', type: 'square', color: '#ef4444' },
            { value: 'Total', type: 'square', color: '#2548e0' },
          ]}
        />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" stackId="w" radius={[6, 6, 0, 0]}>
          {rows.map((r, i) => <Cell key={i} fill={r.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LineChartLite({ data, xKey, yKey, money = false, color = '#2563eb', height = '100%' }) {
  const formatter = money ? fmtMoney : fmtNumber
  if (!data || !data.length) return <NoData />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data || []} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={formatter} />
        <Tooltip contentStyle={tipStyle} formatter={(v) => formatter(v)} />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AreaChartLite({
  data, xKey, yKey,
  money = false, xMoney = false,
  color = '#2548e0',
  xFormatter,                     // optional custom X-axis formatter
  height = '100%',
}) {
  const yFmt = money ? fmtMoney : fmtNumber
  const xFmt = xFormatter || (xMoney
    ? (v) => 'R' + (Math.abs(Number(v)) >= 1000
        ? (Number(v) / 1000).toFixed(0) + 'K'
        : Number(v).toLocaleString())
    : (v) => v)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data || []} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <defs>
          <linearGradient id={`area-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickFormatter={xFmt}
               type={xMoney ? 'number' : 'category'} domain={xMoney ? ['dataMin', 'dataMax'] : undefined} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={yFmt} />
        <Tooltip
          contentStyle={tipStyle}
          formatter={(v) => yFmt(v)}
          labelFormatter={(v) => xFmt(v)}
        />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5}
              fill={`url(#area-${color})`} dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function FunnelChartLite({ data, nameKey, valueKey, money = false, color = '#2548e0', height = '100%' }) {
  const formatter = money ? fmtMoney : fmtNumber
  // Sort descending so funnel tapers correctly, then map to Recharts shape.
  const sorted = [...(data || [])]
    .map(d => ({ ...d, name: d[nameKey], value: Number(d[valueKey] || 0) }))
    .sort((a, b) => b.value - a.value)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <FunnelChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <Tooltip contentStyle={tipStyle} formatter={(v) => formatter(v)} />
        <Funnel dataKey="value" data={sorted} isAnimationActive>
          {sorted.map((_, i) => {
            // Continuous gradient from light to dark of the chosen colour
            const t = sorted.length > 1 ? i / (sorted.length - 1) : 0
            const r = parseInt(color.slice(1, 3), 16)
            const g = parseInt(color.slice(3, 5), 16)
            const b = parseInt(color.slice(5, 7), 16)
            const lighten = 0.85 - t * 0.55
            const fill = `rgb(${Math.round(r + (255 - r) * lighten)},${Math.round(g + (255 - g) * lighten)},${Math.round(b + (255 - b) * lighten)})`
            return <Cell key={i} fill={fill} />
          })}
          <LabelList
            position="right"
            dataKey="name"
            stroke="none"
            fill="#475569"
            fontSize={10}
          />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  )
}

export function PieChartLite({ data, nameKey, valueKey, money = false, height = '100%' }) {
  const formatter = money ? fmtMoney : fmtNumber
  if (!data || !data.length) return <NoData />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip contentStyle={tipStyle} formatter={(v) => formatter(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Pie data={data || []} dataKey={valueKey} nameKey={nameKey} innerRadius={50} outerRadius={90} paddingAngle={2}>
          {(data || []).map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
