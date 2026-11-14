export default function Select({ label, id, error, children, ...props }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={Boolean(error)}
        className={`h-12 px-3 rounded-xl border-[1.5px] bg-white text-base focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:bg-page disabled:text-muted ${
          error ? 'border-red-600' : 'border-[#8FA09C]'
        }`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}