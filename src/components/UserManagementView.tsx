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
      setError(err.message || 'स्टाफ खाते लोड करने में विफल।');
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
      alert('कृपया सभी आवश्यक फ़ील्ड भरें।');
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
      alert(err.message || 'स्टाफ खाता निर्माण असफल रहा।');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.active ? 'निष्क्रिय' : 'सक्रिय';
    if (!confirm(`क्या आप वाकई यूज़र @${user.username} को ${action} करना चाहते हैं?`)) {
      return;
    }

    try {
      await api.updateUserStatus(user.user_id, !user.active);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'खाता स्थिति अपडेट करने में विफल।');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetNewPass || resetNewPass.length < 6) {
      alert('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।');
      return;
    }

    setResetLoading(true);
    try {
      await api.resetPassword(resetTargetUser.user_id, resetNewPass);
      alert(`यूज़र @${resetTargetUser.username} का पासवर्ड सफलतापूर्वक अपडेट कर दिया गया।`);
      setResetTargetUser(null);
      setResetNewPass('');
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'पासवर्ड रीसेट असफल रहा।');
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
            स्टाफ व ऑपरेटर खाता प्रबंधन
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            स्टाफ लॉगिन, भूमिका आवंटन और सुरक्षा स्थिति का प्रबंधन (केवल व्यवस्थापक)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchUsers}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>रीफ्रेश करें</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>नया स्टाफ खाता बनाएं</span>
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
                <th className="px-6 py-3">स्टाफ सदस्य</th>
                <th className="px-6 py-3">यूज़रनेम</th>
                <th className="px-6 py-3">भूमिका (Role)</th>
                <th className="px-6 py-3">संपर्क मोबाइल</th>
                <th className="px-6 py-3">खाता स्थिति</th>
                <th className="px-6 py-3">अंतिम लॉगिन</th>
                <th className="px-6 py-3 text-right">कार्रवाई</th>
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
                        व्यवस्थापक (Admin)
                      </span>
                    )}
                    {u.role === 'DEPOSIT_OPERATOR' && (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold px-2 py-0.5 rounded text-[11px]">
                        जमा ऑपरेटर
                      </span>
                    )}
                    {u.role === 'RETRIEVAL_OPERATOR' && (
                      <span className="bg-sky-100 text-sky-800 border border-sky-300 font-semibold px-2 py-0.5 rounded text-[11px]">
                        वापसी ऑपरेटर
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
                        सक्रिय
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                        <XCircle className="w-3.5 h-3.5" />
                        निष्क्रिय
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 text-[11px]">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString('hi-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'कभी नहीं'}
                  </td>
                  <td className="px-6 py-3.5 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setResetTargetUser(u)}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="पासवर्ड रीसेट करें"
                    >
                      पासवर्ड रीसेट
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                        u.active
                          ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
                          : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {u.active ? 'निष्क्रिय करें' : 'सक्रिय करें'}
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
            <h4 className="font-bold text-base text-slate-900 mb-1">नया स्टाफ खाता बनाएं</h4>
            <p className="text-xs text-slate-500 mb-4">
              प्रत्येक स्टाफ सदस्य के लिए अलग लॉगिन आवश्यक है। साझा खाता सख्त प्रतिबंधित है।
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">नाम (पूरा नाम) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="उदा. सुरेश पटेल"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">यूज़रनेम (लॉगिन आईडी) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="उदा. suresh_p"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">भूमिका (Role) आवंटन</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="DEPOSIT_OPERATOR">जमा ऑपरेटर (केवल फोन जमा काउंटर)</option>
                  <option value="RETRIEVAL_OPERATOR">वापसी ऑपरेटर (केवल फोन वापसी काउंटर)</option>
                  <option value="ADMIN">व्यवस्थापक / Admin (पूर्ण नियंत्रण)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">स्टाफ संपर्क मोबाइल नंबर</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="उदा. 9876543210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">प्रारंभिक पासवर्ड <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="न्यूनतम 6 अक्षर..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {createLoading ? 'खाता बनाया जा रहा है...' : 'खाता बनाएं'}
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
            <h4 className="font-bold text-base text-slate-900 mb-1">पासवर्ड रीसेट करें</h4>
            <p className="text-xs text-slate-500 mb-4">
              यूज़र <strong>@{resetTargetUser.username}</strong> ({resetTargetUser.display_name}) के लिए नया पासवर्ड दर्ज करें।
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">नया पासवर्ड <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  required
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  placeholder="नया पासवर्ड दर्ज करें (न्यूनतम 6 अक्षर)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {resetLoading ? 'अपडेट हो रहा है...' : 'पासवर्ड अपडेट करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
