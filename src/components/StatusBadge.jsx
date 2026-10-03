export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();
  return <span className={`badge badge-${normalized}`}>{status?.replace(/_/g, ' ')}</span>;
}