import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    TODO: 'bg-secondary text-secondary-foreground',
    IN_PROGRESS: 'bg-orange-50 text-orange-700',
    DONE: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <Badge
      variant="secondary"
      className={cn('border-0 px-2 py-1 text-[10px]', styles[status])}
    >
      {statusLabel(status)}
    </Badge>
  );
}

export { StatusBadge };
