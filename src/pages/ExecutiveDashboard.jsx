import { useEffect, useState } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Loader from '../components/ui/Loader.jsx'
import ChartCard from '../components/charts/ChartCard.jsx'
import { LineChartLite, BarChartLite, PieChartLite } from '../components/charts/Charts.jsx'
import PowerBIDashboard from '../components/PowerBIEmbed.jsx'
import { dashApi } from '../services/api.js'
import { useRefresh } from '../context/RefreshContext.jsx'

export default function ExecutiveDashboard() {
  const [byMonth, setByMonth] = useState([])
  const [byProduct, setByProduct] = useState([])
  const [byTerritory, setByTerritory] = useState([])
  const [byCategory, setByCategory] = useState([])
  const [loading, setLoading] = useState(true)
  const { refreshKey } = useRefresh()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      dashApi.revenueByMonth().catch(() => []),
      dashApi.revenueByProduct(10).catch(() => []),
      dashApi.revenueByTerritory().catch(() => []),
      dashApi.revenueByCategory().catch(() => []),
    ]).then(([m, p, t, c]) => {
      setByMonth(m); setByProduct(p); setByTerritory(t); setByCategory(c)
    }).finally(() => setLoading(false))
  }, [refreshKey])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard 1 of 3 · Live data"
        title="Client A Revenue Performance"
        subtitle="Revenue trends across time, product categories, top-performing products, and sales territories."
      />

      <PowerBIDashboard category="executive" title="Client A Revenue Performance Power BI" />

      {loading ? (
        <Loader label="Loading executive metrics…" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Total Revenue by Month" subtitle="Live · fact.vw_SalesDashboard" className="lg:col-span-2">
              <LineChartLite data={byMonth} xKey="MonthName" yKey="total_revenue" money color="#2563eb" />
            </ChartCard>
            <ChartCard title="Total Revenue by Category" subtitle="Share of revenue">
              <PieChartLite data={byCategory} nameKey="ProductCategory" valueKey="total_revenue" money />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Top 10 Products by Revenue">
              <BarChartLite data={byProduct} xKey="ProductName" yKey="total_revenue" money color="#0ea5e9" horizontal />
            </ChartCard>
            <ChartCard title="Total Revenue by Territory">
              <BarChartLite data={byTerritory} xKey="TerritoryName" yKey="total_revenue" money color="#10b981" horizontal />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
