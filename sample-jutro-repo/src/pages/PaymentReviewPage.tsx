import { useEffect, useState } from 'react';
import { Page, Card, Grid } from '@jutro/components';
import { PaymentPanel } from '@/components/PaymentPanel';
import { listPendingPayments } from '@/api/paymentApi';
import type { PendingPayment } from '@/types/payment';

export function PaymentReviewPage() {
  const [pending, setPending] = useState<PendingPayment[]>([]);

  useEffect(() => {
    listPendingPayments().then(setPending);
  }, []);

  return (
    <Page title="Payment Review">
      <Card title="Pending Payments" subtitle={`${pending.length} awaiting review`}>
        <Grid columns={1} gap="medium">
          {pending.map((p) => (
            <PaymentPanel key={p.claimId} claimId={p.claimId} payments={p.payments} />
          ))}
        </Grid>
      </Card>
    </Page>
  );
}
