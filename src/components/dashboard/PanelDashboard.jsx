import { useState } from 'react'
import { MessageCircle, SlidersHorizontal } from 'lucide-react'
import DashboardModuleCard from './DashboardModuleCard.jsx'
import HeroFeaturedCard from './HeroFeaturedCard.jsx'
import StatCard from './StatCard.jsx'
import RevenueChart from './RevenueChart.jsx'
import Card from '../ui/Card.jsx'
import Button from '../ui/Button.jsx'

const PERIOD_TABS = ['Today', 'This Week', 'This Month', 'All', 'Custom']

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
}) {
  const [activePeriod, setActivePeriod] = useState('All')

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
          <Button variant="outline" size="sm" className="border border-slate-200 bg-white">
            <MessageCircle className="h-4 w-4" />
            Communication
          </Button>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="overflow-hidden rounded-2xl lg:flex-[2]">
          <img
            src={heroImage}
            alt="Warehouse"
            className="h-28 w-full object-cover sm:h-36 lg:h-[165px]"
          />
        </div>
        {featuredModule && (
          <div className="lg:min-w-[240px] lg:flex-[1]">
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

      {overviewStats.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{panelLabel}</p>
              <h2 className="text-xl font-bold text-slate-900">Overview</h2>
              <p className="text-xs text-slate-400">{activePeriod === 'All' ? 'All time' : activePeriod}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              {PERIOD_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActivePeriod(tab)}
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
          <h2 className="mb-4 text-xl font-bold text-slate-900">Pending Tasks</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingTasks.map((task) => (
              <StatCard key={task.label} {...task} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Monthly Revenue</h2>
        <Card className="p-5 shadow-soft">
          <RevenueChart />
        </Card>
      </div>
    </>
  )
}

export default PanelDashboard
