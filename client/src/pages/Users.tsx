import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, authApi } from '../utils/api';
import {
  Users as UsersIcon,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Ship,
  FileText,
  Eye,
  CheckCircle
} from 'lucide-react';

const roleConfig = {
  admin: { label: 'Administrator', color: 'bg-lcars-orange', icon: Shield },
  ship_contributor: { label: 'Ship Contributor', color: 'bg-lcars-blue', icon: Ship },
  taskforce_lead: { label: 'Taskforce Lead', color: 'bg-lcars-purple', icon: FileText },
  reviewer: { label: 'Reviewer', color: 'bg-gray-600', icon: Eye },
};

export default function Users() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // New user form
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    displayName: '',
    role: 'ship_contributor',
    shipAssignment: '',
    taskforceAssignment: '',
    wikiUsername: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => adminApi.getUsers(),
  });

  const registerMutation = useMutation({
    mutationFn: () => authApi.register(userForm),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowAddModal(false);
      setUserForm({
        username: '',
        email: '',
        password: '',
        displayName: '',
        role: 'ship_contributor',
        shipAssignment: '',
        taskforceAssignment: '',
        wikiUsername: '',
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (data: { id: number; role: string; shipAssignment?: string; taskforceAssignment?: string }) =>
      adminApi.updateUserRole(data.id, {
        role: data.role,
        shipAssignment: data.shipAssignment,
        taskforceAssignment: data.taskforceAssignment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const users = data?.data?.users || [];

  // Group users by role
  const usersByRole = users.reduce((acc: Record<string, any[]>, user: any) => {
    const role = user.role || 'other';
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-lcars-orange">User Management</h1>
          <p className="text-lcars-tan mt-1">Manage SOTFA contributors and permissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="lcars-button flex items-center gap-2"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {/* Role Legend */}
      <div className="lcars-panel p-4 mb-6 flex flex-wrap gap-4">
        {Object.entries(roleConfig).map(([key, { label, color }]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${color}`}></span>
            <span className="text-sm text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Users by Role */}
      <div className="space-y-6">
        {Object.entries(roleConfig).map(([role, config]) => {
          const roleUsers = usersByRole[role] || [];
          if (roleUsers.length === 0) return null;

          const Icon = config.icon;

          return (
            <div key={role} className="lcars-panel overflow-hidden">
              <div className={`${config.color} px-4 py-2 text-black font-bold flex items-center gap-2`}>
                <Icon size={18} />
                {config.label}s ({roleUsers.length})
              </div>
              <div className="divide-y divide-gray-700">
                {roleUsers.map((user: any) => (
                  <div key={user.id} className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-white font-medium">{user.display_name}</p>
                      <p className="text-gray-400 text-sm">{user.username} • {user.email}</p>
                      {user.ship_assignment && (
                        <p className="text-lcars-blue text-sm mt-1">Ship: {user.ship_assignment}</p>
                      )}
                      {user.taskforce_assignment && (
                        <p className="text-lcars-purple text-sm mt-1">Taskforce: {user.taskforce_assignment}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 text-lcars-blue hover:text-lcars-purple transition-colors"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete user ${user.display_name}?`)) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                        className="p-2 text-lcars-red hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="lcars-panel p-8 text-center">
          <UsersIcon size={48} className="mx-auto mb-4 text-lcars-orange opacity-50" />
          <p className="text-gray-400">No users found. Add the first user to get started.</p>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <h2 className="text-xl text-lcars-tan mb-4">Add New User</h2>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Username *</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="lcars-input"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Display Name *</label>
                <input
                  type="text"
                  value={userForm.displayName}
                  onChange={(e) => setUserForm({ ...userForm, displayName: e.target.value })}
                  className="lcars-input"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Email *</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className="lcars-input"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Password *</label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="lcars-input"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Role *</label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="lcars-input"
              >
                {Object.entries(roleConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            {userForm.role === 'ship_contributor' && (
              <div>
                <label className="block text-gray-400 text-sm mb-1">Ship Assignment</label>
                <input
                  type="text"
                  value={userForm.shipAssignment}
                  onChange={(e) => setUserForm({ ...userForm, shipAssignment: e.target.value })}
                  placeholder="e.g., USS Khitomer"
                  className="lcars-input"
                />
              </div>
            )}
            {userForm.role === 'taskforce_lead' && (
              <div>
                <label className="block text-gray-400 text-sm mb-1">Taskforce Assignment</label>
                <input
                  type="text"
                  value={userForm.taskforceAssignment}
                  onChange={(e) => setUserForm({ ...userForm, taskforceAssignment: e.target.value })}
                  placeholder="e.g., Training Team"
                  className="lcars-input"
                />
              </div>
            )}
            <div>
              <label className="block text-gray-400 text-sm mb-1">Wiki Username</label>
              <input
                type="text"
                value={userForm.wikiUsername}
                onChange={(e) => setUserForm({ ...userForm, wikiUsername: e.target.value })}
                className="lcars-input"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4 mt-4 border-t border-gray-700">
            <button
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isLoading || !userForm.username || !userForm.email || !userForm.password}
              className="lcars-button flex-1"
            >
              {registerMutation.isLoading ? 'Creating...' : 'Create User'}
            </button>
            <button
              onClick={() => setShowAddModal(false)}
              className="lcars-button lcars-button-secondary flex-1"
            >
              Cancel
            </button>
          </div>
          {registerMutation.isError && (
            <p className="text-lcars-red text-sm mt-2">
              {(registerMutation.error as any)?.response?.data?.error || 'Failed to create user'}
            </p>
          )}
        </Modal>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Modal onClose={() => setEditingUser(null)}>
          <h2 className="text-xl text-lcars-tan mb-4">Edit User: {editingUser.display_name}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Role</label>
              <select
                value={editingUser.role}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                className="lcars-input"
              >
                {Object.entries(roleConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            {editingUser.role === 'ship_contributor' && (
              <div>
                <label className="block text-gray-400 text-sm mb-1">Ship Assignment</label>
                <input
                  type="text"
                  value={editingUser.ship_assignment || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, ship_assignment: e.target.value })}
                  placeholder="e.g., USS Khitomer"
                  className="lcars-input"
                />
              </div>
            )}
            {editingUser.role === 'taskforce_lead' && (
              <div>
                <label className="block text-gray-400 text-sm mb-1">Taskforce Assignment</label>
                <input
                  type="text"
                  value={editingUser.taskforce_assignment || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, taskforce_assignment: e.target.value })}
                  placeholder="e.g., Training Team"
                  className="lcars-input"
                />
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-4 mt-4 border-t border-gray-700">
            <button
              onClick={() => updateRoleMutation.mutate({
                id: editingUser.id,
                role: editingUser.role,
                shipAssignment: editingUser.ship_assignment,
                taskforceAssignment: editingUser.taskforce_assignment,
              })}
              disabled={updateRoleMutation.isLoading}
              className="lcars-button flex-1"
            >
              {updateRoleMutation.isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditingUser(null)}
              className="lcars-button lcars-button-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="lcars-panel p-6 max-w-md w-full">
        {children}
      </div>
    </div>
  );
}
