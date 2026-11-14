export default function Field({ label, id, error, ...props }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        className={`h-12 px-4 rounded-xl border-[1.5px] bg-white text-base focus:outline-none focus:ring-2 focus:ring-brand/40 ${
          error ? 'border-red-600' : 'border-[#8FA09C]'
        }`}
        {...props}
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  )
}