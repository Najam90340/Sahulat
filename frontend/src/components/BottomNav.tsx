'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

const NAV_ITEMS = [
  { href: '/',        icon: '🏠', labelKey: 'hero_post_rfq' as const,   label: 'Home'     },
  { href: '/rfq',     icon: '📋', labelKey: 'nav_rfqs' as const,        label: 'RFQs'     },
  { href: '/pools',   icon: '🤝', labelKey: 'nav_pools' as const,       label: 'Pools'    },
  { href: '/chat',    icon: '💬', labelKey: 'nav_messages' as const,    label: 'Chat'     },
  { href: '/rfq/new', icon: '➕', labelKey: 'nav_post_rfq' as const,    label: 'Post'     },
];

export default function BottomNav() {
  const { t } = useLanguage();
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
