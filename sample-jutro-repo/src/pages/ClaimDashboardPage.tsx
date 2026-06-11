import { useState } from 'react';
import { Page, Card, Tabs, Tab, Select } from '@jutro/components';
import { ClaimSummaryPage } from '@/pages/ClaimSummaryPage';
import { ClaimDetailPage } from '@/pages/ClaimDetailPage';
import { ClaimReviewPanel } from '@/components/ClaimReviewPanel';
import { listOpenClaims } from '@/api/claimApi';
import type { Claim } from '@/types/claim';

export function ClaimDashboardPage() {
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [openClaims, setOpenClaims] = useState<Claim[]>([]);

  const refresh = () =>
    listOpenClaims().then((claims) => {
      setOpenClaims(claims);
      if (!activeClaimId && claims.length > 0) {
        setActiveClaimId(claims[0].id);
        setClaim(claims[0]);
      }
    });

  return (
    <Page title="Claim Dashboard">
      <Card title="Active Claims">
        <Select
          value={activeClaimId ?? ''}
          onChange={setActiveClaimId}
          options={openClaims.map((c) => ({ id: c.id, label: c.number }))}
        />
      </Card>
      {activeClaimId ? (
        <Tabs defaultActive="summary">
          <Tab id="summary" label="Summary">
            <ClaimSummaryPage claimId={activeClaimId} />
          </Tab>
          <Tab id="detail" label="Detail">
            <ClaimDetailPage claimId={activeClaimId} />
          </Tab>
          <Tab id="review" label="Review">
            {claim ? (
              <ClaimReviewPanel claim={claim} onActionComplete={refresh} />
            ) : null}
          </Tab>
        </Tabs>
      ) : null}
    </Page>
  );
}
