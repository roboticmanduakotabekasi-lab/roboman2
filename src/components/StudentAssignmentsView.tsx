import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  ExternalLink, 
  FileText, 
  Clock, 
  Sparkles, 
  X, 
  Link as LinkIcon, 
  FileUp, 
  Calendar,
  Send,
  MessageSquare,
  Check,
  ChevronRight
} from 'lucide-react';
import { UserSession, MaterialAssignment, AssignmentSubmission } from '../types';
import { INITIAL_ASSIGNMENTS } from '../data/initialData';
import { 
  fetchMaterialsAssignmentsFromDB, 
  fetchStudentSubmissionsFromDB, 
  submitAssignmentToDB 
} from '../services/supabaseService';
import { playClickTick, playSuccessChime, playWarningBuzzer } from '../utils/audioFeedback';
import { processImageUpload, isSafeWebUrl } from '../utils/assignmentAttachment';

interface StudentAssignmentsViewProps {
  session: UserSession;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onAssignmentsCountChange?: (count: number) => void;
}

export const StudentAssignmentsView: React.FC<StudentAssignmentsViewProps> = ({
  session,
  onShowToast,
  onAssignmentsCountChange,
}) => {
  const [materials, setMaterials] = useState<MaterialAssignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'unsubmitted' | 'graded' | 'assignment' | 'material'>('all');
  
  // Submission modal state
  const [submittingTask, setSubmittingTask] = useState<MaterialAssignment | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load materials & student submissions
  const loadData = async () => {
    setIsLoading(true);
    try {
      const mats = await fetchMaterialsAssignmentsFromDB();
      const resolvedMats = mats && mats.length > 0 ? mats : (INITIAL_ASSIGNMENTS as MaterialAssignment[]);
      setMaterials(resolvedMats);

      const count = resolvedMats.filter(m => m.type === 'assignment').length;
      onAssignmentsCountChange?.(count);

      // Student identifier
      const studentId = session.userId || session.email || session.username;
      const subs = await fetchStudentSubmissionsFromDB(studentId);
      setSubmissions(subs);
    } catch (err) {
      console.warn('Error loading student assignments:', err);
      setMaterials(INITIAL_ASSIGNMENTS as MaterialAssignment[]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.username, session.userId]);

  // Map of student submissions by assignment id
  const submissionMap = useMemo(() => {
    const map = new Map<string, AssignmentSubmission>();
    submissions.forEach(s => {
      map.set(s.assignment_id, s);
    });
    return map;
  }, [submissions]);

  const assignmentsOnly = useMemo(() => {
    return materials.filter(m => m.type === 'assignment');
  }, [materials]);

  const unsubmittedTasks = useMemo(() => {
    return assignmentsOnly.filter(m => !submissionMap.has(m.id));
  }, [assignmentsOnly, submissionMap]);

  const gradedTasks = useMemo(() => {
    return assignmentsOnly.filter(m => {
      const s = submissionMap.get(m.id);
      return s && (s.status === 'graded' || typeof s.score_numeric === 'number');
    });
  }, [assignmentsOnly, submissionMap]);

  const filteredMaterials = useMemo(() => {
    if (filter === 'unsubmitted') return unsubmittedTasks;
    if (filter === 'graded') return gradedTasks;
    if (filter === 'assignment') return assignmentsOnly;
    if (filter === 'material') return materials.filter(m => m.type === 'material');
    return materials;
  }, [materials, filter, unsubmittedTasks, gradedTasks, assignmentsOnly]);

  // Handle file select for attachment with auto-compression and validation
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(fileNameLower);
    const isDoc = file.type === 'application/pdf' || /\.(pdf|doc|docx|zip)$/i.test(fileNameLower);

    if (!isImage && !isDoc) {
      onShowToast('File format not supported. Please upload an image (JPG, PNG) or document (PDF, Word, ZIP).', 'error');
      playWarningBuzzer();
      return;
    }

    try {
      if (isImage) {
        // Compress image via Canvas to keep within ~300KB
        const processed = await processImageUpload(file);
        setAttachmentName(processed.name);
        setAttachmentData(processed.dataUrl);
        onShowToast(`Assignment photo optimized successfully (${(processed.size / 1024).toFixed(0)} KB).`, 'info');
      } else {
        // Documents: strict 3MB limit to prevent storage overflow
        if (file.size > 3 * 1024 * 1024) {
          onShowToast('Attachment document size must be under 3MB.', 'error');
          playWarningBuzzer();
          return;
        }

        setAttachmentName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachmentData(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch {
      onShowToast('Failed to process attachment file. Please try again.', 'error');
      playWarningBuzzer();
    }
  };

  // Submit task solution
  const handleSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTask) return;

    if (!submissionLink.trim() && !attachmentData && !submissionNotes.trim()) {
      onShowToast('Please provide a project link, attach a file, or write a description of your work.', 'error');
      playWarningBuzzer();
      return;
    }

    if (submissionLink.trim() && !isSafeWebUrl(submissionLink.trim())) {
      onShowToast('Invalid project link. Please provide a valid URL starting with https:// or http://', 'error');
      playWarningBuzzer();
      return;
    }

    setIsSubmitting(true);
    playClickTick();

    try {
      const res = await submitAssignmentToDB({
        assignment_id: submittingTask.id,
        student_id: session.userId || session.username,
        student_name: session.name || session.username,
        student_email: session.email || '',
        submission_text: submissionNotes.trim(),
        submission_link: submissionLink.trim(),
        file_name: attachmentName || undefined,
        file_data: attachmentData || undefined,
        status: 'submitted',
      });

      if (res.success) {
        playSuccessChime();
        onShowToast(`Task "${submittingTask.title}" submitted successfully! Awaiting instructor evaluation.`, 'success');
        setSubmittingTask(null);
        setSubmissionLink('');
        setSubmissionNotes('');
        setAttachmentName('');
        setAttachmentData(null);
        await loadData();
      } else {
        onShowToast(res.error || 'Failed to submit solution.', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Submission failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      {/* Header section matching Canva screenshot 2 */}
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-sky-600 border-l-2 border-sky-500 pl-2.5 inline-block mb-1.5">
          LEARN &amp; BUILD
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Tasks &amp; Evaluation
        </h1>
        <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
          Filter tasks and try the progress controls.
        </p>
      </div>

      {/* Filter Segmented Controls matching Canva: All, Open, Complete */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-sky-100 text-sky-800 shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          All
        </button>

        <button
          type="button"
          onClick={() => setFilter('unsubmitted')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'unsubmitted'
              ? 'bg-sky-100 text-sky-800 shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Open
        </button>

        <button
          type="button"
          onClick={() => setFilter('graded')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'graded'
              ? 'bg-sky-100 text-sky-800 shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Complete
        </button>
      </div>

      {/* 4 Clean High-Density Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Modules</span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
            {materials.length}
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 mt-1 block">Coursework total</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">Submitted Tasks</span>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-700 font-mono tabular-nums mt-1">
            {submissions.length}
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 mt-1 block">Turned in</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">Graded Solutions</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono tabular-nums mt-1">
            {gradedTasks.length}
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 mt-1 block">Evaluated solutions</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <span className={`text-[11px] font-semibold uppercase tracking-wider block ${
            unsubmittedTasks.length > 0 ? 'text-amber-700' : 'text-slate-500'
          }`}>
            Pending Tasks
          </span>
          <div className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums mt-1 ${
            unsubmittedTasks.length > 0 ? 'text-amber-700' : 'text-slate-900'
          }`}>
            {unsubmittedTasks.length}
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 mt-1 block">
            {unsubmittedTasks.length > 0 ? 'Awaiting submission' : 'All caught up!'}
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium bg-white rounded-2xl border border-slate-200">
            Loading course modules and submissions...
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium bg-white rounded-2xl border border-slate-200">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No tasks or modules found matching this filter.
          </div>
        ) : (
          filteredMaterials.map((task) => {
            const submission = submissionMap.get(task.id);
            const isGraded = submission && (submission.status === 'graded' || typeof submission.score_numeric === 'number');
            const isSubmitted = Boolean(submission);

            return (
              <motion.div
                key={task.id}
                whileHover={{ y: -1 }}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3 hover:border-blue-300 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
                      <span className="font-bold text-blue-700">{task.category || 'Robotics Module'}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-mono text-slate-400">Passing: {task.passing_score || 75}/100</span>
                      {(task.deadline || task.due_date) && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Due: {task.deadline || task.due_date}</span>
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {task.title}
                    </h3>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0">
                    {isGraded ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Graded: {submission.score_numeric}/100</span>
                      </div>
                    ) : isSubmitted ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                        <span>Turned In (Under Review)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Not Submitted</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {task.description}
                </p>

                {/* Graded Feedback Card */}
                {isGraded && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5 text-xs text-emerald-950">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>Evaluation Feedback</span>
                      </span>
                      <span className="font-mono text-[10px] text-emerald-700">
                        Evaluated by {submission.graded_by || 'Executive Board'}
                      </span>
                    </div>
                    {submission.feedback && (
                      <p className="text-xs text-emerald-900 bg-white/60 p-2.5 rounded-xl border border-emerald-200/60 leading-relaxed">
                        "{submission.feedback}"
                      </p>
                    )}
                  </div>
                )}

                {/* Submission Details If Already Turned In */}
                {isSubmitted && !isGraded && (
                  <div className="p-3.5 rounded-2xl bg-sky-50/40 border border-sky-100 text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 block">Your Submission Details:</span>
                    {(submission.submission_link || submission.submission_url) && isSafeWebUrl(submission.submission_link || submission.submission_url) && (
                      <a 
                        href={submission.submission_link || submission.submission_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sky-600 hover:underline flex items-center gap-1 font-mono text-[11px] truncate"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{submission.submission_link || submission.submission_url}</span>
                      </a>
                    )}
                    {submission.submission_text && (
                      <p className="text-[11px] text-slate-600 italic">"{submission.submission_text}"</p>
                    )}
                  </div>
                )}

                {/* Action Row */}
                <div className="pt-3 border-t border-sky-100/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {(task.attachment_url || task.file_url) && isSafeWebUrl(task.attachment_url || task.file_url) && (
                      <a
                        href={task.attachment_url || task.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl border border-sky-200 bg-white hover:bg-sky-50 text-sky-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-600" />
                        <span>View Project Materials</span>
                      </a>
                    )}
                  </div>

                  <div>
                    {task.type === 'assignment' && (
                      <button
                        type="button"
                        onClick={() => {
                          playClickTick();
                          setSubmittingTask(task);
                          setSubmissionLink(submission?.submission_link || submission?.submission_url || '');
                          setSubmissionNotes(submission?.submission_text || '');
                          setAttachmentName(submission?.file_name || submission?.attachment_name || '');
                        }}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 ${
                          isGraded 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' 
                            : isSubmitted 
                            ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200' 
                            : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isGraded ? 'Review Work' : isSubmitted ? 'Update Submission' : 'Submit Solution'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Submission Modal */}
      <AnimatePresence>
        {submittingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Submit Solution: {submittingTask.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Category: {submittingTask.category || 'Robotics Module'} · Passing Score: {submittingTask.passing_score || 75}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmittingTask(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitSolution} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
                {/* Project URL input */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Project Link (GitHub, Tinkercad, or Simulator URL)</span>
                  </label>
                  <input
                    type="url"
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    placeholder="https://tinkercad.com/things/... or https://github.com/..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                {/* File Attachment Input */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FileUp className="w-3.5 h-3.5 text-blue-600" />
                    <span>File Attachment (Schematic, Circuit Photo, or .ino sketch)</span>
                  </label>
                  <div className="border border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50 hover:bg-slate-100/50 transition">
                    <input
                      type="file"
                      id="submissionFile"
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".png,.jpg,.jpeg,.pdf,.zip,.ino,.c,.cpp,.py"
                    />
                    <label htmlFor="submissionFile" className="cursor-pointer block">
                      {attachmentName ? (
                        <div className="flex items-center justify-center gap-2 text-blue-600 font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="truncate max-w-[250px]">{attachmentName}</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Click to replace)</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-5 h-5 mx-auto text-slate-400" />
                          <p className="text-[11px] font-semibold text-slate-700">Click to upload file attachment</p>
                          <p className="text-[10px] text-slate-400">Supported: PDF, ZIP, INO, PNG, JPG (Max 10MB)</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Description & Work Notes */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Solution Description &amp; Notes</span>
                  </label>
                  <textarea
                    rows={3}
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="Describe how your circuit functions, libraries used, and pin configurations..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmittingTask(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Submitting...' : 'Turn In Solution'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
