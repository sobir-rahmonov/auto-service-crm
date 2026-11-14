function Check() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9FE0D4"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 mt-0.5"
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  )
}

const POINTS = [
  "Buyurtma qabul qilishdan to'lovgacha bitta joyda",
  "Narx va ombor qoldig'i avtomatik hisoblanadi",
  "Mijoz ta'mirlash jarayonini o'zi kuzatadi",
]

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex bg-page">
      <aside className="hidden lg:flex w-[44%] max-w-140 flex-col justify-between bg-brand-dark p-16 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-soft flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F4F4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 14l2-6h14l2 6v4h-3v-2H6v2H3zM6 14h12" />
            </svg>
          </div>
          <span className="text-xl font-bold">AutoService</span>
        </div>

        <div className="flex flex-col gap-7">
          <h1 className="text-4xl font-bold leading-tight">Mashina holatini bir qarashda biling</h1>
          <ul className="flex flex-col gap-4 text-[17px] leading-relaxed text-[#D7ECE8]">
            {POINTS.map((text) => (
              <li key={text} className="flex gap-3">
                <Check />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-[#B9D9D4]">Admin, menejer, usta va mijoz uchun</p>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}