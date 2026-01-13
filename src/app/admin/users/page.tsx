import { createClient } from '@/lib/supabase/server'

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl heading-display text-obsidian-50">Users</h1>
        <p className="text-obsidian-400 mt-1">Manage registered users</p>
      </div>

      {users && users.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-obsidian-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-obsidian-400 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-obsidian-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-obsidian-700 flex items-center justify-center text-obsidian-300 font-medium">
                        {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-obsidian-100">{user.full_name || 'No name'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-obsidian-300">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-obsidian-300">
                    {user.phone || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {user.is_admin ? (
                      <span className="badge badge-gold">Admin</span>
                    ) : (
                      <span className="badge bg-obsidian-700 text-obsidian-300">User</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-obsidian-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-obsidian-400">No users registered yet</p>
        </div>
      )}
    </div>
  )
}
