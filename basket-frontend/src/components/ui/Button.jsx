import Spinner from './Spinner';

const Button = ({
  children, onClick, type = 'button',
  variant = 'primary', size = 'md',
  isLoading = false, disabled = false,
  fullWidth = false, className = '',
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-basket-green text-white hover:bg-primary-700',
    secondary: 'bg-white text-basket-green border-2 border-basket-green hover:bg-primary-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
  };
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {isLoading ? <Spinner size="sm" color={variant === 'primary' ? 'white' : 'green'} /> : children}
    </button>
  );
};

export default Button;
