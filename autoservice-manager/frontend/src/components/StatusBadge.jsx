const STATUS = {
  new: ['Yangi', 'bg-[#E8EEF9] text-[#27468A]'],
  diagnostics: ['Diagnostika', 'bg-[#F1E9F8] text-[#6B3A8C]'],
  assigned: ['Ustaga biriktirilgan', 'bg-[#EAEEF0] text-[#3E4F55]'],
  in_progress: ["Ta'mirlanmoqda", 'bg-[#FDEFD3] text-[#8A4B00]'],
  completed: ['Yakunlangan', 'bg-[#DDF1EA] text-[#0B5A44]'],
  paid: ["To'langan", 'bg-[#E2F3DC] text-[#2F5E1B]'],
  cancelled: ['Bekor qilingan', 'bg-[#EEEEEE] text-[#4A4A4A]'],
}

export default function StatusBadge({ status }) {
  const [label, style] = STATUS[status] || [status, 'bg-gray-100 text-gray-700']
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-semibold ${style}`}>
      {label}
    </span>
  )
}