import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sotfaApi, adminApi, dataApi } from '../utils/api';
import {
  Plus,
  Ship,
  Calendar,
  Settings,
  CheckCircle,
  AlertCircle,
  Trash2,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

export default function Admin() {
  const queryClient = useQueryClient();
  const [showNewYearModal, setShowNewYearModal] = useState(false);
  const [showAddShipModal, setShowAddShipModal] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newDeadline, setNewDeadline] = useState('');

  // New ship form
  const [shipForm, setShipForm] = useState({
    shipName: '',
    coName: '',
    coCharacter: '',
    xoName: '',
    xoCharacter: '',
    imageUrl: '',
  });

  const { data: sotfaData, isLoading } = useQuery({
    queryKey: ['sotfa-current'],
    queryFn: () => sotfaApi.getCurrent(),
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard(),
  });

  const { data: shipsData } = useQuery({
    queryKey: ['available-ships'],
    queryFn: () => dataApi.getShips(),
  });

  const createYearMutation = useMutation({
    mutationFn: () => sotfaApi.createYear(newYear, newDeadline || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries(['sotfa-current']);
      queryClient.invalidateQueries(['admin-dashboard']);
      setShowNewYearModal(false);
    },
  });

  const addShipMutation = useMutation({
    mutationFn: () => sotfaApi.addShip(shipForm),
    onSuccess: () => {
      queryClient.invalidateQueries(['sotfa-current']);
      queryClient.invalidateQueries(['admin-dashboard']);
      setShowAddShipModal(false);
      setShipForm({
        shipName: '',
        coName: '',
        coCharacter: '',
        xoName: '',
        xoCharacter: '',
        imageUrl: '',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => adminApi.publish(),
    onSuccess: () => {
      queryClient.invalidateQueries(['sotfa-current']);
      queryClient.invalidateQueries(['admin-dashboard']);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const sotfa = sotfaData?.data;
  const dashboard = dashboardData?.data;
  const availableShips = shipsData?.data?.ships || [];

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-lcars-orange">Administration</h1>
          <p className="text-lcars-tan mt-1">Manage SOTFA configuration and settings</p>
        </div>
      </div>

      {/* Current Year Status */}
      {sotfa?.year ? (
        <div className="lcars-panel p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl text-lcars-tan mb-2">
                {sotfa.year.year} State of the Federation Address
              </h2>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded text-black ${
                  sotfa.year.status === 'published' ? 'bg-green-500' :
                  sotfa.year.status === 'review' ? 'bg-lcars-yellow' : 'bg-lcars-blue'
                }`}>
                  {sotfa.year.status.toUpperCase()}
                </span>
                {sotfa.year.deadline && (
                  <span className="text-gray-400">
                    Deadline: {format(new Date(sotfa.year.deadline), 'MMMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
            {sotfa.year.status !== 'published' && dashboard?.sectionStats?.approved === dashboard?.sectionStats?.total && (
              <button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isLoading}
                className="lcars-button flex items-center gap-2"
                style={{ backgroundColor: '#33cc33' }}
              >
                <CheckCircle size={16} />
                Publish SOTFA
              </button>
            )}
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Progress</span>
              <span className="text-lcars-orange font-bold">{sotfa.progress}%</span>
            </div>
            <div className="progress-bar h-3">
              <div className="progress-fill" style={{ width: `${sotfa.progress}%` }}></div>
            </div>
          </div>

          {/* Section Stats */}
          {dashboard?.sectionStats && (
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
              <StatCard label="Pending" value={dashboard.sectionStats.pending} color="gray-400" />
              <StatCard label="Draft" value={dashboard.sectionStats.draft} color="lcars-blue" />
              <StatCard label="Submitted" value={dashboard.sectionStats.submitted} color="lcars-yellow" />
              <StatCard label="Approved" value={dashboard.sectionStats.approved} color="green-400" />
            </div>
          )}
        </div>
      ) : (
        <div className="lcars-panel p-8 text-center mb-8">
          <Calendar size={48} className="mx-auto mb-4 text-lcars-orange opacity-50" />
          <h2 className="text-xl text-lcars-tan mb-2">No SOTFA Year Created</h2>
          <p className="text-gray-400 mb-6">Create a new year to start building the SOTFA.</p>
          <button
            onClick={() => setShowNewYearModal(true)}
            className="lcars-button flex items-center gap-2 mx-auto"
          >
            <Plus size={16} />
            Create New Year
          </button>
        </div>
      )}

      {/* Quick Actions */}
      {sotfa?.year && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => setShowAddShipModal(true)}
            className="lcars-panel p-6 text-left hover:border-lcars-orange transition-colors"
          >
            <Ship size={24} className="text-lcars-orange mb-3" />
            <h3 className="text-white font-semibold">Add Ship</h3>
            <p className="text-gray-400 text-sm mt-1">Add a new ship report section</p>
          </button>

          <a
            href="/users"
            className="lcars-panel p-6 text-left hover:border-lcars-blue transition-colors"
          >
            <Users size={24} className="text-lcars-blue mb-3" />
            <h3 className="text-white font-semibold">Manage Users</h3>
            <p className="text-gray-400 text-sm mt-1">Assign roles and permissions</p>
          </a>

          <div className="lcars-panel p-6">
            <Settings size={24} className="text-lcars-purple mb-3" />
            <h3 className="text-white font-semibold">Set Deadlines</h3>
            <p className="text-gray-400 text-sm mt-1">Configure section deadlines</p>
          </div>
        </div>
      )}

      {/* Ship Reports Overview */}
      {sotfa?.sections?.filter((s: any) => s.section_type === 'ship_report').length > 0 && (
        <div className="lcars-panel overflow-hidden mb-8">
          <div className="lcars-header px-4 py-2 text-black font-bold">
            Ship Reports
          </div>
          <div className="divide-y divide-gray-700">
            {sotfa.sections
              .filter((s: any) => s.section_type === 'ship_report')
              .map((section: any) => (
                <div key={section.id} className="p-4 flex items-center gap-4">
                  <Ship size={20} className="text-lcars-orange" />
                  <span className="flex-1 text-white">{section.title}</span>
                  <span className={`px-2 py-0.5 rounded text-black text-xs ${
                    section.status === 'approved' ? 'bg-green-500' :
                    section.status === 'submitted' ? 'bg-lcars-yellow' :
                    section.status === 'draft' ? 'bg-lcars-blue' : 'bg-gray-600'
                  }`}>
                    {section.status}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* New Year Modal */}
      {showNewYearModal && (
        <Modal onClose={() => setShowNewYearModal(false)}>
          <h2 className="text-xl text-lcars-tan mb-4">Create New SOTFA Year</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Year</label>
              <input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(parseInt(e.target.value))}
                className="lcars-input"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Overall Deadline (optional)</label>
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="lcars-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => createYearMutation.mutate()}
                disabled={createYearMutation.isLoading}
                className="lcars-button flex-1"
              >
                {createYearMutation.isLoading ? 'Creating...' : 'Create Year'}
              </button>
              <button
                onClick={() => setShowNewYearModal(false)}
                className="lcars-button lcars-button-secondary flex-1"
              >
                Cancel
              </button>
            </div>
            {createYearMutation.isError && (
              <p className="text-lcars-red text-sm">
                {(createYearMutation.error as any)?.response?.data?.error || 'Failed to create year'}
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Add Ship Modal */}
      {showAddShipModal && (
        <Modal onClose={() => setShowAddShipModal(false)}>
          <h2 className="text-xl text-lcars-tan mb-4">Add Ship Report</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Ship Name *</label>
              {availableShips.length > 0 ? (
                <select
                  value={shipForm.shipName}
                  onChange={(e) => setShipForm({ ...shipForm, shipName: e.target.value })}
                  className="lcars-input"
                >
                  <option value="">Select a ship...</option>
                  {availableShips.map((ship: string) => (
                    <option key={ship} value={ship}>{ship}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={shipForm.shipName}
                  onChange={(e) => setShipForm({ ...shipForm, shipName: e.target.value })}
                  placeholder="e.g., USS Khitomer"
                  className="lcars-input"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">CO Player Name</label>
                <input
                  type="text"
                  value={shipForm.coName}
                  onChange={(e) => setShipForm({ ...shipForm, coName: e.target.value })}
                  className="lcars-input"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">CO Character</label>
                <input
                  type="text"
                  value={shipForm.coCharacter}
                  onChange={(e) => setShipForm({ ...shipForm, coCharacter: e.target.value })}
                  className="lcars-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">XO Player Name</label>
                <input
                  type="text"
                  value={shipForm.xoName}
                  onChange={(e) => setShipForm({ ...shipForm, xoName: e.target.value })}
                  className="lcars-input"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">XO Character</label>
                <input
                  type="text"
                  value={shipForm.xoCharacter}
                  onChange={(e) => setShipForm({ ...shipForm, xoCharacter: e.target.value })}
                  className="lcars-input"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Image URL</label>
              <input
                type="text"
                value={shipForm.imageUrl}
                onChange={(e) => setShipForm({ ...shipForm, imageUrl: e.target.value })}
                placeholder="e.g., Khitomer.png"
                className="lcars-input"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => addShipMutation.mutate()}
                disabled={addShipMutation.isLoading || !shipForm.shipName}
                className="lcars-button flex-1"
              >
                {addShipMutation.isLoading ? 'Adding...' : 'Add Ship'}
              </button>
              <button
                onClick={() => setShowAddShipModal(false)}
                className="lcars-button lcars-button-secondary flex-1"
              >
                Cancel
              </button>
            </div>
            {addShipMutation.isError && (
              <p className="text-lcars-red text-sm">
                {(addShipMutation.error as any)?.response?.data?.error || 'Failed to add ship'}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold text-${color}`}>{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
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
