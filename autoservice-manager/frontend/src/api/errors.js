// Backend xatolarini (DRF) o'qiladigan ko'rinishga o'giradi
export function parseApiError(error) {
  const data = error.response?.data
  if (!data) return { message: "Server bilan aloqa yo'q", fields: {} }
  if (typeof data === 'string') return { message: 'Xatolik yuz berdi', fields: {} }
  if (Array.isArray(data)) return { message: data.join(' '), fields: {} }

  const fields = {}
  let message = data.detail || ''
  for (const [key, value] of Object.entries(data)) {
    if (key === 'detail') continue
    const text = Array.isArray(value) ? value.join(' ') : String(value)
    if (key === 'non_field_errors') message = text
    else fields[key] = text
  }
  return { message, fields }
}

// Bitta matn ko'rinishida (maydon xatolari ham qo'shiladi)
export function errorText(error) {
  const { message, fields } = parseApiError(error)
  return message || Object.values(fields).join(' ') || 'Xatolik yuz berdi'
}