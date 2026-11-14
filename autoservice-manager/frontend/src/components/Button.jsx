const STYLES = {
  primary: 'bg-brand text-white hover:bg-brand-ink',
  outline: 'border border-brand bg-white text-brand-ink hover:bg-brand-soft',
  danger: 'border border-red-300 bg-white text-red-800 hover:bg-red-50',
}

export default function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`h-12 px-6 rounded-xl font-semibold cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${STYLES[variant]} ${className}`}
      {...props}
    />
  )
}