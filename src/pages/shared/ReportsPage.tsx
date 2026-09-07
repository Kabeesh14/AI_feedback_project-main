import { useState } from 'react';
import { Card, Button, Badge } from '@/components/common/UI';
import { Modal } from '@/components/common/Modal';
import { getAvailableReports, generateReportPreview, type ReportConfig } from '@/services/reportService';
import { useAuth } from '@/context/AuthContext';
import { FileText, Eye, Download, FileSpreadsheet, CheckCircle, Info } from 'lucide-react';

export function ReportsPage() {
  const { user } = useAuth();
  const effectiveDept = user?.role === 'hod' ? user?.department : (user?.department || undefined);
  const reports = getAvailableReports();
  const [viewing, setViewing] = useState<ReportConfig | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const handleExport = (format: 'PDF' | 'CSV') => {
    setExportMsg(`Demo: ${format} export would generate a downloadable file in production. No actual file was created.`);
    setTimeout(() => setExportMsg(null), 4000);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Generate and export institutional intelligence reports {effectiveDept ? `· ${effectiveDept}` : '· Institution-wide'}
        </p>
      </div>

      {exportMsg && (
        <div className="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 flex items-center gap-2">
          <Info size={16} className="text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">{exportMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(report => (
          <Card key={report.id} className="p-5" hover>
            <div className="flex items-start justify-between mb-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/30 dark:to-violet-900/30 flex items-center justify-center">
                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <Badge variant="default" className="capitalize">{report.type}</Badge>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{report.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{report.description}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewing(report)}>
                <Eye size={14} />
                View
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleExport('PDF')}>
                <Download size={14} />
                PDF
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleExport('CSV')}>
                <FileSpreadsheet size={14} />
                CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Report Preview Modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Report'} size="xl">
        {viewing && (() => {
          const preview = generateReportPreview(viewing.id, effectiveDept);
          return (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="default" className="capitalize">{viewing.type} report</Badge>
                <span className="text-xs text-slate-400">
                  Demo Data Preview {effectiveDept ? `(${effectiveDept})` : '(Institution-wide)'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      {preview.headers.map((h, i) => (
                        <th key={i} className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-300">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="outline" size="sm" onClick={() => handleExport('PDF')}>
                  <Download size={14} />
                  Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('CSV')}>
                  <FileSpreadsheet size={14} />
                  Export CSV
                </Button>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle size={14} className="text-emerald-500" />
                Report preview generated from mock data. Export buttons display a demo state.
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
