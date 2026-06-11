import { useEffect, useState } from 'react';
import { Page, Card, Tabs, Tab } from '@jutro/components';
import { ClaimStatusBanner } from '@/components/ClaimStatusBanner';
import { ClaimActivityTimeline } from '@/components/ClaimActivityTimeline';
import { getClaim } from '@/api/claimApi';
import type { Claim } from '@/types/claim';

export interface ClaimDetailPageProps {
  claimId: string;
}

export function ClaimDetailPage({ claimId }: ClaimDetailPageProps) {
  const [claim, setClaim] = useState<Claim | null>(null);

  useEffect(() => {
    getClaim(claimId).then(setClaim);
  }, [claimId]);

  if (!claim) return <Page title="Loading claim…" />;

  return (
    <Page title={`Claim ${claim.number}`}>
      <ClaimStatusBanner status={claim.status} />
      <Tabs defaultActive="details">
        <Tab id="details" label="Details">
          <Card title="Loss Information">
            <p>Type: {claim.lossType}</p>
            <p>Date: {claim.lossDate}</p>
            <p>Description: {claim.lossDescription}</p>
          </Card>
        </Tab>
        <Tab id="activity" label="Activity">
          <ClaimActivityTimeline claimId={claim.id} activities={claim.activities} />
        </Tab>
      </Tabs>
    </Page>
  );
}
