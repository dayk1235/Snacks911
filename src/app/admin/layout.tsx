'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/orders', label: 'Pedidos', icon: '📦' },
  { href: '/admin/products', label: 'Productos', icon: '🍗' },
  { href: '/admin/pos', label: 'P. de Venta', icon: '💻' },
  { href: '/admin/cash', label: 'Caja', icon: '💰' },
  { href: '/admin/sales', label: 'Ventas', icon: '📈' },
  { href: '/admin/staff', label: 'Personal', icon: '👥' },
  { href: '/admin/settings', label: 'Configuración', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#080808] text-white font-sans selection:bg-orange-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col sticky top-0 h-screen z-50 shrink-0">
        <div className="p-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-orange-600/20">
              🚨
            </div>
            <div>
              <div className="font-black text-lg tracking-tighter leading-none">
                SNACKS <span className="text-orange-600">911</span>
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-orange-600/10 text-orange-500 border border-orange-500/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full p-3 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-xl transition-all duration-200 text-sm font-semibold border border-transparent hover:border-red-500/20"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#080808]">
        <header className="h-16 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
           <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">
             {pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Overview'}
           </div>
           <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-500">
               A
             </div>
           </div>
        </header>

        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
