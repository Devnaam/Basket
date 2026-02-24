import { useEffect } from 'react';
import MetricCard from '@/components/admin/MetricCard';
import LiveOrderFeed from '@/components/admin/LiveOrderFeed';
import useAdminStore from '@/store/adminStore';

const DashboardPage = () => {
  const { metrics, isLoadingMetrics, fetchMetrics } = useAdminStore();

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const m = metrics;

  return (
    <div className="space-y-6">
      {/* Today's metrics */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Today's Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            icon="📦" title="Orders Today" color="blue"
            value={m?.today?.orders ?? 0}
            sub={`Avg ₹${m?.today?.avgOrderValue?.toFixed(0) ?? 0}`}
            isLoading={isLoadingMetrics}
          />
          <MetricCard
            icon="💰" title="Revenue Today" color="green"
            value={`₹${m?.today?.revenue?.toFixed(0) ?? 0}`}
            sub="Excl. cancelled"
            isLoading={isLoadingMetrics}
          />
          <MetricCard
            icon="🏍️" title="Online Riders" color="orange"
            value={m?.live?.onlineRiders ?? 0}
            sub={`${m?.totals?.riders ?? 0} total riders`}
            isLoading={isLoadingMetrics}
          />
          <MetricCard
            icon="⚡" title="Active Orders" color="purple"
            value={m?.live?.activeOrders ?? 0}
            sub="In progress now"
            isLoading={isLoadingMetrics}
          />
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          icon="👥" title="Total Customers" color="blue"
          value={m?.totals?.customers ?? 0}
          isLoading={isLoadingMetrics}
        />
        <MetricCard
          icon="⚠️" title="Low Stock Alerts" color="red"
          value={m?.totals?.lowStockAlerts ?? 0}
          sub="Products below threshold"
          isLoading={isLoadingMetrics}
        />
        <MetricCard
          icon="🏪" title="Dark Stores" color="green"
          value={2}
          sub="Operational"
          isLoading={isLoadingMetrics}
        />
      </div>

      {/* Weekly revenue trend */}
      {m?.weeklyRevenue?.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-4">7-Day Revenue Trend</h3>
          <div className="flex items-end gap-2 h-24">
            {(() => {
              const maxRev = Math.max(...m.weeklyRevenue.map((d) => d.revenue), 1);
              return m.weeklyRevenue.map((day) => {
                const heightPct = Math.max((day.revenue / maxRev) * 100, 4);
                const date = new Date(day._id);
                const label = date.toLocaleDateString('en-IN', { weekday: 'short' });
                return (
                  <div key={day._id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-gray-400 font-medium">
                      ₹{day.revenue > 999 ? `${(day.revenue / 1000).toFixed(1)}k` : day.revenue}
                    </span>
                    <div
                      className="w-full rounded-t-lg bg-basket-green transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] text-gray-400">{label}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Live feed */}
      <LiveOrderFeed />
    </div>
  );
};

export default DashboardPage;
