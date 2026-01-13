import { createClient } from '@/lib/supabase/server'

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, profiles(full_name, email), auctions(title)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl heading-display text-obsidian-50">Invoices</h1>
        <p className="text-obsidian-400 mt-1">Manage auction invoices and payments</p>
      </div>

      {invoices && invoices.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-obsidian-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-800">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-obsidian-800/50">
                  <td className="px-6 py-4">
                    <p className="font-mono text-obsidian-100 text-sm">
                      {invoice.id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-obsidian-500">
                      {(invoice.auctions as { title: string })?.title}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-obsidian-100">
                      {(invoice.profiles as { full_name: string })?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-obsidian-500">
                      {(invoice.profiles as { email: string })?.email}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-dgw-gold font-semibold">
                    ${invoice.total?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${
                      invoice.status === 'paid' ? 'badge-success' :
                      invoice.status === 'pending' ? 'badge-gold' :
                      invoice.status === 'failed' ? 'badge-live' :
                      'bg-obsidian-700 text-obsidian-300'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-obsidian-400 text-sm">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-obsidian-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-obsidian-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-obsidian-100 mb-2">No invoices yet</h3>
          <p className="text-obsidian-400">Invoices will appear here after auctions end</p>
        </div>
      )}
    </div>
  )
}
