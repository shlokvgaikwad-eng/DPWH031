import { CheckCircle, WarningCircle, Gavel, ShieldWarning, ArrowsClockwise } from '@phosphor-icons/react';
import { Truck, Anchor as AnchorIcon, ShieldCheck } from '@phosphor-icons/react';

// Shipment Tracking statuses (at_port, in_transit, customs_hold, delivered)
export const TRACKING_STATUS = {
  at_port: { label: 'At Port', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: AnchorIcon },
  in_transit: { label: 'In Transit', color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: Truck },
  customs_hold: { label: 'Customs Hold', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: ShieldCheck },
  delivered: { label: 'Delivered', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle },
};

// Shipment History statuses (delivered, delayed, customs_hold, dispute)
export const HISTORY_STATUS = {
  delivered: { label: 'Delivered', color: '#10B981', icon: CheckCircle },
  delayed: { label: 'Delayed', color: '#F97316', icon: WarningCircle },
  customs_hold: { label: 'Customs Hold', color: '#EF4444', icon: ShieldWarning },
  dispute: { label: 'Dispute', color: '#EF4444', icon: Gavel },
};

// Pipeline / Ingestion statuses (active, syncing, error)
export const PIPELINE_STATUS = {
  active: { color: '#10B981', label: 'Active', icon: CheckCircle },
  syncing: { color: '#3B82F6', label: 'Syncing', icon: ArrowsClockwise },
  error: { color: '#EF4444', label: 'Error', icon: WarningCircle },
};
