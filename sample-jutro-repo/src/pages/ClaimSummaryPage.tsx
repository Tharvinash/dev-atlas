import { useEffect, useState } from 'react';
import { Page, Card, Grid, Button } from '@jutro/components';
import { ClaimStatusBanner } from '@/components/ClaimStatusBanner';
import { PaymentPanel } from '@/components/PaymentPanel';
import { ClaimActivityTimeline } from '@/components/ClaimActivityTimeline';
import { getClaimSummary } from '@/api/claimApi';
import type { Claim } from '@/types/claim';

export interface ClaimSummaryPageProps {
  claimId: string;
}

export function ClaimSummaryPage({ claimId }: ClaimSummaryPageProps) {
  const [claim, setClaim] = useState<Claim | null>(null);

  useEffect(() => {
    getClaimSummary(claimId).then(setClaim);
  }, [claimId]);

  if (!claim) {
    return <Page title="Loading claim…" />;
  }

  return (
    <Page title={`Claim ${claim.number}`}>
      <ClaimStatusBanner status={claim.status} />
      <Grid columns={2} gap="large">
        <Card title="Claimant">
          <p>{claim.claimantName}</p>
          <p>{claim.claimantEmail}</p>
        </Card>
        <Card title="Loss Details">
          <p>Type: {claim.lossType}</p>
          <p>Date: {claim.lossDate}</p>
        </Card>
      </Grid>
      <PaymentPanel claimId={claim.id} payments={claim.payments} />
      <ClaimActivityTimeline claimId={claim.id} activities={claim.activities} />
      <Button onClick={() => console.log('open')}>Open Full Claim</Button>
    </Page>
  );
}
