import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { sotfaApi, aiApi, dataApi } from '../utils/api';
import {
  Ship,
  User,
  Image,
  Save,
  Send,
  Sparkles,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle
} from 'lucide-react';

interface ShipReport {
  id: number;
  section_id: number;
  ship_name: string;
  co_name: string;
  co_character: string;
  xo_name: string;
  xo_character: string;
  image_url: string;
  summary: string;
  highlights: string;
  missions: string;
  ooc_notes: string;
}

export default function ShipReports() {
  const { canEdit, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [expandedShip, setExpandedShip] = useState<number | null>(null);
  const [editingReport, setEditingReport] = useState<ShipReport | null>(null);
  const [monthlySummaries, setMonthlySummaries] = useState<string[]>(Array(12).fill(''));

  const { data: sotfaData, isLoading } = useQuery({
    queryKey: ['sotfa-current'],
    queryFn: () => sotfaApi.getCurrent(),
  });

  const shipSections = sotfaData?.data?.sections?.filter(
    (s: any) => s.section_type === 'ship_report'
  ) || [];

  const shipReportsQuery = useQuery({
    queryKey: ['ship-reports'],
    queryFn: async () => {
      const reports: Record<number, any> = {};
      for (const section of shipSections) {
        const response = await sotfaApi.getSection(section.id);
        if (response.data.shipReport) {
          reports[section.id] = response.data.shipReport;
        }
      }
      return reports;
    },
    enabled: shipSections.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { sectionId: number; report: Partial<ShipReport> }) => {
      return sotfaApi.updateSection(data.sectionId, {
        content: data.report.summary,
        status: 'draft',
        shipReport: data.report,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ship-reports']);
      queryClient.invalidateQueries(['sotfa-current']);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (sectionId: number) => sotfaApi.submitSection(sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['ship-reports']);
      queryClient.invalidateQueries(['sotfa-current']);
    },
  });

  const aiSummaryMutation = useMutation({
    mutationFn: async (shipName: string) => {
      const nonEmptySummaries = monthlySummaries.filter(s => s.trim());
      if (nonEmptySummaries.length === 0) {
        throw new Error('Please enter at least one monthly summary');
      }
      return aiApi.generateShipSummary({
        shipName,
        monthlySummaries: nonEmptySummaries,
        existingContent: editingReport?.summary,
      });
    },
    onSuccess: (res) => {
      if (editingReport) {
        setEditingReport({ ...editingReport, summary: res.data.summary });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const shipReports = shipReportsQuery.data || {};

  const handleExpand = (sectionId: number) => {
    if (expandedShip === sectionId) {
      setExpandedShip(null);
      setEditingReport(null);
    } else {
      setExpandedShip(sectionId);
      const report = shipReports[sectionId];
      if (report) {
        setEditingReport({ ...report, section_id: sectionId });
      }
    }
  };

  const handleSave = (sectionId: number) => {
    if (editingReport) {
      saveMutation.mutate({ sectionId, report: editingReport });
    }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-lcars-orange">Ship Reports</h1>
          <p className="text-lcars-tan mt-1">Individual installation summaries</p>
        </div>
      </div>

      {/* Ship List */}
      <div className="space-y-4">
        {shipSections.map((section: any) => {
          const report = shipReports[section.id];
          const isExpanded = expandedShip === section.id;
          const userCanEdit = canEdit('ship_report', section.section_key);
          const statusColor = {
            pending: 'bg-gray-600',
            draft: 'bg-lcars-blue',
            submitted: 'bg-lcars-yellow',
            approved: 'bg-green-500',
          }[section.status] || 'bg-gray-600';

          return (
            <div key={section.id} className="lcars-panel overflow-hidden">
              {/* Header */}
              <button
                onClick={() => handleExpand(section.id)}
                className="w-full p-4 flex items-center gap-4 hover:bg-lcars-orange/10 transition-colors"
              >
                <Ship size={24} className="text-lcars-orange" />
                <div className="flex-1 text-left">
                  <h3 className="text-white font-semibold">{section.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-0.5 rounded text-black text-xs ${statusColor}`}>
                      {section.status}
                    </span>
                    {report?.co_character && (
                      <span className="text-gray-400 text-sm">
                        CO: {report.co_character}
                      </span>
                    )}
                  </div>
                </div>
                {section.status === 'approved' && (
                  <CheckCircle size={20} className="text-green-400" />
                )}
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {/* Expanded Content */}
              {isExpanded && editingReport && (
                <div className="p-6 border-t border-gray-700 space-y-6">
                  {/* Command Staff */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lcars-tan flex items-center gap-2 mb-3">
                        <User size={16} />
                        Commanding Officer
                      </h4>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingReport.co_name || ''}
                          onChange={(e) => setEditingReport({ ...editingReport, co_name: e.target.value })}
                          placeholder="Player name"
                          className="lcars-input"
                          disabled={!userCanEdit}
                        />
                        <input
                          type="text"
                          value={editingReport.co_character || ''}
                          onChange={(e) => setEditingReport({ ...editingReport, co_character: e.target.value })}
                          placeholder="Character name"
                          className="lcars-input"
                          disabled={!userCanEdit}
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lcars-tan flex items-center gap-2 mb-3">
                        <User size={16} />
                        First Officer
                      </h4>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingReport.xo_name || ''}
                          onChange={(e) => setEditingReport({ ...editingReport, xo_name: e.target.value })}
                          placeholder="Player name"
                          className="lcars-input"
                          disabled={!userCanEdit}
                        />
                        <input
                          type="text"
                          value={editingReport.xo_character || ''}
                          onChange={(e) => setEditingReport({ ...editingReport, xo_character: e.target.value })}
                          placeholder="Character name"
                          className="lcars-input"
                          disabled={!userCanEdit}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Image */}
                  <div>
                    <h4 className="text-lcars-tan flex items-center gap-2 mb-3">
                      <Image size={16} />
                      Ship Image
                    </h4>
                    <input
                      type="text"
                      value={editingReport.image_url || ''}
                      onChange={(e) => setEditingReport({ ...editingReport, image_url: e.target.value })}
                      placeholder="Image filename (e.g., USS_Khitomer.png)"
                      className="lcars-input"
                      disabled={!userCanEdit}
                    />
                  </div>

                  {/* Summary */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lcars-tan">Year Summary</h4>
                    </div>
                    <textarea
                      value={editingReport.summary || ''}
                      onChange={(e) => setEditingReport({ ...editingReport, summary: e.target.value })}
                      placeholder="Write your ship's yearly summary..."
                      className="lcars-textarea"
                      rows={8}
                      disabled={!userCanEdit}
                    />
                  </div>

                  {/* AI Summary Generator */}
                  {userCanEdit && section.status !== 'approved' && (
                    <div className="lcars-panel bg-lcars-purple/10 p-4">
                      <h4 className="text-lcars-purple flex items-center gap-2 mb-3">
                        <Sparkles size={16} />
                        AI Summary Generator
                      </h4>
                      <p className="text-gray-400 text-sm mb-4">
                        Enter monthly summaries and let AI generate a cohesive yearly summary.
                      </p>
                      <div className="grid md:grid-cols-3 gap-2 mb-4">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                          <div key={month}>
                            <label className="text-xs text-gray-500">{month}</label>
                            <textarea
                              value={monthlySummaries[idx]}
                              onChange={(e) => {
                                const newSummaries = [...monthlySummaries];
                                newSummaries[idx] = e.target.value;
                                setMonthlySummaries(newSummaries);
                              }}
                              className="lcars-input text-xs h-20 resize-none"
                              placeholder={`${month} summary...`}
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => aiSummaryMutation.mutate(section.title)}
                        disabled={aiSummaryMutation.isLoading}
                        className="lcars-button lcars-button-secondary"
                      >
                        {aiSummaryMutation.isLoading ? 'Generating...' : 'Generate Summary'}
                      </button>
                      {aiSummaryMutation.isError && (
                        <p className="text-lcars-red text-sm mt-2">
                          {(aiSummaryMutation.error as any)?.message ||
                            (aiSummaryMutation.error as any)?.response?.data?.error ||
                            'Failed to generate summary'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {userCanEdit && section.status !== 'approved' && (
                    <div className="flex gap-3 pt-4 border-t border-gray-700">
                      <button
                        onClick={() => handleSave(section.id)}
                        disabled={saveMutation.isLoading}
                        className="lcars-button flex items-center gap-2"
                      >
                        <Save size={16} />
                        {saveMutation.isLoading ? 'Saving...' : 'Save Draft'}
                      </button>
                      {section.status === 'draft' && (
                        <button
                          onClick={() => submitMutation.mutate(section.id)}
                          disabled={submitMutation.isLoading}
                          className="lcars-button lcars-button-secondary flex items-center gap-2"
                        >
                          <Send size={16} />
                          Submit for Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {shipSections.length === 0 && (
        <div className="lcars-panel p-8 text-center">
          <Ship size={48} className="mx-auto mb-4 text-lcars-orange opacity-50" />
          <p className="text-gray-400">No ship reports configured yet.</p>
          {isAdmin && (
            <p className="text-gray-500 text-sm mt-2">
              Add ships in the Admin panel.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
