import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, SlidersHorizontal } from 'lucide-react'
import DashboardModuleCard from './DashboardModuleCard.jsx'
import HeroFeaturedCard from './HeroFeaturedCard.jsx'
import StatCard from './StatCard.jsx'
import RevenueChart from './RevenueChart.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'

const PERIOD_TABS = ['Today', 'This Week', 'This Month', 'All', 'Custom']

const PERIOD_QUERY = {
  Today: 'today',
  'This Week': 'week',
  'This Month': 'month',
  All: 'all',
  Custom: 'all',
}

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80'

/**
 * Shared panel dashboard layout — hero, module cards, overview,
 * pending tasks and monthly revenue chart.
 */
function PanelDashboard({
  panelLabel,
  displayName,
  welcomeTitle,
  welcomeSubtitle,
  featuredModule,
  gridModules = [],
  overviewStats = [],
  pendingTasks = [],
  heroImage = DEFAULT_HERO_IMAGE,
  showCommunication = true,
  onPeriodChange,
  statsLoading = false,
  monthlyData = [],
  revenueTitle = 'Monthly Revenue',
  revenueMetricLabel = 'Revenue',
  revenueColor = '#3d4fe0',
}) {
  const [activePeriod, setActivePeriod] = useState('All')

  const handlePeriodClick = (tab) => {
    setActivePeriod(tab)
    onPeriodChange?.(PERIOD_QUERY[tab] || 'all', tab)
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{welcomeTitle}</h1>
          {welcomeSubtitle && (
            <p className="mt-1 max-w-2xl text-sm text-slate-500">{welcomeSubtitle}</p>
          )}
        </div>
        {showCommunication && (
          <Button
            as={Link}
            to={panelLabel === 'Supplier Panel' ? '/supplier/disputes' : '/user/disputes'}
            variant="outline"
            size="sm"
            className="border border-slate-200 bg-white"
          >
            <MessageCircle className="h-4 w-4" />
            Communication
          </Button>
        )}
      </div>

      <div className="mb-6 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="relative h-40 w-full overflow-hidden rounded-2xl sm:h-48 lg:col-span-8 lg:h-full lg:min-h-[190px]">
          <img
            src={heroImage}
            alt="Warehouse"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        {featuredModule && (
          <div className="flex flex-col lg:col-span-4">
            <HeroFeaturedCard
              title={featuredModule.title}
              description={featuredModule.description}
              links={featuredModule.links}
              className="h-full"
            />
          </div>
        )}
      </div>

      {gridModules.length > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {gridModules.map((module) => (
            <DashboardModuleCard
              key={module.title}
              title={module.title}
              description={module.description}
              links={module.links}
            />
          ))}
        </div>
      )}

      {(overviewStats.length > 0 || onPeriodChange) && (
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{panelLabel}</p>
              <h2 className="text-xl font-bold text-slate-900">Overview</h2>
              <p className="text-xs text-slate-400">
                {statsLoading
                  ? 'Loading…'
                  : activePeriod === 'All' || activePeriod === 'Custom'
                    ? 'All time'
                    : activePeriod}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              {PERIOD_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handlePeriodClick(tab)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 ${
                    activePeriod === tab
                      ? 'bg-primary text-white'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  {tab === 'Custom' ? (
                    <span className="inline-flex items-center gap-1">
                      Custom
                      <SlidersHorizontal className="h-3 w-3" />
                    </span>
                  ) : (
                    tab
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {overviewStats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      )}

      {pendingTasks.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Pending Tasks &amp; Actions</h2>
            <span className="text-xs font-medium text-slate-400">Click any card to take action</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingTasks.map((task) => (
              <StatCard key={task.label} {...task} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900">{revenueTitle}</h2>
          <span className="text-xs font-medium text-slate-400">Past 6 Months Performance</span>
        </div>
        <Card className="min-w-0 overflow-hidden p-5 shadow-soft">
          <RevenueChart
            data={monthlyData}
            dataKey="revenue"
            metricLabel={revenueMetricLabel}
            color={revenueColor}
          />
        </Card>
      </div>
    </>
  )
}

export default PanelDashboard
