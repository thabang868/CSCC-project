import { useEffect, useState } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Loader from '../components/ui/Loader.jsx'
import ChartCard from '../components/charts/ChartCard.jsx'
import { LineChartLite, BarChartLite, AreaChartLite } from '../components/charts/Charts.jsx'
import PowerBIDashboard from '../components/PowerBIEmbed.jsx'
import { dashApi } from '../services/api.js'
import { useRefresh } from '../context/RefreshContext.jsx'

export default function AnalyticsDashboard() {
  const [aovByStdCost, setAovByStdCost] = useState([])
  const [qByMonth, setQByMonth] = useState([])
  const [aovByCategory, setAovByCategory] = useState([])
  const [aovByYear, setAovByYear] = useState([])
  const [loading, setLoading] = useState(true)
  const { refreshKey } = useRefresh()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      dashApi.aovByStandardCost().catch(() => []),
      dashApi.quantityByMonth().catch(() => []),
      dashApi.aovByCategory().catch(() => []),
      dashApi.aovByYear().catch(() => []),
    ]).then(([sc, m, c, y]) => {
      setAovByStdCost(sc); setQByMonth(m); setAovByCategory(c); setAovByYear(y)
    }).finally(() => setLoading(false))
  }, [refreshKey])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard 3 of 3 · Live data"
        title="Client C Sales Performance"
        subtitle="Sales value and quantity trends across costs, categories, months, and years."
      />

      <PowerBIDashboard category="analytics" title="Client C Sales Performance Power BI" />

      {loading ? (
        <Loader label="Loading analytics metrics…" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Average Order Value by StandardCost">
              <AreaChartLite
                data={aovByStdCost}
                xKey="StandardCost"
                yKey="avg_order_value"
                xMoney
                money
                color="#2548e0"
              />
            </ChartCard>
            <ChartCard title="Average Order Value by Category">
              <BarChartLite data={aovByCategory} xKey="ProductCategory" yKey="avg_order_value" money color="#7c3aed" />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Total Quantity Sold by Month" subtitle="Sorted by quantity desc">
              <LineChartLite data={qByMonth} xKey="MonthName" yKey="total_quantity" color="#0ea5e9" />
            </ChartCard>
            <ChartCard title="Average Order Value by Year">
              <BarChartLite data={aovByYear} xKey="YearNumber" yKey="avg_order_value" money color="#10b981" />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
