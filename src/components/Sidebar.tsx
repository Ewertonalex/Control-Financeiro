"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CreditCard, Info } from 'lucide-react';
import clsx from 'clsx';

const links = [
  { href: '/', label: 'Controle mensal', icon: Calendar },
  { href: '/cartoes', label: 'Cartões de crédito', icon: CreditCard },
  { href: '/sobre', label: 'Sobre o projeto', icon: Info },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col gap-4 border-r border-white/10 bg-card/60 backdrop-blur p-6">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary" />
          <div>
            <p className="font-semibold">Controle</p>
            <p className="text-xs text-muted">Financeiro</p>
          </div>
        </div>
        <nav className="mt-4 flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  active ? 'bg-white/10' : 'hover:bg-white/5'
                )}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
  );
}


