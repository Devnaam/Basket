const Badge = ({ children, variant = 'green', size = 'sm' }) => {
  const variants = {
    green: 'bg-green-100 text-green-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100 text-blue-800',
  };
  const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1' };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};

export default Badge;
