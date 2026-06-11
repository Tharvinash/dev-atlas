import { Page, Card, Grid, Tabs, Tab } from '@jutro/components';
import { CoverageTable } from '@/components/CoverageTable';
import { PolicyHolderCard } from '@/components/PolicyHolderCard';
import type { Policy } from '@/types/policy';

export interface PolicyOverviewPageProps {
  policy: Policy;
}

export function PolicyOverviewPage({ policy }: PolicyOverviewPageProps) {
  return (
    <Page title={`Policy ${policy.number}`}>
      <Grid columns={3}>
        <PolicyHolderCard holder={policy.primaryInsured} />
        <Card title="Term">
          <p>{policy.effectiveDate} → {policy.expirationDate}</p>
        </Card>
        <Card title="Premium">
          <p>${policy.premium.toLocaleString()}</p>
        </Card>
      </Grid>
      <Tabs defaultActive="coverages">
        <Tab id="coverages" label="Coverages">
          <CoverageTable coverages={policy.coverages} />
        </Tab>
        <Tab id="documents" label="Documents" />
      </Tabs>
    </Page>
  );
}
