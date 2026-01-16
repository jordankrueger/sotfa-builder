import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sotfaApi, adminApi } from '../utils/api';
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Ship,
  Calendar,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const { data: sotfaData, isLoading } = useQuery({
    queryKey: ['sotfa-current'],
    queryFn: () => sotfaApi.getCurrent(),
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard(),
    enabled: isAdmin,
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

  // If no SOTFA year exists
  if (!sotfa?.year && isAdmin) {
    return (
      <div className="fade-in">
        <h1 className="text-3xl font-bold text-lcars-orange mb-8">Welcome to SOTFA Builder</h1>
        <div className="lcars-panel p-8 text-center">
          <Calendar size={48} className="mx-auto mb-4 text-lcars-orange" />
          <h2 className="text-xl text-lcars-tan mb-4">No SOTFA Year Created</h2>
          <p className="text-gray-400 mb-6">Create a new SOTFA year to get started.</p>
          <Link to="/admin" className="lcars-button">
            Go to Admin Panel
          </Link>
        </div>
      </div>
    );
  }

  const statusCounts = sotfa?.statusCounts || { pending: 0, draft: 0, submitted: 0, approved: 0 };
  const progress = sotfa?.progress || 0;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-lcars-orange">
          {sotfa?.year?.year} State of the Federation Address
        </h1>
        <p className="text-lcars-tan mt-2">
          Welcome back, {user?.displayName}
        </p>
      </div>

      {/* Progress Overview */}
      <div className="lcars-panel p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-lcars-tan">Overall Progress</h2>
          <span className="text-2xl font-bold text-lcars-orange">{progress}%</span>
        </div>
        <div className="progress-bar h-4">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <StatusCard
            label="Pending"
            count={statusCounts.pending}
            icon={Clock}
            color="text-gray-400"
          />
          <StatusCard
            label="In Draft"
            count={statusCounts.draft}
            icon={FileText}
            color="text-lcars-blue"
          />
          <StatusCard
            label="Submitted"
            count={statusCounts.submitted}
            icon={AlertTriangle}
            color="text-lcars-yellow"
          />
          <StatusCard
            label="Approved"
            count={statusCounts.approved}
            icon={CheckCircle}
            color="text-green-400"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <QuickActionCard
          title="View All Sections"
          description="See the status of all SOTFA sections"
          icon={FileText}
          to="/sections"
          color="lcars-orange"
        />
        <QuickActionCard
          title="Ship Reports"
          description="View and edit ship report submissions"
          icon={Ship}
          to="/ships"
          color="lcars-blue"
        />
        <QuickActionCard
          title="Generate Wiki Code"
          description="Preview and export MediaWiki code"
          icon={Sparkles}
          to="/generate"
          color="lcars-purple"
        />
      </div>

      {/* My Assignments (for non-admins) */}
      {!isAdmin && user?.shipAssignment && (
        <div className="lcars-panel p-6 mb-8">
          <h2 className="text-xl text-lcars-tan mb-4">My Assignment</h2>
          <div className="flex items-center gap-4">
            <Ship size={24} className="text-lcars-orange" />
            <div>
              <p className="text-white font-semibold">{user.shipAssignment}</p>
              <p className="text-gray-400 text-sm">Ship Report</p>
            </div>
            <Link
              to="/ships"
              className="ml-auto lcars-button lcars-button-secondary"
            >
              Edit Report
            </Link>
          </div>
        </div>
      )}

      {/* Admin Stats */}
      {isAdmin && dashboard && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="lcars-panel p-6">
            <h2 className="text-xl text-lcars-tan mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {dashboard.recentActivity?.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <TrendingUp size={16} className="text-lcars-orange mt-0.5" />
                  <div>
                    <p className="text-white">{activity.action}</p>
                    <p className="text-gray-500">
                      {activity.details && `${activity.details} • `}
                      {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
              {(!dashboard.recentActivity || dashboard.recentActivity.length === 0) && (
                <p className="text-gray-500">No recent activity</p>
              )}
            </div>
          </div>

          {/* Overdue Sections */}
          <div className="lcars-panel p-6">
            <h2 className="text-xl text-lcars-tan mb-4">Attention Required</h2>
            {dashboard.overdueSections?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.overdueSections.map((section: any) => (
                  <div key={section.id} className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-lcars-red" />
                    <div className="flex-1">
                      <p className="text-white">{section.title}</p>
                      <p className="text-lcars-red text-sm">
                        Overdue: {format(new Date(section.deadline), 'MMM d')}
                      </p>
                    </div>
                    <Link
                      to={`/sections/${section.id}`}
                      className="text-lcars-blue hover:underline text-sm"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-green-400 flex items-center gap-2">
                <CheckCircle size={16} />
                All sections on track
              </p>
            )}

            {/* AI Usage */}
            {dashboard.aiUsage && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h3 className="text-lcars-tan mb-2">AI Usage Today</h3>
                <p className="text-white">
                  {dashboard.aiUsage.requests || 0} requests •{' '}
                  {Math.round((dashboard.aiUsage.tokens || 0) / 1000)}k tokens
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({ label, count, icon: Icon, color }: {
  label: string;
  count: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={24} className={color} />
      <div>
        <p className="text-2xl font-bold text-white">{count}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, icon: Icon, to, color }: {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  to: string;
  color: string;
}) {
  return (
    <Link to={to} className="lcars-panel p-6 hover:border-lcars-orange transition-colors group">
      <Icon size={32} className={`text-${color} mb-4 group-hover:scale-110 transition-transform`} />
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </Link>
  );
}
