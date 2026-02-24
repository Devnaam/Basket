const Spinner = ({ size = 'md', color = 'green' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  const colors = { green: 'border-basket-green', white: 'border-white', gray: 'border-gray-400' };

  return (
    <div
      className={`${sizes[size]} border-2 ${colors[color]} border-t-transparent rounded-full animate-spin`}
    />
  );
};

export default Spinner;
