import React from 'react';
import { AuthSession, Role } from '../types';
import {
  Smartphone,
  LogOut,
  Settings,
  Shield,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Users,
  Database,
  FileText,
  Clock
} from 'lucide-react';

interface NavbarProps {
  session: AuthSession | null;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  currentTab,
  onSelectTab,
  onOpenSettings,
  onLogout
}) => {
  if (!session) return null;

  const role = session.user.role;

  const getRoleBadge = (r: Role) => {
    switch (r) {
      case 'ADMIN':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">Admin</span>;
      case 'DEPOSIT_OPERATOR':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">Deposit Operator</span>;
      case 'RETRIEVAL_OPERATOR':
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">Retrieval Operator</span>;
    }
  };

  const navItems = [
    ...(role === 'ADMIN' ? [{ id: 'dashboard', label: 'Dashboard', icon: Layers }] : []),
    ...(role === 'ADMIN' || role === 'DEPOSIT_OPERATOR' ? [{ id: 'deposit', label: 'Deposit Phone', icon: ArrowDownLeft }] : []),
    ...(role === 'ADMIN' || role === 'RETRIEVAL_OPERATOR' ? [{ id: 'retrieval', label: 'Retrieve Phone', icon: ArrowUpRight }] : []),
    { id: 'history', label: 'Transactions', icon: History },
    ...(role === 'ADMIN' ? [
      { id: 'shift_closing', label: 'Shift Closing', icon: Clock },
      { id: 'users', label: 'Staff Users', icon: Users },
      { id: 'tokens', label: 'Tokens Inventory', icon: Database },
      { id: 'audit', label: 'Audit Logs', icon: FileText }
    ] : [])
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Temple Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">Temple Phone Vault</span>
                <span className="hidden sm:inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-md border border-slate-200">v1.2</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Visitor Phone Deposit & Retrieval Counter</p>
            </div>
          </div>

          {/* User profile & Global Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-900 leading-tight">{session.user.display_name}</div>
              <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                {getRoleBadge(role)}
                <span className="text-xs text-slate-400">@{session.user.username}</span>
              </div>
            </div>

            <button
              onClick={onOpenSettings}
              title="System Backend Settings"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="flex items-center space-x-1 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
