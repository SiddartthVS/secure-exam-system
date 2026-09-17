

export const StatusBadge = ({ status }) => {
  const normalized = (status || 'pending').toLowerCase()

  if (normalized === 'submitted' || normalized === 'published') {
    return (
      <span className="badge badge-success">
        <span className="badge-dot"></span>
        {normalized === 'submitted' ? 'Submitted – LOCKED' : 'Published'}
      </span>
    )
  }

  if (normalized === 'draft') {
    return (
      <span className="badge badge-warning">
        <span className="badge-dot"></span>
        Draft – Replaceable
      </span>
    )
  }

  return (
    <span className="badge badge-pending">
      <span className="badge-dot"></span>
      Pending Submission
    </span>
  )
}
