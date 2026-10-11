import React, { useState, useEffect } from 'react';
import { X, Sliders, Check, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';

export const PreferencesModal = ({
  isOpen,
  onClose,
  initialPreferences = {},
  onSave,
  isSaving = false,
}) => {
  const [desiredRole, setDesiredRole] = useState('');
  const [targetLevel, setTargetLevel] = useState('Mid');
  const [preferredIndustry, setPreferredIndustry] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDesiredRole(initialPreferences.desiredRole || '');
      setTargetLevel(initialPreferences.targetLevel || 'Mid');
      setPreferredIndustry(initialPreferences.preferredIndustry || '');
      setValidationError('');
    }
  }, [isOpen, initialPreferences]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const payload = {};
    if (desiredRole.trim()) payload.desiredRole = desiredRole.trim();
    if (targetLevel) payload.targetLevel = targetLevel;
    if (preferredIndustry.trim()) payload.preferredIndustry = preferredIndustry.trim();

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setValidationError(err.message || 'Failed to update preferences.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3>Customize Career Preferences</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {validationError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              {validationError}
            </div>
          )}

          {/* Desired Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Desired Job Role
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Full-Stack Engineer"
              value={desiredRole}
              onChange={(e) => setDesiredRole(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400">
              Your primary target role for tailored recommendations and roadmaps.
            </p>
          </div>

          {/* Seniority Target Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Target Seniority Level
            </label>
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Junior">Junior / Entry Level</option>
              <option value="Mid">Mid-Level</option>
              <option value="Senior">Senior</option>
              <option value="Lead">Lead / Principal</option>
            </select>
          </div>

          {/* Preferred Industry */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Preferred Industry / Domain
            </label>
            <input
              type="text"
              placeholder="e.g. Fintech, HealthTech, Enterprise SaaS"
              value={preferredIndustry}
              onChange={(e) => setPreferredIndustry(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PreferencesModal;
