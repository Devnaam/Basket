const MetricCard = ({ title, value, sub, icon, color = 'green', isLoading = false }) => {
  const colors = {
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
      {isLoading ? (
        <div className="mt-3 space-y-2">
          <div className="h-7 w-24 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-4 w-20 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-2xl font-extrabold text-gray-900">{value ?? '—'}</p>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">{title}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
