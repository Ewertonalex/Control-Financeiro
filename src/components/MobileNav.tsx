"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CreditCard, Info, Menu } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

const links = [
  { href: '/', label: 'Controle mensal', icon: Calendar },
  { href: '/cartoes', label: 'Cartões de crédito', icon: CreditCard },
  { href: '/sobre', label: 'Sobre o projeto', icon: Info },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden sticky top-0 z-40 border-b border-white/10 bg-card/60 backdrop-blur">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-primary" />
          <span className="text-sm font-semibold">Controle Financeiro</span>
        </div>
        <button className="btn-outline px-3 py-2" onClick={() => setOpen(v => !v)} aria-label="Abrir menu">
          <Menu className="size-4" />
        </button>
      </div>
      {open && (
        <nav className="px-2 pb-3 flex flex-col gap-1">
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
                onClick={() => setOpen(false)}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}


