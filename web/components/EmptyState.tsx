import Link from 'next/link';
import { Icon, type IconName } from './Icons';

export function EmptyState({
  icon = 'leaf',
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action ? (
        <Link href={action.href} className="btn btn-primary btn-sm">
          <Icon name="plus" size={16} />
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
