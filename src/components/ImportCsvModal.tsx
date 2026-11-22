import React from 'react';
import { Member, AttendanceRecord, CashTransaction, UserSession } from '../types';
import { UniversalDataUploadModal } from './UniversalDataUploadModal';
import { ImportTargetType } from '../utils/universalDataParser';

export interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTarget?: ImportTargetType;
  existingMembers: Member[];
  existingCash?: CashTransaction[];
  existingAttendance?: AttendanceRecord[];
  isDemo?: boolean;
  session?: UserSession | null;
  onSuccess?: (importedCount: number, updatedMembers: Member[]) => void;
  onCashSuccess?: (importedCount: number, updatedCash: CashTransaction[]) => void;
  onAttendanceSuccess?: (importedCount: number, updatedAttendance: AttendanceRecord[]) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/**
 * Backward-compatible & upgraded Import Modal supporting PDF, Excel (.xlsx, .xls),
 * CSV, TSV, and clipboard paste from Google Sheets / Excel.
 */
export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  defaultTarget = 'members',
  existingMembers,
  existingCash = [],
  existingAttendance = [],
  isDemo = false,
  session,
  onSuccess,
  onCashSuccess,
  onAttendanceSuccess,
  onShowToast,
}) => {
  return (
    <UniversalDataUploadModal
      isOpen={isOpen}
      onClose={onClose}
      defaultTarget={defaultTarget}
      existingMembers={existingMembers}
      existingCash={existingCash}
      existingAttendance={existingAttendance}
      isDemo={isDemo}
      session={session}
      onMembersUpdated={(updated) => {
        onSuccess?.(updated.length, updated);
      }}
      onCashUpdated={(updated) => {
        onCashSuccess?.(updated.length, updated);
      }}
      onAttendanceUpdated={(updated) => {
        onAttendanceSuccess?.(updated.length, updated);
      }}
      onShowToast={onShowToast}
    />
  );
};
