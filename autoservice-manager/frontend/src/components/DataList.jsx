// Katta ekranda jadval, telefonda kartochkalar
// columns: [{ label, render(row), align, primary }]
export default function DataList({ columns, rows, empty, loading }) {
  if (!loading && rows.length === 0) {
    return <p className="p-8 text-center text-muted">{empty}</p>
  }
  const primary = columns.find((c) => c.primary) || columns[0]
  const rest = columns.filter((c) => c !== primary)

  return (
    <>
      <table className="hidden md:table w-full text-[15px]">
        <thead>
          <tr className="text-left text-[13px] text-muted">
            {columns.map((c, i) => (
              <th key={i} className={`px-5 py-4 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-[#EDF0EC]">
              {columns.map((c, i) => (
                <td key={i} className={`px-5 py-3.5 ${c === primary ? 'font-semibold' : ''} ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="border-t first:border-t-0 border-[#EDF0EC] p-4 flex flex-col gap-2">
            <div className="font-semibold">{primary.render(row)}</div>
            {rest.map((c, i) =>
              c.label ? (
                <div key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted">{c.label}</span>
                  <span className="text-right">{c.render(row)}</span>
                </div>
              ) : (
                <div key={i} className="flex gap-3">{c.render(row)}</div>
              ),
            )}
          </li>
        ))}
      </ul>
    </>
  )
}