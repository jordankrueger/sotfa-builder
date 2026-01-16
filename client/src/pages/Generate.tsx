import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { sotfaApi, adminApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Code,
  Copy,
  Download,
  FileText,
  Eye,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function Generate() {
  const { isAdmin } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: sotfaData } = useQuery({
    queryKey: ['sotfa-current'],
    queryFn: () => sotfaApi.getCurrent(),
  });

  const generateMutation = useMutation({
    mutationFn: () => sotfaApi.generateWikiCode(),
  });

  const exportGDocMutation = useMutation({
    mutationFn: () => adminApi.exportGDoc(),
  });

  const progress = sotfaData?.data?.progress || 0;
  const sections = sotfaData?.data?.sections || [];
  const approvedCount = sections.filter((s: any) => s.status === 'approved').length;
  const totalCount = sections.length;

  const handleCopy = () => {
    if (generateMutation.data?.data?.wikiCode) {
      navigator.clipboard.writeText(generateMutation.data.data.wikiCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-lcars-orange">Generate Output</h1>
          <p className="text-lcars-tan mt-1">Export SOTFA in various formats</p>
        </div>
      </div>

      {/* Progress Status */}
      <div className="lcars-panel p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-lcars-tan">Completion Status</h2>
          <span className="text-2xl font-bold text-lcars-orange">{progress}%</span>
        </div>
        <div className="progress-bar h-4 mb-4">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="flex items-center gap-2">
          {progress === 100 ? (
            <>
              <CheckCircle size={20} className="text-green-400" />
              <span className="text-green-400">All {totalCount} sections approved - ready to generate!</span>
            </>
          ) : (
            <>
              <AlertCircle size={20} className="text-lcars-yellow" />
              <span className="text-lcars-yellow">
                {approvedCount} of {totalCount} sections approved
              </span>
            </>
          )}
        </div>
      </div>

      {/* Export Options */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* MediaWiki Code */}
        <div className="lcars-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <Code size={24} className="text-lcars-orange" />
            <h2 className="text-xl text-lcars-tan">MediaWiki Code</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Generate complete wiki markup ready to paste into the Starbase 118 wiki.
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isLoading}
            className="lcars-button w-full"
          >
            {generateMutation.isLoading ? 'Generating...' : 'Generate Wiki Code'}
          </button>
        </div>

        {/* Google Doc Export */}
        <div className="lcars-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText size={24} className="text-lcars-blue" />
            <h2 className="text-xl text-lcars-tan">Review Document</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Export plain text format suitable for committee review in Google Docs.
          </p>
          <button
            onClick={() => exportGDocMutation.mutate()}
            disabled={exportGDocMutation.isLoading || !isAdmin}
            className="lcars-button lcars-button-secondary w-full"
          >
            {exportGDocMutation.isLoading ? 'Exporting...' : 'Export for Review'}
          </button>
          {!isAdmin && (
            <p className="text-gray-500 text-xs mt-2">Admin access required</p>
          )}
        </div>
      </div>

      {/* Generated Wiki Code */}
      {generateMutation.data?.data?.wikiCode && (
        <div className="lcars-panel overflow-hidden">
          <div className="lcars-header px-4 py-2 text-black font-bold flex items-center justify-between">
            <span>Generated MediaWiki Code - {generateMutation.data.data.year} SOTFA</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-1 bg-black/20 rounded hover:bg-black/30 flex items-center gap-1"
              >
                <Eye size={14} />
                {showPreview ? 'Show Code' : 'Preview'}
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1 bg-black/20 rounded hover:bg-black/30 flex items-center gap-1"
              >
                <Copy size={14} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => handleDownload(
                  generateMutation.data.data.wikiCode,
                  `SOTFA_${generateMutation.data.data.year}.wiki`
                )}
                className="px-3 py-1 bg-black/20 rounded hover:bg-black/30 flex items-center gap-1"
              >
                <Download size={14} />
                Download
              </button>
            </div>
          </div>

          <div className="p-4 max-h-[600px] overflow-auto">
            {showPreview ? (
              <div className="wiki-preview">
                <WikiPreview code={generateMutation.data.data.wikiCode} />
              </div>
            ) : (
              <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                {generateMutation.data.data.wikiCode}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Google Doc Export Result */}
      {exportGDocMutation.data?.data?.content && (
        <div className="lcars-panel overflow-hidden mt-6">
          <div className="lcars-header px-4 py-2 text-black font-bold flex items-center justify-between">
            <span>Review Document</span>
            <button
              onClick={() => handleDownload(
                exportGDocMutation.data.data.content,
                `SOTFA_${exportGDocMutation.data.data.year}_Review.txt`
              )}
              className="px-3 py-1 bg-black/20 rounded hover:bg-black/30 flex items-center gap-1"
            >
              <Download size={14} />
              Download
            </button>
          </div>
          <div className="p-4 max-h-[400px] overflow-auto">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
              {exportGDocMutation.data.data.content}
            </pre>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="lcars-panel p-6 mt-8">
        <h2 className="text-lcars-tan mb-4">Publishing Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-400">
          <li>Ensure all sections are approved (100% completion)</li>
          <li>Generate the MediaWiki code using the button above</li>
          <li>Copy the generated code</li>
          <li>Navigate to the wiki page: <code className="text-lcars-blue">State_of_the_Federation_Address/{new Date().getFullYear()}</code></li>
          <li>Edit the page and paste the generated code</li>
          <li>Preview the changes and save</li>
          <li>Update the main SOTFA page to link to the new year</li>
        </ol>
      </div>
    </div>
  );
}

// Simple wiki preview component
function WikiPreview({ code }: { code: string }) {
  // Basic conversion of wiki markup to HTML-like preview
  let html = code
    // Headers
    .replace(/^= (.*?) =$/gm, '<h1>$1</h1>')
    .replace(/^== (.*?) ==$/gm, '<h2>$1</h2>')
    .replace(/^=== (.*?) ===$/gm, '<h3>$1</h3>')
    .replace(/^==== (.*?) ====$/gm, '<h4>$1</h4>')
    // Bold
    .replace(/'''(.*?)'''/g, '<strong>$1</strong>')
    // Italic
    .replace(/''(.*?)''/g, '<em>$1</em>')
    // Lists
    .replace(/^\* (.*?)$/gm, '<li>$1</li>')
    // Links (simplified)
    .replace(/\[\[(.*?)\]\]/g, '<a href="#">$1</a>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    // Remove templates for preview
    .replace(/\{\{[^}]+\}\}/g, '[template]');

  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}
