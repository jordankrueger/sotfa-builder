import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sotfaApi } from '../utils/api';
import {
  FileText,
  CheckCircle,
  Clock,
  Edit,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-gray-400', bgColor: 'bg-gray-600' },
  draft: { label: 'Draft', color: 'text-lcars-blue', bgColor: 'bg-lcars-blue' },
  submitted: { label: 'Submitted', color: 'text-lcars-yellow', bgColor: 'bg-lcars-yellow' },
  approved: { label: 'Approved', color: 'text-green-400', bgColor: 'bg-green-500' },
};

const sectionTypeLabels: Record<string, string> = {
  intro: 'Introduction',
  ec_report: 'EC Report',
  cc_report: 'CC Report',
  ship_report: 'Ship Report',
  simming_rates: 'Simming Stats',
  taskforces: 'Taskforces',
  looking_ahead: 'Looking Ahead',
};

export default function Sections() {
  const { canEdit } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['sotfa-current'],
    queryFn: () => sotfaApi.getCurrent(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const sections = data?.data?.sections || [];
  const year = data?.data?.year?.year;

  // Group sections by type
  const groupedSections = sections.reduce((acc: Record<string, any[]>, section: any) => {
    const type = section.section_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(section);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-lcars-orange">SOTFA Sections</h1>
          <p className="text-lcars-tan mt-1">{year} State of the Federation Address</p>
        </div>
      </div>

      {/* Legend */}
      <div className="lcars-panel p-4 mb-6 flex flex-wrap gap-4">
        {Object.entries(statusConfig).map(([key, { label, bgColor }]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${bgColor}`}></span>
            <span className="text-sm text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Sections by Type */}
      <div className="space-y-6">
        {Object.entries(groupedSections).map(([type, typeSections]) => (
          <div key={type} className="lcars-panel overflow-hidden">
            <div className="lcars-header px-4 py-2 text-black font-bold">
              {sectionTypeLabels[type] || type.toUpperCase()}
            </div>
            <div className="divide-y divide-gray-700">
              {(typeSections as any[]).map((section) => {
                const status = statusConfig[section.status] || statusConfig.pending;
                const userCanEdit = canEdit(section.section_type, section.section_key);

                return (
                  <Link
                    key={section.id}
                    to={`/sections/${section.id}`}
                    className="flex items-center p-4 hover:bg-lcars-orange/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText size={20} className={status.color} />
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{section.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span className={`px-2 py-0.5 rounded text-black ${status.bgColor}`}>
                            {status.label}
                          </span>
                          {section.deadline && (
                            <span className="text-gray-400 flex items-center gap-1">
                              <Clock size={14} />
                              Due: {format(new Date(section.deadline), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {userCanEdit && (
                        <span className="text-lcars-blue flex items-center gap-1 text-sm">
                          <Edit size={14} />
                          Edit
                        </span>
                      )}
                      {section.status === 'approved' && (
                        <CheckCircle size={20} className="text-green-400" />
                      )}
                      {section.status === 'submitted' && (
                        <AlertCircle size={20} className="text-lcars-yellow" />
                      )}
                      <ChevronRight size={20} className="text-gray-500" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {sections.length === 0 && (
        <div className="lcars-panel p-8 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-lcars-orange" />
          <p className="text-gray-400">No sections found. Create a new SOTFA year first.</p>
        </div>
      )}
    </div>
  );
}
