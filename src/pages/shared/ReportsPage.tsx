import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@/components/common/UI';
import { Modal } from '@/components/common/Modal';
import { getAvailableReports, fetchReportPreview, type ReportConfig, type ReportPreviewData } from '@/services/reportService';
import { useAuth } from '@/context/AuthContext';
import { FileText, Eye, Download, FileSpreadsheet, CheckCircle, Info, Loader2 } from 'lucide-react';

export function ReportsPage() {
  const { user } = useAuth();
  const effectiveDept = user?.role === 'hod' ? user?.department : (user?.department || undefined);
  const reports = getAvailableReports(user?.role);
  const [viewing, setViewing] = useState<ReportConfig | null>(null);
  const [previewData, setPreviewData] = useState<ReportPreviewData | null>(null);
  const [selectedDayTab, setSelectedDayTab] = useState<'all' | number>('all');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (viewing) {
      setLoadingPreview(true);
      setPreviewError(null);
      setSelectedDayTab('all');
      fetchReportPreview(viewing.id, effectiveDept)
        .then(data => {
          if (mounted) setPreviewData(data);
        })
        .catch(() => {
          if (mounted) {
            setPreviewError('Report preview could not be loaded.');
            setPreviewData(null);
          }
        })
        .finally(() => {
          if (mounted) setLoadingPreview(false);
        });
    } else {
      setPreviewData(null);
      setPreviewError(null);
      setSelectedDayTab('all');
    }
    return () => { mounted = false; };
  }, [viewing, effectiveDept]);

  // CSV Export
  const downloadCSV = (title: string, headers: string[], rows: string[][]) => {
    const csvRows = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ];
    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Excel Export
  const downloadExcel = (title: string, headers: string[], rows: string[][]) => {
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${title.slice(0, 30)}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th { background-color: #2563eb; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
          td { padding: 8px 10px; border: 1px solid #cbd5e1; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .title { font-size: 16pt; font-weight: bold; color: #1e293b; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="title">${title}</div>
        <p>Department: ${effectiveDept || 'All Departments'} | Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell || ''}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // PDF Export via Printable View
  const downloadPDF = (title: string, headers: string[], rows: string[][]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
          h1 { margin: 0 0 6px 0; font-size: 22px; color: #1e293b; }
          .meta { font-size: 13px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th { background-color: #f1f5f9; color: #334155; text-align: left; padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: 600; }
          td { padding: 9px 12px; border: 1px solid #cbd5e1; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: right; }
          @media print {
            body { padding: 15px; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <div class="meta">
            <span><strong>Department:</strong> ${effectiveDept || 'All Departments'}</span> &nbsp;|&nbsp;
            <span><strong>Generated At:</strong> ${new Date().toLocaleString()}</span> &nbsp;|&nbsp;
            <span><strong>Total Records:</strong> ${rows.length}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell || ''}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">
          Report generated strictly from official survey submissions.
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportDirect = async (report: ReportConfig, format: 'PDF' | 'CSV' | 'Excel') => {
    try {
      setExportingId(`${report.id}-${format}`);
      const data = (viewing?.id === report.id && previewData) 
        ? previewData 
        : await fetchReportPreview(report.id, effectiveDept);

      if (!data || data.rows.length === 0) {
        setExportMsg(`No records available to export for ${report.name}.`);
        setTimeout(() => setExportMsg(null), 4000);
        return;
      }

      if (format === 'CSV') {
        downloadCSV(report.name, data.headers, data.rows);
      } else if (format === 'Excel') {
        downloadExcel(report.name, data.headers, data.rows);
      } else if (format === 'PDF') {
        downloadPDF(report.name, data.headers, data.rows);
      }

      setExportMsg(`Successfully exported ${report.name} as ${format}.`);
      setTimeout(() => setExportMsg(null), 4000);
    } catch {
      setExportMsg(`Failed to export ${report.name} as ${format}.`);
      setTimeout(() => setExportMsg(null), 4000);
    } finally {
      setExportingId(null);
    }
  };

  const activeDailyReport = typeof selectedDayTab === 'number' && previewData?.dailyReports
    ? previewData.dailyReports.find(d => d.dayIndex === selectedDayTab)
    : null;

  const displayHeaders = activeDailyReport ? activeDailyReport.headers : (previewData?.headers || []);
  const displayRows = activeDailyReport ? activeDailyReport.rows : (previewData?.rows || []);
  const displayTitle = activeDailyReport 
    ? `${viewing?.name} - ${activeDailyReport.dayLabel}` 
    : (viewing?.name || 'Report');

  const handleExportModal = (format: 'PDF' | 'CSV' | 'Excel') => {
    if (!viewing || !previewData || displayRows.length === 0) return;
    if (format === 'CSV') {
      downloadCSV(displayTitle, displayHeaders, displayRows);
    } else if (format === 'Excel') {
      downloadExcel(displayTitle, displayHeaders, displayRows);
    } else if (format === 'PDF') {
      downloadPDF(displayTitle, displayHeaders, displayRows);
    }
    setExportMsg(`Successfully exported ${displayTitle} as ${format}.`);
    setTimeout(() => setExportMsg(null), 4000);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Generate and export survey form submission reports {effectiveDept ? `· ${effectiveDept}` : '· Institution-wide'}
        </p>
      </div>

      {exportMsg && (
        <div className="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 flex items-center gap-2">
          <Info size={16} className="text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">{exportMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
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
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewing(report)}>
                <Eye size={14} />
                View
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleExportDirect(report, 'PDF')}
                disabled={exportingId === `${report.id}-PDF`}
              >
                <Download size={14} />
                PDF
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleExportDirect(report, 'CSV')}
                disabled={exportingId === `${report.id}-CSV`}
              >
                <FileSpreadsheet size={14} />
                CSV
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleExportDirect(report, 'Excel')}
                disabled={exportingId === `${report.id}-Excel`}
              >
                <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
                Excel
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Report Preview Modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Report'} size="xl">
        {viewing && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default" className="capitalize">{viewing.type} report</Badge>
              <span className="text-xs text-slate-400">
                Live Report Preview {effectiveDept ? `(${effectiveDept})` : '(Institution-wide)'}
              </span>
            </div>

            {loadingPreview ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 size={28} className="animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-xs">Generating report data from actual survey submissions...</p>
              </div>
            ) : previewError ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm font-medium">{previewError}</p>
              </div>
            ) : !previewData || displayRows.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm">No survey submissions available for this period.</p>
              </div>
            ) : (
              <div>
                {/* 6 Daily Reports Breakdown Bar for Weekly Department Survey Report */}
                {previewData?.dailyReports && previewData.dailyReports.length > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                      <div className="text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-blue-600 dark:text-blue-400" />
                        Calculated from 6 Daily Department Survey Reports (Day 1 - Day 6)
                      </div>
                      <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                        {selectedDayTab === 'all' ? 'Combined 6-Day Weekly Summary' : `Viewing ${activeDailyReport?.dayLabel}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDayTab('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedDayTab === 'all'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Weekly Summary (All 6 Days)
                      </button>
                      {previewData.dailyReports.map(dr => (
                        <button
                          key={dr.dayIndex}
                          type="button"
                          onClick={() => setSelectedDayTab(dr.dayIndex)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            selectedDayTab === dr.dayIndex
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {dr.shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        {displayHeaders.map((h, i) => (
                          <th key={i} className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-300">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          {row.map((cell, j) => (
                            <td key={j} className="px-4 py-2.5 text-slate-700 dark:text-slate-200 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3 justify-end mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" size="sm" onClick={() => handleExportModal('PDF')} disabled={!previewData || displayRows.length === 0}>
                <Download size={14} />
                Export as PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportModal('CSV')} disabled={!previewData || displayRows.length === 0}>
                <FileSpreadsheet size={14} />
                Export as CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportModal('Excel')} disabled={!previewData || displayRows.length === 0}>
                <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
                Export as Excel
              </Button>
            </div>
            {previewData && displayRows.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle size={14} className="text-emerald-500" />
                Report generated strictly from official survey submissions.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

