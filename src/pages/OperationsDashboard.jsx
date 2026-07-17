import { useEffect, useState } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Loader from '../components/ui/Loader.jsx'
import ChartCard from '../components/charts/ChartCard.jsx'
import { LineChartLite, BarChartLite, PieChartLite, WaterfallChartLite } from '../components/charts/Charts.jsx'
import PowerBIDashboard from '../components/PowerBIEmbed.jsx'
import { dashApi } from '../services/api.js'
import { useRefresh } from '../context/RefreshContext.jsx'

export default function OperationsDashboard() {
  const [byTerritory, setByTerritory] = useState([])
  const [byMonth, setByMonth] = useState([])
  const [byCategory, setByCategory] = useState([])
  const [byProduct, setByProduct] = useState([])
  const [byListPrice, setByListPrice] = useState([])
  const [loading, setLoading] = useState(true)
  const { refreshKey } = useRefresh()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      dashApi.ordersByTerritory().catch(() => []),
      dashApi.ordersByMonth().catch(() => []),
      dashApi.ordersByCategory().catch(() => []),
      dashApi.ordersByProduct(20).catch(() => []),
      dashApi.ordersByListPrice().catch(() => []),
    ]).then(([t, m, c, p, lp]) => {
      setByTerritory(t); setByMonth(m); setByCategory(c); setByProduct(p); setByListPrice(lp)
    }).finally(() => setLoading(false))
  }, [refreshKey])

  // Match the Power BI pie: top 8 list prices + "Other" bucket
  const lpPie = (() => {
    if (!byListPrice?.length) return []
    const top = byListPrice.slice(0, 8).map(r => ({
      name: 'R' + Number(r.ListPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      total_orders: r.total_orders,
    }))
    const rest = byListPrice.slice(8).reduce((s, r) => s + (r.total_orders || 0), 0)
    if (rest > 0) top.push({ name: 'Other', total_orders: rest })
    return top
  })()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard 2 of 3 · Live data"
        title="Client B Order Operations"
        subtitle="Order volume and performance across territories, months, product categories, pricing, and products."
      />

      <PowerBIDashboard category="operations" title="Client B Order Operations Power BI" />

      {loading ? (
        <Loader label="Loading operations metrics…" />
      ) : (
        <>
          {/* Waterfall — matches the Power BI "Total Orders by Territory"
              visual (cumulative increase steps + Total). Full-width row. */}
          <ChartCard title="Total Orders by Territory" subtitle="Live · fact.vw_SalesDashboard">
            <WaterfallChartLite data={byTerritory} xKey="TerritoryName" yKey="total_orders" />
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Total Orders by Month" subtitle="Sorted by orders desc">
              <LineChartLite data={byMonth} xKey="MonthName" yKey="total_orders" color="#2548e0" />
            </ChartCard>
            <ChartCard title="Total Orders by Category">
              <BarChartLite data={byCategory} xKey="ProductCategory" yKey="total_orders" color="#7c3aed" />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Total Orders by ListPrice" subtitle="Share by unit price" className="lg:col-span-1">
              <PieChartLite data={lpPie} nameKey="name" valueKey="total_orders" />
            </ChartCard>
            <ChartCard title="Top 20 Products by Orders" className="lg:col-span-2">
              <BarChartLite data={byProduct} xKey="ProductName" yKey="total_orders" color="#0ea5e9" />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
