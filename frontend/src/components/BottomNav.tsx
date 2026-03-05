'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/',        icon: '🏠', label: 'Home'  },
  { href: '/rfq',     icon: '📋', label: 'RFQs'  },
  { href: '/pools',   icon: '🤝', label: 'Pools' },
  { href: '/chat',    icon: '💬', label: 'Chat'  },
  { href: '/rfq/new', icon: '➕', label: 'Post'  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Mobile bottom navigation">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
