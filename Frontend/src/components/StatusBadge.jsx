import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Clock, ShieldCheck, FileSearch } from 'lucide-react';

const StatusBadge = ({ status, size = 'normal', className = '' }) => {
  const normStatus = (status || '').toUpperCase().trim();

  let config = {
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    text: 'text-slate-800',
    icon: Clock,
    label: status || 'UNKNOWN',
  };

  switch (normStatus) {
    case 'PASS':
    case 'COMPLIANT':
    case '✓ PASS':
    case 'POTENTIALLY COMPLIANT':
    case '✓ POTENTIALLY COMPLIANT':
      config = {
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        text: 'text-emerald-800',
        icon: CheckCircle2,
        label: normStatus === 'COMPLIANT' ? '✓ Compliant' : normStatus.includes('POTENTIALLY') ? '✓ Potentially Compliant' : '✓ PASS',
      };
      break;

    case 'REVIEW':
    case 'NEEDS REVIEW':
    case '⚠ REVIEW':
    case 'REQUIRES REVIEW':
    case '⚠ REQUIRES REVIEW':
      config = {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-900',
        icon: AlertTriangle,
        label: normStatus.includes('REQUIRES') ? '⚠ Requires Review' : '⚠ REVIEW',
      };
      break;

    case 'FURTHER_INVESTIGATION_REQUIRED':
    case 'FURTHER INVESTIGATION REQUIRED':
      config = {
        bg: 'bg-violet-50',
        border: 'border-violet-300',
        text: 'text-violet-900',
        icon: AlertTriangle,
        label: '⚠ Further Investigation Required',
      };
      break;

    case 'POTENTIAL NON-COMPLIANCE':
    case 'NON-COMPLIANT':
    case 'NON_COMPLIANT':
    case 'VIOLATION':
    case '! POTENTIAL NON-COMPLIANCE':
      config = {
        bg: 'bg-rose-50',
        border: 'border-rose-300',
        text: 'text-rose-900',
        icon: AlertCircle,
        label: (normStatus === 'NON-COMPLIANT' || normStatus === 'NON_COMPLIANT') ? '! Non-Compliant' : '! Potential Non-Compliance',
      };
      break;

    case 'SUBMITTED':
    case 'ASSIGNED':
      config = {
        bg: 'bg-blue-50',
        border: 'border-blue-300',
        text: 'text-blue-900',
        icon: Clock,
        label: normStatus === 'SUBMITTED' ? 'SUBMITTED' : 'ASSIGNED',
      };
      break;

    case 'UNDER_REVIEW':
    case 'UNDER REVIEW':
      config = {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-900',
        icon: AlertTriangle,
        label: 'UNDER REVIEW',
      };
      break;

    case 'IN PROGRESS':
    case 'IN_PROGRESS':
    case 'UNDER INSPECTION':
    case 'INSPECTION_IN_PROGRESS':
    case 'INSPECTION IN PROGRESS':
      config = {
        bg: 'bg-indigo-50',
        border: 'border-indigo-300',
        text: 'text-indigo-900',
        icon: FileSearch,
        label: 'INSPECTION IN PROGRESS',
      };
      break;

    case 'INSPECTION_COMPLETED':
    case 'INSPECTION COMPLETED':
    case 'RESOLVED':
      config = {
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        text: 'text-emerald-900',
        icon: ShieldCheck,
        label: 'INSPECTION COMPLETED',
      };
      break;

    case 'CLOSED':
      config = {
        bg: 'bg-slate-100',
        border: 'border-slate-300',
        text: 'text-slate-700',
        icon: ShieldCheck,
        label: 'CLOSED',
      };
      break;

    case 'PENDING':
    default:
      config = {
        bg: 'bg-slate-100',
        border: 'border-slate-300',
        text: 'text-slate-800',
        icon: Clock,
        label: status || 'PENDING',
      };
      break;
  }

  const Icon = config.icon;
  const sizeClasses = size === 'large' 
    ? 'px-3.5 py-1.5 text-sm font-semibold' 
    : size === 'small' 
      ? 'px-2 py-0.5 text-xs font-medium' 
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border ${config.bg} ${config.border} ${config.text} ${sizeClasses} ${className}`}
    >
      <Icon className={size === 'large' ? 'w-4 h-4' : 'w-3.5 h-3.5'} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
