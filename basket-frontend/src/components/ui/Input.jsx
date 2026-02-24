const Input = ({
  label, name, type = 'text', value, onChange,
  placeholder = '', error = '', maxLength,
  prefix, suffix, className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-4 text-gray-500 text-sm font-medium">{prefix}</span>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`input-field ${prefix ? 'pl-12' : ''} ${suffix ? 'pr-12' : ''} ${
            error ? 'border-red-400 focus:ring-red-400' : ''
          }`}
        />
        {suffix && (
          <span className="absolute right-4 text-gray-500 text-sm">{suffix}</span>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
    </div>
  );
};

export default Input;
