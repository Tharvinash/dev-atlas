import { Banner, Icon } from '@jutro/components';
import clsx from 'clsx';

export type ClaimStatus = 'Open' | 'Under Review' | 'Approved' | 'Denied' | 'Closed';

export interface ClaimStatusBannerProps {
  status: ClaimStatus;
  message?: string;
}

const VARIANT: Record<ClaimStatus, 'info' | 'success' | 'warning' | 'error'> = {
  Open: 'info',
  'Under Review': 'warning',
  Approved: 'success',
  Denied: 'error',
  Closed: 'info',
};

export function ClaimStatusBanner({ status, message }: ClaimStatusBannerProps) {
  return (
    <Banner variant={VARIANT[status]} className={clsx('claim-status-banner')}>
      <Icon name={status === 'Approved' ? 'check' : 'info'} />
      <strong>{status}</strong>
      {message ? <span> — {message}</span> : null}
    </Banner>
  );
}
