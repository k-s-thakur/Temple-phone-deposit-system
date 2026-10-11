import React, { useState, useEffect } from 'react';
import { AuthSession } from './types';
import { getSavedSession, clearSession } from './services/api';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { DepositView } from './components/DepositView';
import { RetrievalView } from './components/RetrievalView';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { UserManagementView } from './components/UserManagementView';
import { TokenInventoryView } from './components/TokenInventoryView';
import { AuditLogView } from './components/AuditLogView';
import { ShiftClosingView } from './components/ShiftClosingView';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('deposit');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    const saved = getSavedSession();
    if (saved) {
      setSession(saved);
      // Set default tab based on role
      if (saved.user.role === 'ADMIN') {
        setCurrentTab('dashboard');
      } else if (saved.user.role === 'DEPOSIT_OPERATOR') {
        setCurrentTab('deposit');
      } else if (saved.user.role === 'RETRIEVAL_OPERATOR') {
        setCurrentTab('retrieval');
      }
    }
  }, []);

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession(newSession);
    if (newSession.user.role === 'ADMIN') {
      setCurrentTab('dashboard');
    } else if (newSession.user.role === 'DEPOSIT_OPERATOR') {
      setCurrentTab('deposit');
    } else {
      setCurrentTab('retrieval');
    }
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  const triggerDataRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!session) {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onConfigChanged={triggerDataRefresh}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        session={session}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-16" key={refreshKey}>
        {currentTab === 'dashboard' && session.user.role === 'ADMIN' && (
          <DashboardView onNavigateToTab={setCurrentTab} />
        )}

        {currentTab === 'deposit' && (
          <DepositView onSuccessDeposit={triggerDataRefresh} />
        )}

        {currentTab === 'retrieval' && (
          <RetrievalView onSuccessReturn={triggerDataRefresh} />
        )}

        {currentTab === 'history' && (
          <HistoryView userRole={session.user.role} />
        )}

        {currentTab === 'shift_closing' && session.user.role === 'ADMIN' && (
          <ShiftClosingView />
        )}

        {currentTab === 'users' && session.user.role === 'ADMIN' && (
          <UserManagementView />
        )}

        {currentTab === 'tokens' && session.user.role === 'ADMIN' && (
          <TokenInventoryView />
        )}

        {currentTab === 'audit' && session.user.role === 'ADMIN' && (
          <AuditLogView />
        )}
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConfigChanged={triggerDataRefresh}
      />
    </div>
  );
};

export default App;
