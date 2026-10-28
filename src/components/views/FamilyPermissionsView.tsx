import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { User, UserRole, UserPermissions } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import {
  ShieldCheck,
  Plus,
  User as UserIcon,
  Phone,
  Mail,
  Lock,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  KeyRound,
} from 'lucide-react';
import { formatDate } from '../../lib/utils.ts';

export const FamilyPermissionsView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('family');
  const [relation, setRelation] = useState('');
  const [permissions, setPermissions] = useState<UserPermissions>({
    canEditBudget: false,
    canManageVendors: false,
    canManageTasks: true,
    canManageGuests: true,
    canEditEvents: false,
    canManageUsers: false,
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const list = await api.getUsers();
      setUsers(list);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim() || !password) {
      alert('Name, mobile number, and password are required.');
      return;
    }

    try {
      await api.addUser({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        password,
        role,
        relation: relation.trim() || 'Family Member',
        permissions,
      });

      alert(`Account created for ${name}! They can now log in using mobile ${mobile}.`);
      setIsAddingUser(false);
      setName('');
      setMobile('');
      setEmail('');
      setPassword('');
      setRelation('');
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleUpdatePermissions = async (targetUser: User, updatedPerms: Partial<UserPermissions>) => {
    try {
      const newPerms = { ...targetUser.permissions, ...updatedPerms };
      await api.updateUser(targetUser.id, { permissions: newPerms });
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, permissions: newPerms } : u));
    } catch (err: any) {
      alert(err.message || 'Failed to update permissions');
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (confirm(`Remove account for "${u.name}" (${u.relation || u.role})?`)) {
      try {
        await api.deleteUser(u.id);
        setUsers(prev => prev.filter(item => item.id !== u.id));
      } catch (err: any) {
        alert(err.message || 'Failed to delete user');
      }
    }
  };

  const handleResetPassword = async (u: User) => {
    const newPass = prompt(`Enter new password for ${u.name} (minimum 6 characters):`);
    if (!newPass || newPass.trim().length < 6) {
      if (newPass) alert('Password must be at least 6 characters.');
      return;
    }

    try {
      await api.updateUser(u.id, { password: newPass.trim() });
      alert(`Password updated successfully for ${u.name}.`);
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C6D34] uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>Role-Based Access Control</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#2D2422]">
            Family Members & Access Permissions
          </h2>
          <p className="text-xs text-[#7A6B68]">
            Invite family members, assign roles, define granular permissions, and securely manage credentials
          </p>
        </div>

        <button
          onClick={() => setIsAddingUser(!isAddingUser)}
          className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Family Member</span>
        </button>
      </div>

      {/* Invite Member Drawer Form */}
      {isAddingUser && (
        <form
          onSubmit={handleCreateUser}
          className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-sm space-y-4 max-w-2xl"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2]">
            <h3 className="font-serif font-bold text-base text-[#2D2422]">
              Register New Family Member
            </h3>
            <button
              type="button"
              onClick={() => setIsAddingUser(false)}
              className="text-xs text-[#7A6B68] hover:text-[#2D2422]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Verma"
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Mobile Number (Login ID) *</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9811002233"
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              >
                <option value="family">Family Member</option>
                <option value="groom">Groom</option>
                <option value="bride">Bride</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Relation / Title</label>
              <input
                type="text"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="e.g. Bride's Brother"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Initial Password *</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 chars"
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>
          </div>

          {/* Granular Permissions Checkboxes */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EFE8DD] space-y-2">
            <div className="text-xs font-semibold text-[#8C6D34]">
              Granular Role Permissions:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canEditBudget}
                  onChange={(e) => setPermissions({ ...permissions, canEditBudget: e.target.checked })}
                  className="accent-[#D4AF37]"
                />
                <span>Can Edit Budgets & Log Expenses</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canManageVendors}
                  onChange={(e) => setPermissions({ ...permissions, canManageVendors: e.target.checked })}
                  className="accent-[#D4AF37]"
                />
                <span>Can Manage Vendors & Contracts</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canManageTasks}
                  onChange={(e) => setPermissions({ ...permissions, canManageTasks: e.target.checked })}
                  className="accent-[#D4AF37]"
                />
                <span>Can Manage & Complete Tasks</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canManageGuests}
                  onChange={(e) => setPermissions({ ...permissions, canManageGuests: e.target.checked })}
                  className="accent-[#D4AF37]"
                />
                <span>Can Manage Guests & Send Invites</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.canEditEvents}
                  onChange={(e) => setPermissions({ ...permissions, canEditEvents: e.target.checked })}
                  className="accent-[#D4AF37]"
                />
                <span>Can Edit Ceremonies & Dates</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingUser(false)}
              className="py-2 px-4 rounded-xl border border-[#E5DFD7] text-xs font-medium text-[#5C4E4B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105"
            >
              Create Account
            </button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF5EB] border-b border-[#E8DEC8] text-[#5C4E4B] font-semibold">
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Contact (Login ID)</th>
                <th className="py-3 px-4">Relation / Title</th>
                <th className="py-3 px-4">Budget Access</th>
                <th className="py-3 px-4">Vendor Access</th>
                <th className="py-3 px-4">Guest Access</th>
                <th className="py-3 px-4">Tasks Access</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DD]">
              {users.map(u => {
                const isAdmin = u.role === 'admin';
                const isGroomOrBride = u.role === 'groom' || u.role === 'bride';
                return (
                  <tr key={u.id} className="hover:bg-[#FAF8F5]/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#2D2422] flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {u.id === currentUser?.id && (
                          <span className="text-[10px] text-[#B38F4D]">(You)</span>
                        )}
                      </div>
                      <span className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                        isAdmin
                          ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                          : isGroomOrBride
                          ? 'bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]'
                          : 'bg-[#F3F4F6] text-[#4B5563]'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#5C4E4B]">
                      <div>{u.mobile}</div>
                      {u.email && <div className="text-[10px] text-[#8C7E7A] truncate">{u.email}</div>}
                    </td>

                    <td className="py-3.5 px-4 text-[#5C4E4B]">
                      {u.relation || '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isAdmin || isGroomOrBride || !!u.permissions?.canEditBudget}
                        disabled={isAdmin || isGroomOrBride}
                        onChange={(e) => handleUpdatePermissions(u, { canEditBudget: e.target.checked })}
                        className="accent-[#D4AF37] cursor-pointer disabled:opacity-50"
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isAdmin || isGroomOrBride || !!u.permissions?.canManageVendors}
                        disabled={isAdmin || isGroomOrBride}
                        onChange={(e) => handleUpdatePermissions(u, { canManageVendors: e.target.checked })}
                        className="accent-[#D4AF37] cursor-pointer disabled:opacity-50"
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isAdmin || isGroomOrBride || !!u.permissions?.canManageGuests}
                        disabled={isAdmin || isGroomOrBride}
                        onChange={(e) => handleUpdatePermissions(u, { canManageGuests: e.target.checked })}
                        className="accent-[#D4AF37] cursor-pointer disabled:opacity-50"
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isAdmin || isGroomOrBride || !!u.permissions?.canManageTasks}
                        disabled={isAdmin || isGroomOrBride}
                        onChange={(e) => handleUpdatePermissions(u, { canManageTasks: e.target.checked })}
                        className="accent-[#D4AF37] cursor-pointer disabled:opacity-50"
                      />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="p-1 rounded text-[#8C6D34] hover:bg-[#FAF5EB]"
                          title="Reset password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser?.id && (u as any).username !== 'voyaramedia' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 rounded text-[#7A6B68] hover:text-[#A63A50] hover:bg-[#FDF2F4]"
                            title="Remove account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
