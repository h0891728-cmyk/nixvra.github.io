'use client'

type Props = {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  itemLabel?: string
}

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), totalPages)
}

export default function PaginationControls({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'items',
}: Props) {
  if (totalItems <= 0) return null

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = clampPage(currentPage, totalPages)
  const start = (safePage - 1) * pageSize + 1
  const end = Math.min(totalItems, safePage * pageSize)

  const pageWindow = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => (
    page === 1 ||
    page === totalPages ||
    Math.abs(page - safePage) <= 1
  ))

  const compactPages = pageWindow.reduce<(number | string)[]>((acc, page, index) => {
    if (index > 0 && typeof acc[acc.length - 1] === 'number' && page - Number(acc[acc.length - 1]) > 1) {
      acc.push('...')
    }
    acc.push(page)
    return acc
  }, [])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
      padding: '0.875rem 1rem',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        Showing {start}-{end} of {totalItems} {itemLabel}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          style={{
            padding: '0.38rem 0.7rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-raised)',
            color: safePage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
            cursor: safePage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            fontWeight: 700,
            opacity: safePage === 1 ? 0.6 : 1,
          }}
        >
          Prev
        </button>

        {compactPages.map((page, index) => (
          typeof page === 'string' ? (
            <span key={`ellipsis-${index}`} style={{ padding: '0 0.2rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-current={page === safePage ? 'page' : undefined}
              style={{
                minWidth: 34,
                height: 34,
                padding: '0 0.55rem',
                borderRadius: 8,
                border: `1px solid ${page === safePage ? 'rgba(0,176,119,0.24)' : 'var(--border)'}`,
                background: page === safePage ? 'rgba(0,176,119,0.12)' : 'var(--bg-raised)',
                color: page === safePage ? '#00B077' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 800,
              }}
            >
              {page}
            </button>
          )
        ))}

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          style={{
            padding: '0.38rem 0.7rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-raised)',
            color: safePage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
            cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            fontWeight: 700,
            opacity: safePage === totalPages ? 0.6 : 1,
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
}
