import { Link } from 'react-router-dom';

const Button = ({ children, to, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
  const baseStyle = "inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "border-transparent text-white bg-[#0f2942] hover:bg-[#183e63] focus:ring-[#0f2942]",
    secondary: "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500",
    danger: "border-transparent text-white bg-red-700 hover:bg-red-800 focus:ring-red-600",
    success: "border-transparent text-white bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-600",
    outline: "border-[#0f2942] text-[#0f2942] bg-transparent hover:bg-slate-100 focus:ring-[#0f2942]",
  };

  const classes = `${baseStyle} ${variants[variant]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled}>
      {children}
    </button>
  );
};

export default Button;
