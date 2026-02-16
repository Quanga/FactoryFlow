import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { attendanceApi } from '@/lib/api';

interface InfringementReasonDialogProps {
  open: boolean;
  onClose: () => void;
  recordId: number;
  infringementType: 'late_arrival' | 'early_departure';
  employeeName?: string;
}

export default function InfringementReasonDialog({
  open,
  onClose,
  recordId,
  infringementType,
  employeeName,
}: InfringementReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await attendanceApi.updateInfringementReason(recordId, reason.trim());
      setReason('');
      onClose();
    } catch (err) {
      console.error('Failed to save infringement reason:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setReason('');
    onClose();
  };

  const title = infringementType === 'late_arrival' ? 'Late Arrival' : 'Early Departure';
  const description = infringementType === 'late_arrival'
    ? 'You are clocking in after the scheduled start time.'
    : 'You are clocking out before the scheduled end time.';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleSkip(); }}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-infringement-reason">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle data-testid="text-infringement-title">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left" data-testid="text-infringement-description">
            {employeeName && <span className="font-medium">{employeeName}, </span>}
            {description} Please provide a reason below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            placeholder="Enter reason for the infringement..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="resize-none"
            data-testid="input-infringement-reason"
            autoFocus
          />
          {error && <p className="text-sm text-red-500" data-testid="text-infringement-error">{error}</p>}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleSkip}
            data-testid="button-skip-reason"
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            data-testid="button-submit-reason"
          >
            {submitting ? 'Saving...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
