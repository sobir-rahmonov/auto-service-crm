export default function StatCard({ label, value, tone = 'default' }) {
  const brand = tone === 'brand'
  return (
    <div
      className={`rounded-2xl p-5 flex flex-col gap-2 ${
        brand ? 'bg-brand-dark text-white' : 'bg-white border border-line'
      }`}
    >
      <span className={`text-[15px] ${brand ? 'text-[#CFE8E4]' : 'text-muted'}`}>{label}</span>
      <span className="text-4xl font-bold leading-none">{value}</span>
    </div>
  )
}