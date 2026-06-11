import { Card, Grid, Button } from '@jutro/components';
import { ClaimStatusBanner } from '@/components/ClaimStatusBanner';
import type { Claim } from '@/types/claim';
import { approveClaim, declineClaim } from '@/api/claimApi';

export interface ClaimReviewPanelProps {
  claim: Claim;
  onActionComplete?: () => void;
}

export function ClaimReviewPanel({ claim, onActionComplete }: ClaimReviewPanelProps) {
  const onApprove = async () => {
    await approveClaim(claim.id);
    onActionComplete?.();
  };
  const onDecline = async () => {
    await declineClaim(claim.id);
    onActionComplete?.();
  };

  return (
    <Card title="Review Decision" subtitle={`Claim ${claim.number}`}>
      <ClaimStatusBanner status={claim.status} />
      <Grid columns={2} gap="medium">
        <Card title="Coverage">
          <p>Type: {claim.coverageType}</p>
          <p>Limit: ${claim.coverageLimit.toLocaleString()}</p>
        </Card>
        <Card title="Outstanding">
          <p>${claim.outstandingAmount.toLocaleString()}</p>
        </Card>
      </Grid>
      <div className="claim-review-panel__actions">
        <Button variant="primary" onClick={onApprove}>
          Approve
        </Button>
        <Button variant="secondary" onClick={onDecline}>
          Decline
        </Button>
      </div>
    </Card>
  );
}
