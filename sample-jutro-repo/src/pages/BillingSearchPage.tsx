import { Page, Card, SearchInput, DataTable, Button } from '@jutro/components';
import { useState } from 'react';
import { InvoiceFilterBar } from '@/components/InvoiceFilterBar';

export function BillingSearchPage() {
  const [query, setQuery] = useState('');

  return (
    <Page title="Billing Search">
      <Card>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search invoices, accounts, or policy numbers"
        />
        <InvoiceFilterBar />
        <DataTable
          columns={['Invoice #', 'Account', 'Status', 'Amount', 'Due Date']}
          data={[]}
        />
        <Button variant="secondary">Export Results</Button>
      </Card>
    </Page>
  );
}
