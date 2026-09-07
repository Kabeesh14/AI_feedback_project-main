import { Card, Badge, Button } from '@/components/common/UI';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, Mail, Building2, Calendar, Shield, Bell, Eye, EyeOff, Sparkles } from 'lucide-react';

export function StudentProfile() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your account and privacy settings</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
            <GraduationCap size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{user.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">3rd Year · {user.department || 'Artificial Intelligence & Data Science'}</p>
            <Badge variant="default" className="mt-1">Student</Badge>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <Mail size={18} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <Building2 size={18} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Department</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.department || 'Artificial Intelligence & Data Science'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <Calendar size={18} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Year</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">3rd Year</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <Shield size={18} className="text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Student ID</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">STU-1001</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Privacy Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div className="flex items-center gap-3">
              <EyeOff size={18} className="text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Anonymous by default</p>
                <p className="text-xs text-slate-400">Your identity will not be displayed in HOD/management analytics.</p>
              </div>
            </div>
            <div className="relative h-6 w-11 rounded-full bg-blue-600 cursor-pointer">
              <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm translate-x-5 transition-transform" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Action notifications</p>
                <p className="text-xs text-slate-400">Get notified when HOD takes action on your feedback.</p>
              </div>
            </div>
            <div className="relative h-6 w-11 rounded-full bg-blue-600 cursor-pointer">
              <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm translate-x-5 transition-transform" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">AI assistant suggestions</p>
                <p className="text-xs text-slate-400">Allow AI to suggest categories and issues for your feedback.</p>
              </div>
            </div>
            <div className="relative h-6 w-11 rounded-full bg-blue-600 cursor-pointer">
              <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm translate-x-5 transition-transform" />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Feedback Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">23</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Feedback</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">5</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Under Review</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">12</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Resolved</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
