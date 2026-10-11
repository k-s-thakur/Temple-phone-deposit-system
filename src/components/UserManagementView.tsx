import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Role } from '../types';
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Phone,
  Clock,
  AlertCircle
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New User Form Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>('DEPOSIT_OPERATOR');
  const [newPassword, setNewPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Reset Password Modal
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newDisplayName.trim() || !newPassword) {
      alert('Please fill out all required fields.');
      return;
    }

    setCreateLoading(true);
    try {
      await api.createUser({
        username: newUsername.trim(),
        display_name: newDisplayName.trim(),
        phone_number: newPhone.trim(),
        role: newRole,
        password: newPassword
      });

      setCreateModalOpen(false);
      setNewUsername('');
      setNewDisplayName('');
      setNewPhone('');
      setNewPassword('');
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'User creation failed.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} user @${user.username}?`)) {
      return;
    }

    try {
      await api.updateUserStatus(user.user_id, !user.active);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetNewPass || resetNewPass.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    setResetLoading(true);
    try {
      await api.resetPassword(resetTargetUser.user_id, resetNewPass);
      alert(`Password updated successfully for @${resetTargetUser.username}.`);
      setResetTargetUser(null);
      setResetNewPass('');
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Password reset failed.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            Staff User Accounts Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage individual staff logins, role assignments, and security status (Admin only)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchUsers}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Staff Account</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3">Staff Member</th>
                <th className="px-6 py-3">Username</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Contact Phone</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Last Login</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3.5 font-semibold text-slate-900">
                    <div>{u.display_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{u.user_id}</div>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-slate-700">
                    @{u.username}
                  </td>
                  <td className="px-6 py-3.5">
                    {u.role === 'ADMIN' && (
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 font-semibold px-2 py-0.5 rounded text-[11px]">
                        Admin
                      </span>
                    )}
                    {u.role === 'DEPOSIT_OPERATOR' && (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold px-2 py-0.5 rounded text-[11px]">
                        Deposit Operator
                      </span>
                    )}
                    {u.role === 'RETRIEVAL_OPERATOR' && (
                      <span className="bg-sky-100 text-sky-800 border border-sky-300 font-semibold px-2 py-0.5 rounded text-[11px]">
                        Retrieval Operator
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 font-mono text-slate-600">
                    {u.phone_number || '—'}
                  </td>
                  <td className="px-6 py-3.5">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                        <XCircle className="w-3.5 h-3.5" />
                        Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 text-[11px]">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                  </td>
                  <td className="px-6 py-3.5 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setResetTargetUser(u)}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Reset Password"
                    >
                      Reset Pass
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                        u.active
                          ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
                          : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-scale-up">
            <h4 className="font-bold text-base text-slate-900 mb-1">Create New Staff Account</h4>
            <p className="text-xs text-slate-500 mb-4">
              Individual logins required by PRD Section 3.4. Shared accounts are strictly prohibited.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Display Name (Full Name)</label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Suresh Patel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. suresh_p"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Assignment</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="DEPOSIT_OPERATOR">Deposit Operator (Intake only)</option>
                  <option value="RETRIEVAL_OPERATOR">Retrieval Operator (Return only)</option>
                  <option value="ADMIN">Administrator (Full control)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Staff Phone Number (Admin Contact)</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {createLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 animate-scale-up">
            <h4 className="font-bold text-base text-slate-900 mb-1">Reset Password</h4>
            <p className="text-xs text-slate-500 mb-4">
              Enter a new secure password for <strong>@{resetTargetUser.username}</strong> ({resetTargetUser.display_name}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  placeholder="Enter new password (min 6 chars)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {resetLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
