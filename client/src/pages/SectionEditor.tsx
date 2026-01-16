import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { sotfaApi, aiApi } from '../utils/api';
import {
  Save,
  Send,
  CheckCircle,
  Sparkles,
  MessageSquare,
  Eye,
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export default function SectionEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [newComment, setNewComment] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['section', id],
    queryFn: () => sotfaApi.getSection(Number(id)),
    onSuccess: (res) => {
      setContent(res.data.section.content || '');
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => sotfaApi.updateSection(Number(id), { content, status: 'draft' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['section', id]);
      queryClient.invalidateQueries(['sotfa-current']);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => sotfaApi.submitSection(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries(['section', id]);
      queryClient.invalidateQueries(['sotfa-current']);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => sotfaApi.approveSection(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries(['section', id]);
      queryClient.invalidateQueries(['sotfa-current']);
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => sotfaApi.addComment(Number(id), newComment),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries(['section', id]);
    },
  });

  const aiMutation = useMutation({
    mutationFn: () => aiApi.improveContent(content, aiPrompt),
    onSuccess: (res) => {
      setContent(res.data.improvedContent);
      setAiPrompt('');
    },
  });

  const previewMutation = useMutation({
    mutationFn: () => sotfaApi.preview(section?.section_type, { text: content }),
    onSuccess: (res) => {
      setPreviewHtml(res.data.preview);
      setShowPreview(true);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const section = data?.data?.section;
  const comments = data?.data?.comments || [];
  const userCanEdit = section && canEdit(section.section_type, section.section_key);

  if (!section) {
    return (
      <div className="lcars-panel p-8 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-lcars-red" />
        <p className="text-gray-400">Section not found</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-600',
    draft: 'bg-lcars-blue',
    submitted: 'bg-lcars-yellow',
    approved: 'bg-green-500',
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-lcars-tan hover:text-lcars-orange transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-lcars-orange">{section.title}</h1>
          <div className="flex items-center gap-4 mt-1">
            <span className={`px-2 py-0.5 rounded text-black text-sm ${statusColors[section.status]}`}>
              {section.status.charAt(0).toUpperCase() + section.status.slice(1)}
            </span>
            {section.deadline && (
              <span className="text-gray-400 text-sm">
                Due: {format(new Date(section.deadline), 'MMMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {userCanEdit && section.status !== 'approved' && (
            <>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isLoading}
                className="lcars-button flex items-center gap-2"
              >
                <Save size={16} />
                {saveMutation.isLoading ? 'Saving...' : 'Save Draft'}
              </button>
              {section.status === 'draft' && (
                <button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isLoading}
                  className="lcars-button lcars-button-secondary flex items-center gap-2"
                >
                  <Send size={16} />
                  Submit for Review
                </button>
              )}
            </>
          )}
          {isAdmin && section.status === 'submitted' && (
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isLoading}
              className="lcars-button flex items-center gap-2"
              style={{ backgroundColor: '#33cc33' }}
            >
              <CheckCircle size={16} />
              Approve
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Editor */}
          <div className="lcars-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lcars-tan">Content</h2>
              <button
                onClick={() => previewMutation.mutate()}
                className="text-lcars-blue hover:text-lcars-purple flex items-center gap-1 text-sm"
              >
                <Eye size={16} />
                Preview Wiki
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="lcars-textarea min-h-[400px]"
              placeholder="Enter section content..."
              disabled={!userCanEdit || section.status === 'approved'}
            />
          </div>

          {/* AI Assistant */}
          {userCanEdit && section.status !== 'approved' && (
            <div className="lcars-panel p-6">
              <h2 className="text-lcars-tan flex items-center gap-2 mb-4">
                <Sparkles size={20} className="text-lcars-purple" />
                AI Assistant
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                Get help improving your content. Describe what you'd like to change.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Make it more concise, Add more detail about missions..."
                  className="lcars-input flex-1"
                />
                <button
                  onClick={() => aiMutation.mutate()}
                  disabled={aiMutation.isLoading || !aiPrompt}
                  className="lcars-button lcars-button-secondary"
                >
                  {aiMutation.isLoading ? 'Processing...' : 'Improve'}
                </button>
              </div>
              {aiMutation.isError && (
                <p className="text-lcars-red text-sm mt-2">
                  {(aiMutation.error as any)?.response?.data?.error || 'Failed to process request'}
                </p>
              )}
            </div>
          )}

          {/* Wiki Preview Modal */}
          {showPreview && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-lcars-panel rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
                <div className="sticky top-0 bg-lcars-panel p-4 border-b border-gray-700 flex items-center justify-between">
                  <h3 className="text-lcars-tan">Wiki Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-lcars-red hover:text-red-400"
                  >
                    Close
                  </button>
                </div>
                <div className="p-4">
                  <div className="wiki-preview">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {previewHtml || content}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Comments */}
          <div className="lcars-panel p-6">
            <h2 className="text-lcars-tan flex items-center gap-2 mb-4">
              <MessageSquare size={20} />
              Comments ({comments.length})
            </h2>

            {/* Comment List */}
            <div className="space-y-4 max-h-64 overflow-y-auto mb-4">
              {comments.map((comment: any) => (
                <div key={comment.id} className="border-l-2 border-lcars-orange pl-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-lcars-tan">{comment.display_name}</span>
                    <span className="text-gray-500">
                      {format(new Date(comment.created_at), 'MMM d')}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mt-1">{comment.comment}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-gray-500 text-sm">No comments yet</p>
              )}
            </div>

            {/* Add Comment */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="lcars-input flex-1 text-sm"
              />
              <button
                onClick={() => commentMutation.mutate()}
                disabled={!newComment || commentMutation.isLoading}
                className="lcars-button text-sm px-3"
              >
                Post
              </button>
            </div>
          </div>

          {/* Section Info */}
          <div className="lcars-panel p-6">
            <h2 className="text-lcars-tan mb-4">Section Info</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Type</dt>
                <dd className="text-white">{section.section_type.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="text-white">
                  {format(new Date(section.updated_at), 'MMM d, yyyy h:mm a')}
                </dd>
              </div>
              {section.submitted_at && (
                <div>
                  <dt className="text-gray-500">Submitted</dt>
                  <dd className="text-white">
                    {format(new Date(section.submitted_at), 'MMM d, yyyy')}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
