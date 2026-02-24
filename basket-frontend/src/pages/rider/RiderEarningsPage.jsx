import { useEffect, useState } from 'react';
import Spinner from '@/components/ui/Spinner';
import useRiderStore from '@/store/riderStore';

const PERIODS = [
  { label: 'Week',  value: '7d'  },
  { label: 'Month', value: '30d' },
  { label: '3M',    value: '90d' },
];

const RiderEarningsPage = () => {
  const { earnings, isLoadingEarnings, fetchEarnings, profile, fetchProfile } = useRiderStore();
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    fetchProfile();
    fetchEarnings(period);
  }, [period]);

  return (
    <div className="px-4 py-5 space-y-5">
      <h1 className="text-xl font-extrabold text-gray-900">Earnings</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '💰', label: "Today's Earning",     value: `₹${profile?.earningsToday?.toFixed(0) ?? 0}` },
          { icon: '📦', label: "Today's Deliveries",  value: profile?.deliveriesToday ?? 0 },
          { icon: '🏆', label: 'Total Earnings',      value: `₹${profile?.earnings?.total?.toFixed(0) ?? 0}` },
          { icon: '⭐', label: 'Rating',              value: `${profile?.rating?.toFixed(1) ?? '—'} / 5` },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-card border border-gray-100 text-center">
            <p className="text-2xl mb-1">{icon}</p>
            <p className="text-xl font-extrabold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${
              period === p.value
                ? 'bg-basket-green text-white border-basket-green'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoadingEarnings ? (
        <div className="flex justify-center py-10"><Spinner size="lg" /></div>
      ) : earnings ? (
        <>
          {/* Total for period */}
          <div className="bg-gradient-to-r from-basket-green to-primary-700 rounded-3xl p-5 text-white">
            <p className="text-sm text-green-100 font-semibold uppercase tracking-wide">
              {PERIODS.find((p) => p.value === period)?.label} Total
            </p>
            <p className="text-4xl font-extrabold mt-1">₹{earnings.totalEarnings?.toFixed(0) || 0}</p>
            <p className="text-sm text-green-200 mt-1">
              {earnings.totalDeliveries || 0} deliveries ·{' '}
              Avg ₹{earnings.avgPerDelivery?.toFixed(0) || 0}/delivery
            </p>
          </div>

          {/* Daily breakdown chart */}
          {earnings.dailyBreakdown?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Daily Earnings</h3>
              <div className="flex items-end gap-1.5 h-28">
                {(() => {
                  const maxEarning = Math.max(
                    ...earnings.dailyBreakdown.map((d) => d.earnings),
                    1
                  );
                  return earnings.dailyBreakdown.map((day) => {
                    const heightPct = Math.max((day.earnings / maxEarning) * 100, 3);
                    const label = new Date(day.date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short',
                    });
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-[10px]
                                        px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity
                                        whitespace-nowrap z-10">
                          ₹{day.earnings} · {day.deliveries} orders
                        </div>
                        <div
                          className="w-full rounded-t-lg bg-basket-green hover:bg-primary-700 transition-colors cursor-pointer"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[8px] text-gray-400 text-center">{label}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Per-delivery breakdown */}
          {earnings.recentDeliveries?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Recent Deliveries</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {earnings.recentDeliveries.map((delivery) => (
                  <div key={delivery._id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{delivery.orderId}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(delivery.deliveredAt).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-green-600">
                        +₹{delivery.riderEarning}
                      </p>
                      <p className="text-xs text-gray-400">₹{delivery.grandTotal} order</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">💰</p>
          <p className="text-sm">No earnings data available</p>
        </div>
      )}
    </div>
  );
};

export default RiderEarningsPage;
