import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Badge, Button } from '@/components/common/UI';
import { Modal } from '@/components/common/Modal';
import { createAction } from '@/services/actionService';
import { useAuth } from '@/context/AuthContext';
import {
  fetchForms,
  fetchFormParticipation,
  fetchFormAnalysis,
  triggerFormAnalysis,
  type FeedbackForm,
  type FormParticipationData,
  type FormAnalysisData
} from '@/services/formService';
import {
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield,
  ArrowLeft,
  RefreshCw,
  Search,
  FileText,
  Sparkles,
  Quote,
  BarChart2,
  AlertTriangle,
  Flame,
  HelpCircle,
  CheckSquare,
  ArrowRight,
  Loader2,
  Plus,
  GraduationCap
} from 'lucide-react';
import { CreateFormModal } from '@/components/forms/CreateFormModal';

export function HodFormParticipation({ role = 'hod' }: { role?: 'hod' | 'faculty' | 'management' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(id ? parseInt(id, 10) : null);
  const [participation, setParticipation] = useState<FormParticipationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'participation' | 'analysis'>(
    role !== 'faculty' && searchParams.get('tab') === 'analysis' ? 'analysis' : 'participation'
  );
  const [activeTab, setActiveTab] = useState<'responded' | 'notResponded'>('responded');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [surveyAudienceFilter, setSurveyAudienceFilter] = useState<'all' | 'student' | 'faculty'>('all');

  // Gap 2: Synchronize activeSection when tab query parameter changes (Faculty only sees participation)
  useEffect(() => {
    if (role === 'faculty') {
      setActiveSection('participation');
      return;
    }
    const tab = searchParams.get('tab');
    if (tab === 'analysis') {
      setActiveSection('analysis');
    } else if (tab === 'participation') {
      setActiveSection('participation');
    }
  }, [searchParams, role]);

  // Gap 3: Synchronize selectedFormId when route parameter :id changes
  useEffect(() => {
    if (!id) return;
    const parsed = parseInt(id, 10);
    if (!Number.isNaN(parsed) && parsed !== selectedFormId) {
      setSelectedFormId(parsed);
    }
  }, [id, selectedFormId]);

  // Phase 4: Collective AI Analysis state
  const [analysisData, setAnalysisData] = useState<FormAnalysisData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Phase 5: HOD Theme -> Department Action state
  const [actionModalTheme, setActionModalTheme] = useState<any | null>(null);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionPriority, setActionPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<{ id: string; title: string } | null>(null);

  // Load available forms for the user's role/department
  useEffect(() => {
    let mounted = true;
    async function loadForms() {
      try {
        setLoading(true);
        const deptParam = role === 'management' && user?.department ? user.department : undefined;
        const formList = await fetchForms({
          department: deptParam,
          target_audience: role === 'faculty' ? 'student' : undefined
        });
        if (mounted) {
          // If faculty, strictly only show student surveys for their department
          const eligibleForms = role === 'faculty'
            ? formList.filter(f => (f.target_audience || 'student') === 'student')
            : formList;
          setForms(eligibleForms);
          if (eligibleForms.length > 0) {
            setSelectedFormId(prev => {
              if (prev && eligibleForms.some(f => f.id === prev)) return prev;
              return eligibleForms[0].id;
            });
          } else {
            setSelectedFormId(null);
            setParticipation(null);
            setAnalysisData(null);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load department forms.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadForms();
    return () => { mounted = false; };
  }, [role, user?.department]);

  // Load participation & analysis data when selected form changes
  useEffect(() => {
    if (!selectedFormId) return;

    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const pData = await fetchFormParticipation(selectedFormId);
        if (mounted) setParticipation(pData);

        // Fetch AI analysis for this form (HOD & Management only)
        if (role !== 'faculty') {
          try {
            const aData = await fetchFormAnalysis(selectedFormId);
            if (mounted) setAnalysisData(aData);
          } catch {
            // If analysis endpoint returns 404 or pending, keep null
            if (mounted) setAnalysisData(null);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load form participation data.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [selectedFormId]);

  const handleFormSelect = (formId: number) => {
    setSelectedFormId(formId);
    setSearchQuery('');
    setAnalysisError(null);
  };

  const handleTriggerAnalysis = async () => {
    if (!selectedFormId) return;
    try {
      setAnalysisLoading(true);
      setAnalysisError(null);
      const res = await triggerFormAnalysis(selectedFormId);
      setAnalysisData(res);
      setActiveSection('analysis');
    } catch (err: any) {
      setAnalysisError(err.response?.data?.message || err.message || 'Failed to execute AI analysis.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const respondedList = participation?.respondedList || [];
  const notRespondedList = participation?.notRespondedList || [];

  const filteredResponded = respondedList.filter(s =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNotResponded = notRespondedList.filter(s =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = participation?.stats || {
    targeted: 0,
    responded: 0,
    notResponded: 0,
    responseRate: 0,
    responseRateFormatted: '0%',
    totalSubmissions: 0
  };

  const formMeta = participation?.form;
  const selectedForm = forms.find(f => f.id === selectedFormId);
  const isFacultySurvey = (formMeta as any)?.targetAudience === 'faculty' || (formMeta as any)?.target_audience === 'faculty' || selectedForm?.target_audience === 'faculty';

  const filteredForms = forms.filter(f => {
    if (role === 'faculty') return (f.target_audience || 'student') === 'student';
    if (surveyAudienceFilter === 'all') return true;
    const aud = f.target_audience || 'student';
    return aud === surveyAudienceFilter;
  });

  const handleFilterAudience = (filter: 'all' | 'student' | 'faculty') => {
    setSurveyAudienceFilter(filter);
    const matching = forms.filter(f => filter === 'all' || (f.target_audience || 'student') === filter);
    if (matching.length > 0 && (!selectedFormId || !matching.some(f => f.id === selectedFormId))) {
      handleFormSelect(matching[0].id);
    }
  };

  // Phase 5 authorization: only HOD viewing their own department form with completed analysis can create an action
  const isOwnDeptForm = role === 'hod' && !!user?.department && !!formMeta?.department && user.department.trim().toLowerCase() === formMeta.department.trim().toLowerCase();
  const canCreateAction = isOwnDeptForm && analysisData?.status === 'completed';

  const handleOpenActionModal = (theme: any) => {
    setActionModalTheme(theme);
    setActionTitle(theme.title || '');

    // Default description combines theme narrative and contributing root causes
    let desc = theme.description || '';
    if (theme.rootCauses && theme.rootCauses.length > 0) {
      desc += `\n\nContributing Root Causes:\n• ` + theme.rootCauses.join('\n• ');
    }
    setActionDescription(desc);

    // Priority default from Phase 4 overall priority
    const prio = (analysisData?.overallPriority?.toLowerCase() || 'medium') as any;
    setActionPriority(['critical', 'high', 'medium', 'low'].includes(prio) ? prio : 'medium');

    setAssignedTo('');

    // Target date default: 14 days from now
    const defaultDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setDueDate(defaultDate);

    // Notes: factual reference to source form and theme
    const formTitle = formMeta?.title || analysisData?.formTitle || 'Department Feedback Form';
    const countInfo = typeof theme.responseCount === 'number' && theme.responseCount > 0
      ? ` Supported by ${theme.responseCount} student response${theme.responseCount === 1 ? '' : 's'}.`
      : '';
    setActionNotes(`Source form: "${formTitle}". Theme: "${theme.title}".${countInfo}`);

    setActionError(null);
    setActionSuccess(null);
  };

  const handleConfirmCreateAction = async () => {
    if (!actionTitle.trim() || !dueDate) {
      setActionError('Action title and target deadline are required.');
      return;
    }
    try {
      setIsSubmittingAction(true);
      setActionError(null);

      const created = await createAction({
        action: actionTitle.trim(),
        description: actionDescription.trim(),
        department: (user?.department || 'ALL') as any,
        assignedTo: assignedTo.trim() || 'Department Head / Committee',
        deadline: dueDate,
        status: 'planned',
        priority: actionPriority,
        issueTitle: `Theme: ${actionModalTheme?.title || actionTitle.trim()}`,
        possibleCause: actionModalTheme?.rootCauses?.[0] || 'Investigation required',
        notes: actionNotes.trim(),
      });

      setActionSuccess({ id: created.id, title: created.action });
    } catch (err: any) {
      setActionError(err.response?.data?.message || err.message || 'Failed to create department action.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const getPriorityBadgeVariant = (priority: string | null) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'positive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {role === 'faculty' ? 'Department Student Feedback' : role === 'management' ? 'Feedback' : 'Feedback Survey Intelligence'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {role === 'faculty'
              ? `Review student survey details and track submission rosters for ${user?.department || 'your department'}.`
              : role === 'management'
                ? 'Track feedback submission rosters and review collective evidence-backed AI insights across department cohorts.'
                : 'Track student engagement rosters and review collective evidence-backed AI insights across department cohorts.'}
          </p>
        </div>

        {/* Actions & Form Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          {role === 'hod' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Form
            </Button>
          )}

          {/* Survey Type Filter Pills */}
          {role !== 'faculty' && forms.length > 0 && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/[0.05] rounded-xl border border-slate-200 dark:border-white/10 text-xs">
              <button
                type="button"
                onClick={() => handleFilterAudience('all')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  surveyAudienceFilter === 'all'
                    ? 'bg-white dark:bg-cyan-500/20 text-slate-900 dark:text-cyan-300 shadow-sm border border-slate-200 dark:border-cyan-400/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({forms.length})
              </button>
              <button
                type="button"
                onClick={() => handleFilterAudience('student')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  surveyAudienceFilter === 'student'
                    ? 'bg-white dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 shadow-sm border border-slate-200 dark:border-cyan-400/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3 h-3" />
                Student ({forms.filter(f => (f.target_audience || 'student') === 'student').length})
              </button>
              <button
                type="button"
                onClick={() => handleFilterAudience('faculty')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  surveyAudienceFilter === 'faculty'
                    ? 'bg-white dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 shadow-sm border border-slate-200 dark:border-violet-400/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GraduationCap className="w-3 h-3" />
                Faculty ({forms.filter(f => f.target_audience === 'faculty').length})
              </button>
            </div>
          )}

          {filteredForms.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="form-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Form:
              </label>
              <select
                id="form-select"
                value={selectedFormId || ''}
                onChange={(e) => handleFormSelect(parseInt(e.target.value, 10))}
                className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              >
                {filteredForms.map((f) => {
                  const audTag = role === 'faculty' ? '' : (f.target_audience === 'faculty' ? '[Faculty Survey] ' : '[Student Survey] ');
                  return (
                    <option key={f.id} value={f.id}>
                      {role === 'management' && f.department ? `[${f.department}] ` : ''}{audTag}{f.title} ({f.status})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="p-6 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-semibold text-base">Error Loading Survey Data</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Empty / No Forms State */}
      {!loading && forms.length === 0 && !error && (
        <Card className="p-12 text-center text-slate-500 dark:text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">
            {role === 'faculty' ? 'No Student Surveys Available' : 'No Department Forms Available'}
          </h3>
          <p className="text-sm max-w-md mx-auto mb-6">
            {role === 'faculty'
              ? 'There are currently no student survey forms published for your department. Once student surveys are published, submission rosters will appear here.'
              : role === 'management'
                ? 'There are currently no feedback forms created. Create or publish a form to begin tracking student feedback and AI analysis.'
                : 'There are currently no feedback forms created for your department. Create or publish a form to begin tracking student participation and AI analysis.'}
          </p>
          {role === 'hod' && (
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="mx-auto shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Department Form
            </Button>
          )}
        </Card>
      )}

      {/* Form Details & Navigation Tabs */}
      {participation && formMeta && (
        <>
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {formMeta.title}
                  </h2>
                  <Badge variant={formMeta.status === 'published' ? 'positive' : formMeta.status === 'closed' ? 'default' : 'warning'}>
                    {formMeta.status.toUpperCase()}
                  </Badge>
                  {isFacultySurvey ? (
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" /> Faculty Survey
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Student Survey
                    </span>
                  )}
                </div>
                {formMeta.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {formMeta.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 sm:text-right">
                  <div><span className="font-semibold">Department:</span> {formMeta.department}</div>
                  {selectedForm?.question_count !== undefined && (
                    <div><span className="font-semibold">Questions:</span> {selectedForm.question_count}</div>
                  )}
                  {formMeta.targetAcademicYear && <div><span className="font-semibold">Academic Year:</span> {formMeta.targetAcademicYear}</div>}
                  {formMeta.targetSemester && <div><span className="font-semibold">Target:</span> {formMeta.targetSemester}</div>}
                </div>

                {role === 'hod' && formMeta.status !== 'draft' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleTriggerAnalysis}
                    disabled={analysisLoading || stats.totalSubmissions === 0}
                    className="mt-1"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    {analysisData?.status === 'completed' ? 'Re-run AI Analysis' : 'Analyze Responses'}
                  </Button>
                )}
              </div>
            </div>

            {/* KPI Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {isFacultySurvey ? 'Targeted Faculty' : 'Targeted Students'}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  {isFacultySurvey ? (
                    <GraduationCap className="w-5 h-5 text-violet-500" />
                  ) : (
                    <Users className="w-5 h-5 text-blue-500" />
                  )}
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.targeted}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Responded</span>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats.responded}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Not Responded</span>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{stats.notResponded}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Response Rate</span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.responseRate}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, stats.responseRate))}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Section Navigation Tabs */}
          {role !== 'faculty' ? (
            <div className="flex border-b border-slate-200 dark:border-white/10 gap-2 sm:gap-6 pt-2">
              <button
                type="button"
                onClick={() => setActiveSection('participation')}
                className={`pb-3 px-3 text-sm sm:text-base font-bold border-b-2 transition-colors flex items-center gap-2 ${
                  activeSection === 'participation'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                {role === 'management' ? 'Feedback Tracking' : 'Participation Tracking'}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('analysis')}
                className={`pb-3 px-3 text-sm sm:text-base font-bold border-b-2 transition-colors flex items-center gap-2 ${
                  activeSection === 'analysis'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Collective AI Analysis
                {analysisData?.status === 'completed' && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-2 pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                Participation Tracking
              </div>
            </div>
          )}

          {/* SECTION 1: PARTICIPATION / FEEDBACK TRACKING */}
          {activeSection === 'participation' && (
            <div className="space-y-6">
              {/* Privacy Callout Banner */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 text-sm">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Privacy Boundary Enforced: </span>
                  {role === 'management' ? 'Feedback' : 'Participation'} status identifies respondent completion rates to enable follow-ups. {isFacultySurvey ? 'Faculty' : 'Student'} identities remain completely decoupled from questionnaire answers and ratings.
                </div>
              </div>

              {/* Respondent Tabs & Roster Lists */}
              <Card className="overflow-hidden">
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 px-4 pt-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('responded')}
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === 'responded'
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Responded ({stats.responded})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('notResponded')}
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === 'notResponded'
                        ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Not Responded ({stats.notResponded})
                  </button>
                </div>

                {/* Filter Input */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/20">
                  <div className="relative max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={`Search ${activeTab === 'responded' ? 'respondents' : 'pending students'} by name or email...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Tab Contents: Responded List */}
                {activeTab === 'responded' && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredResponded.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        {searchQuery ? 'No respondents match your search query.' : 'No students have responded yet.'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                          <thead className="bg-slate-50/50 dark:bg-slate-900/20 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-6">{isFacultySurvey ? 'Faculty Member' : 'Student'}</th>
                              <th className="py-3 px-6">Email Address</th>
                              <th className="py-3 px-6">Status</th>
                              <th className="py-3 px-6">Submitted At</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredResponded.map((s) => (
                              <tr key={s.studentId} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                                <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-slate-100">
                                  {s.studentName}
                                </td>
                                <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400">
                                  {s.email}
                                </td>
                                <td className="py-3.5 px-6">
                                  <Badge variant="positive">Responded</Badge>
                                </td>
                                <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400">
                                  {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Contents: Not Responded List */}
                {activeTab === 'notResponded' && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredNotResponded.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        {searchQuery ? 'No students match your search query.' : 'All targeted students have submitted feedback!'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                          <thead className="bg-slate-50/50 dark:bg-slate-900/20 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-6">{isFacultySurvey ? 'Faculty Member' : 'Student'}</th>
                              <th className="py-3 px-6">Email Address</th>
                              <th className="py-3 px-6">Status</th>
                              <th className="py-3 px-6">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredNotResponded.map((s) => (
                              <tr key={s.studentId} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                                <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-slate-100">
                                  {s.studentName}
                                </td>
                                <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400">
                                  {s.email}
                                </td>
                                <td className="py-3.5 px-6">
                                  <Badge variant="warning">Not Responded</Badge>
                                </td>
                                <td className="py-3.5 px-6 text-xs text-slate-400">
                                  Pending Submission
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* SECTION 2: PHASE 4 COLLECTIVE AI ANALYSIS */}
          {role !== 'faculty' && activeSection === 'analysis' && (
            <div className="space-y-6">
              {/* AI Disclosure Banner (Mandatory Section 34) */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-sm">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold">AI Disclosure: </span>
                  AI-generated analysis based on collected department responses. Review the underlying evidence before making institutional decisions. Analytical aid only; institutional decisions remain with the HOD.
                </div>
              </div>

              {/* Analysis Error State */}
              {analysisError && (
                <Card className="p-5 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Analysis Request Failed</p>
                        <p className="text-xs">{analysisError}</p>
                      </div>
                    </div>
                    {role === 'hod' && (
                      <Button size="sm" variant="outline" onClick={handleTriggerAnalysis}>
                        Retry
                      </Button>
                    )}
                  </div>
                </Card>
              )}

              {/* Loading / Processing State */}
              {(analysisLoading || analysisData?.status === 'processing') && (
                <Card className="p-12 text-center">
                  <div className="inline-flex p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4 animate-pulse">
                    <Sparkles className="w-8 h-8 animate-spin" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Generating Collective AI Intelligence...
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                    Aggregating anonymous student submissions, evaluating sentiment distribution, clustering recurring themes, and calibrating probable root causes.
                  </p>
                </Card>
              )}

              {/* Pending / No Analysis Yet State */}
              {!analysisLoading && analysisData?.status !== 'processing' && (!analysisData || analysisData.status === 'pending' || !analysisData.summary) && (
                <Card className="p-10 text-center">
                  <div className="inline-flex p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 mb-3">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    No Analysis Generated Yet
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
                    {stats.totalSubmissions === 0
                      ? 'No responses have been submitted for this form yet. Collective AI analysis requires collected student submissions.'
                      : `${stats.totalSubmissions} student submissions are available for collective theme and root-cause analysis.`}
                  </p>

                  {role === 'hod' ? (
                    <Button
                      variant="primary"
                      onClick={handleTriggerAnalysis}
                      disabled={stats.totalSubmissions === 0}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Responses
                    </Button>
                  ) : (
                    <p className="text-xs font-medium text-slate-400">
                      Analysis has not yet been initiated by the Department HOD.
                    </p>
                  )}
                </Card>
              )}

              {/* Completed Analysis View */}
              {!analysisLoading && analysisData?.status === 'completed' && (
                <div className="space-y-6">
                  {/* Analysis Metadata & Re-run Bar */}
                  <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {analysisData.totalAnalyzed} responses analyzed
                      </span>
                      <span>•</span>
                      <span>Analyzed: {analysisData.analyzedAt ? new Date(analysisData.analyzedAt).toLocaleString() : 'Recently'}</span>
                      <span>•</span>
                      <span className="capitalize">Engine: {analysisData.provider === 'gemini' ? 'Gemini AI' : 'Deterministic Heuristic'}</span>
                    </div>

                    {role === 'hod' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTriggerAnalysis}
                        disabled={analysisLoading}
                        className="self-start sm:self-auto text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Re-run Analysis
                      </Button>
                    )}
                  </Card>

                  {/* Summary & Priority Overview Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Overall Sentiment Distribution */}
                    <Card className="p-5 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Overall Sentiment</span>
                        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Negative</span>
                            <p className="text-xl font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">
                              {analysisData.sentiment?.negative ?? 0}%
                            </p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Neutral</span>
                            <p className="text-xl font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">
                              {analysisData.sentiment?.neutral ?? 0}%
                            </p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Positive</span>
                            <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                              {analysisData.sentiment?.positive ?? 0}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Visual Combined Sentiment Bar */}
                      <div className="w-full h-2 rounded-full overflow-hidden flex mt-4 bg-slate-200 dark:bg-slate-700">
                        <div
                          className="bg-rose-500 h-full transition-all"
                          style={{ width: `${analysisData.sentiment?.negative ?? 0}%` }}
                          title={`Negative: ${analysisData.sentiment?.negative}%`}
                        />
                        <div
                          className="bg-slate-400 h-full transition-all"
                          style={{ width: `${analysisData.sentiment?.neutral ?? 0}%` }}
                          title={`Neutral: ${analysisData.sentiment?.neutral}%`}
                        />
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${analysisData.sentiment?.positive ?? 0}%` }}
                          title={`Positive: ${analysisData.sentiment?.positive}%`}
                        />
                      </div>
                    </Card>

                    {/* Primary Area of Concern */}
                    <Card className="p-5 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Primary Area Requiring Attention
                        </span>
                        <div className="mt-3">
                          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {analysisData.primaryArea || 'Department Facilities'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Identified as the highest recurring source of friction across student submissions.
                          </p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                        Institutional decision remains with HOD
                      </div>
                    </Card>

                    {/* AI-Assessed Priority */}
                    <Card className="p-5 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          AI-Assessed Priority
                        </span>
                        <div className="mt-3 flex items-center gap-3">
                          <Badge variant={getPriorityBadgeVariant(analysisData.priority)} className="text-sm px-3 py-1 font-extrabold">
                            {analysisData.priority || 'MEDIUM'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Evaluated from complaint intensity, negative sentiment concentration, and low rating metrics.
                        </p>
                      </div>
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                        Analytical aid only
                      </div>
                    </Card>
                  </div>

                  {/* Executive Summary Card */}
                  {analysisData.summary && (
                    <Card className="p-5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-800/20 border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        Executive Summary
                      </span>
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {analysisData.summary}
                      </p>
                    </Card>
                  )}

                  {/* Major Recurring Concerns / Themes (Sections 14-18) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Major Themes & Root Causes
                      </h3>
                      <span className="text-xs text-slate-400 font-medium">
                        {analysisData.themes?.length || 0} major concern{analysisData.themes?.length === 1 ? '' : 's'} identified
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {analysisData.themes && analysisData.themes.map((theme, idx) => (
                        <Card key={idx} className="p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                {theme.title}
                              </h4>
                            </div>

                            {typeof theme.responseCount === 'number' && theme.responseCount > 0 && (
                              <Badge variant="default" className="text-xs">
                                {theme.responseCount} supporting response{theme.responseCount === 1 ? '' : 's'}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {theme.description}
                          </p>

                          {/* Likely Root Causes (Cautious language per Section 16) */}
                          {theme.rootCauses && theme.rootCauses.length > 0 && (
                            <div className="pt-2">
                              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                                Likely Contributing Factors / Root Causes:
                              </span>
                              <ul className="space-y-1.5 pl-2">
                                {theme.rootCauses.map((rc, rIdx) => (
                                  <li key={rIdx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                    <span>{rc}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Anonymous Supporting Evidence (Strictly Anonymous per Section 17 & 35) */}
                          {theme.evidence && theme.evidence.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
                                <Quote className="w-3.5 h-3.5 text-slate-400" />
                                Anonymous Supporting Responses:
                              </span>
                              <div className="space-y-2">
                                {theme.evidence.map((quote, qIdx) => (
                                  <div
                                    key={qIdx}
                                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 italic flex items-start gap-2"
                                  >
                                    <Quote className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <span>"{quote}"</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Phase 5: Explicit HOD Action Creation Bridge */}
                          {canCreateAction && (
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Review this concern and initialize a Department Corrective Action.
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleOpenActionModal(theme)}
                                className="flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                Create Department Action
                              </Button>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Structured Question Metrics Breakdown (Sections 8-10) */}
                  {analysisData.questionStats && analysisData.questionStats.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                          Deterministic Question Metrics
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysisData.questionStats.map((qs) => (
                          <Card key={qs.questionId} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {qs.questionText}
                              </h5>
                              <Badge variant="default" className="text-xs uppercase flex-shrink-0">
                                {qs.questionType.replace('_', ' ')}
                              </Badge>
                            </div>

                            {/* Rating Breakdown */}
                            {qs.questionType === 'rating' && qs.stats && (
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>Average Rating: <strong className="text-slate-800 dark:text-slate-200 text-sm">{qs.stats.averageRating || 0} / 5</strong></span>
                                  <span>{qs.totalResponses} responses</span>
                                </div>
                                <div className="space-y-1">
                                  {[5, 4, 3, 2, 1].map((star) => {
                                    const count = qs.stats?.distribution?.[String(star)] || 0;
                                    const pct = qs.totalResponses > 0 ? Math.round((count / qs.totalResponses) * 100) : 0;
                                    return (
                                      <div key={star} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <span className="w-7 font-mono">{star} ★</span>
                                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                          <div
                                            className="bg-emerald-500 h-full rounded-full transition-all"
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                        <span className="w-10 text-right font-mono text-slate-500">{count}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* MCQ Breakdown */}
                            {qs.questionType === 'mcq' && qs.stats?.optionCounts && (
                              <div className="space-y-2 pt-1">
                                <span className="text-xs text-slate-500">{qs.totalResponses} responses</span>
                                <div className="space-y-1.5">
                                  {Object.entries(qs.stats.optionCounts).map(([opt, count]) => {
                                    const pct = qs.stats?.optionPercentages?.[opt] || '0%';
                                    return (
                                      <div key={opt} className="text-xs space-y-0.5">
                                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                          <span>{opt}</span>
                                          <span className="font-mono text-slate-500">{count} ({pct})</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                          <div
                                            className="bg-blue-500 h-full rounded-full transition-all"
                                            style={{ width: pct }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Yes / No Breakdown */}
                            {qs.questionType === 'yes_no' && qs.stats && (
                              <div className="space-y-2 pt-1">
                                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                  <span>Yes: <strong>{qs.stats.yesCount || 0} ({qs.stats.yesPercentage})</strong></span>
                                  <span>No: <strong>{qs.stats.noCount || 0} ({qs.stats.noPercentage})</strong></span>
                                </div>
                                <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                                  <div
                                    className="bg-emerald-500 h-full transition-all"
                                    style={{ width: qs.stats.yesPercentage || '0%' }}
                                  />
                                  <div
                                    className="bg-rose-500 h-full transition-all"
                                    style={{ width: qs.stats.noPercentage || '0%' }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Text Question Count */}
                            {qs.questionType === 'text' && (
                              <div className="text-xs text-slate-500">
                                <span>{qs.totalResponses} text response{qs.totalResponses === 1 ? '' : 's'} analyzed for themes and evidence.</span>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Phase 5: HOD Theme Action Creation Modal */}
      <Modal
        open={!!actionModalTheme}
        onClose={() => {
          if (!isSubmittingAction) setActionModalTheme(null);
        }}
        title={actionSuccess ? "Department Action Initialized" : "Create Department Action"}
        size="lg"
      >
        {actionSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Action Created Successfully</h4>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                "{actionSuccess.title}" is now recorded in your Department Action Center for tracking and progress updates.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-3">
              <Button onClick={() => setActionModalTheme(null)} className="flex items-center gap-2">
                Done <CheckCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">Explicit Human Action</p>
              <p>This action will be formally assigned to your department. Review and refine the pre-filled theme intelligence before confirmation.</p>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Action Title *
              </label>
              <input
                type="text"
                value={actionTitle}
                onChange={e => setActionTitle(e.target.value)}
                placeholder="e.g., Upgrade lab systems with new hardware"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Department (Locked)
                </label>
                <input
                  type="text"
                  value={user?.department || formMeta?.department || 'Department'}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={actionPriority}
                  onChange={e => setActionPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Action Description & Root Causes
              </label>
              <textarea
                value={actionDescription}
                onChange={e => setActionDescription(e.target.value)}
                rows={4}
                placeholder="Action details and planned remedies..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Responsible Team / Assignee
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  placeholder="e.g., Lab Cell, Faculty Committee"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Target Deadline *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Source Reference & Notes
              </label>
              <textarea
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="ghost"
                onClick={() => setActionModalTheme(null)}
                disabled={isSubmittingAction}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCreateAction}
                disabled={isSubmittingAction || !actionTitle.trim() || !dueDate}
                className="flex items-center gap-2"
              >
                {isSubmittingAction ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckSquare className="w-4 h-4" />
                )}
                Confirm & Create Department Action
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Form Modal for HOD */}
      {role === 'hod' && (
        <CreateFormModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          departmentName={user?.department || 'Department'}
          onSuccess={(newForm) => {
            setShowCreateModal(false);
            const deptParam = role === 'management' && user?.department ? user.department : undefined;
            fetchForms({ department: deptParam })
              .then(formList => {
                setForms(formList);
                if (newForm?.id) {
                  setSelectedFormId(newForm.id);
                } else if (formList.length > 0) {
                  setSelectedFormId(formList[0].id);
                }
              })
              .catch(console.error);
          }}
        />
      )}
    </div>
  );
}
