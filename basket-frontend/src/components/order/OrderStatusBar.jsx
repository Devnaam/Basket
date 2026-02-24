const STEPS = [
  { key: 'placed', label: 'Placed', icon: '🛒' },
  { key: 'packing', label: 'Packing', icon: '📦' },
  { key: 'out_for_delivery', label: 'On Way', icon: '🏍️' },
  { key: 'delivered', label: 'Delivered', icon: '✅' },
];

const OrderStatusBar = ({ status }) => {
  const currentIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center justify-between w-full px-2">
      {STEPS.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isActive = index === currentIndex;

        return (
          <div key={step.key} className="flex-1 flex flex-col items-center relative">
            {/* Connecting line */}
            {index < STEPS.length - 1 && (
              <div
                className={`absolute top-4 left-1/2 w-full h-0.5 transition-colors duration-500 ${
                  index < currentIndex ? 'bg-basket-green' : 'bg-gray-200'
                }`}
              />
            )}
            {/* Step circle */}
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm
                          transition-all duration-500 ${
                            isCompleted
                              ? 'bg-basket-green shadow-md'
                              : 'bg-gray-100 border-2 border-gray-200'
                          } ${isActive ? 'ring-4 ring-green-100 scale-110' : ''}`}
            >
              {step.icon}
            </div>
            {/* Step label */}
            <span
              className={`mt-1.5 text-[10px] font-medium text-center ${
                isCompleted ? 'text-basket-green' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default OrderStatusBar;
