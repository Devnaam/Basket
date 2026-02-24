import { useEffect, useState } from 'react';
import useAdminStore from '@/store/adminStore';
import Spinner from '@/components/ui/Spinner';

const PERIODS = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

const STATUS_COLORS = {
  placed: '#3b82f6', packing: '#f97316',
  out_for_delivery: '#eab308', delivered: '#16a34a', cancelled: '#ef4444',
};

const AnalyticsPage = () => {
  const { analytics, isLoadingAnalytics, fetchAnalytics } = useAdminStore();
  const [period, setPeriod] = useState('7d');

  useEffect(() => { fetchAnalytics(period); }, [period]);

  if (isLoadingAnalytics) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  const a = analytics;

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${
              period === p.value ? 'bg-basket-green text-white border-basket-green' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Revenue trend chart */}
      {a?.revenueByDay?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Revenue Trend</h3>
          <div className="flex items-end gap-1.5 h-32">
            {(() => {
              const maxRev = Math.max(...a.revenueByDay.map((d) => d.revenue), 1);
              return a.revenueByDay.map((day) => {
                const heightPct = Math.max((day.revenue / maxRev) * 100, 3);
                const date = new Date(day._id);
                const label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                return (
                  <div key={day._id} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      ₹{day.revenue.toFixed(0)} · {day.orders} orders
                    </div>
                    <div
                      className="w-full rounded-t-lg bg-basket-green hover:bg-primary-700 transition-colors cursor-pointer"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[8px] text-gray-400 text-center leading-tight">{label}</span>
                  </div>
                );
              });
            })()}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span>Total Revenue: <strong className="text-gray-900">₹{a.revenueByDay.reduce((s, d) => s + d.revenue, 0).toFixed(0)}</strong></span>
            <span>Total Orders: <strong className="text-gray-900">{a.revenueByDay.reduce((s, d) => s + d.orders, 0)}</strong></span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders by status */}
        {a?.ordersByStatus?.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Orders by Status</h3>
            <div className="space-y-3">
              {a.ordersByStatus.map((item) => {
                const total = a.ordersByStatus.reduce((s, i) => s + i.count, 0);
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium capitalize text-gray-700">
                        {item.status?.replace(/_/g, ' ')}
                      </span>
                      <span className="font-bold text-gray-900">{item.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[item.status] || '#94a3b8' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment method split */}
        {a?.paymentMethodSplit?.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Payment Methods</h3>
            <div className="space-y-3">
              {a.paymentMethodSplit.map((item) => {
                const total = a.paymentMethodSplit.reduce((s, i) => s + i.count, 0);
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.method}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium uppercase text-gray-700">{item.method}</span>
                      <span className="font-bold text-gray-900">
                        {item.count} orders · ₹{item.revenue.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-basket-green transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top Products */}
      {a?.topProducts?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Top Selling Products</h3>
          <div className="space-y-2">
            {a.topProducts.map((product, i) => (
              <div key={product.productId} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-basket-green rounded-full"
                        style={{ width: `${(product.totalSold / (a.topProducts[0]?.totalSold || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">{product.totalSold} sold</p>
                  <p className="text-xs text-gray-400">₹{product.revenue.toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Revenue */}
      {a?.categoryRevenue?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Revenue by Category</h3>
          <div className="grid grid-cols-2 gap-3">
            {a.categoryRevenue.map((cat) => (
              <div key={cat.category} className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-900">{cat.category || 'Unknown'}</p>
                <p className="text-lg font-extrabold text-basket-green mt-1">₹{cat.revenue.toFixed(0)}</p>
                <p className="text-xs text-gray-400">{cat.orderCount} orders</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
