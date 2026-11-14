import { Clock, CheckCircle2, AlertCircle, FileSearch, Send, Hammer, XCircle } from 'lucide-react';

const STATUS_STYLE_MAP = {
  'Pending': { color: 'text-[#16834A]', Icon: Clock },
  'New Request': { color: 'text-[#16834A]', Icon: Clock },
  'Reviewed': { color: 'text-amber-700', Icon: FileSearch },
  'Under Review': { color: 'text-amber-700', Icon: FileSearch },
  'Requirements Clarification': { color: 'text-amber-700', Icon: AlertCircle },
  'Quotation Sent': { color: 'text-[#116438]', Icon: Send },
  'Awaiting Customer Approval': { color: 'text-[#116438]', Icon: Clock },
  'Approved': { color: 'text-[#16A34A]', Icon: CheckCircle2 },
  'InProgress': { color: 'text-[#16834A]', Icon: Hammer },
  'In Progress': { color: 'text-[#16834A]', Icon: Hammer },
  'Under Testing': { color: 'text-[#22A06B]', Icon: FileSearch },
  'Completed': { color: 'text-[#16A34A]', Icon: CheckCircle2 },
  'Rejected': { color: 'text-red-600', Icon: XCircle },
  'Cancelled': { color: 'text-red-600', Icon: XCircle },
  'New': { color: 'text-[#16834A]', Icon: Clock },
  'In Review': { color: 'text-amber-700', Icon: FileSearch },
  'Replied': { color: 'text-[#16A34A]', Icon: CheckCircle2 },
  'Archived': { color: 'text-[#64756B]', Icon: XCircle },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_STYLE_MAP[status] || { color: 'text-[#64756B]', Icon: Clock };
  const { Icon } = cfg;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${cfg.color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
}
