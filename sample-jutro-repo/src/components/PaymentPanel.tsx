import { Card, DataTable, Button, Badge } from '@jutro/components';
import type { Payment } from '@/types/payment';

export interface PaymentPanelProps {
  claimId: string;
  payments: Payment[];
}

export function PaymentPanel({ claimId, payments }: PaymentPanelProps) {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card title="Payments" subtitle={`Claim ${claimId}`}>
      <DataTable
        columns={['Date', 'Type', 'Amount', 'Status']}
        data={payments.map((p) => [
          p.date,
          p.type,
          `$${p.amount.toLocaleString()}`,
          <Badge key={p.id} variant={p.status === 'Paid' ? 'success' : 'warning'}>{p.status}</Badge>,
        ])}
      />
      <div className="payment-panel__footer">
        <strong>Total Paid: ${total.toLocaleString()}</strong>
        <Button>Issue New Payment</Button>
      </div>
    </Card>
  );
}
