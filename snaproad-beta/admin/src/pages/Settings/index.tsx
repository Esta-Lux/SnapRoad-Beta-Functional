export default function Settings() {
  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage admin settings and configurations</p>
      </div>

      <div className="grid gap-6">
        {/* Profile section */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Profile Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                defaultValue="Admin User"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                defaultValue="admin@snaproad.co"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                disabled
              />
            </div>
          </div>
          <button className="mt-4 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-6 rounded-lg">
            Save Changes
          </button>
        </div>

        {/* API Keys section */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">API Configuration</h2>
          <p className="text-slate-400 text-sm mb-4">Manage API keys and external service configurations</p>
          <div className="space-y-4">
            {['Mapbox API Key', 'AWS Access Key', 'Stripe Secret Key'].map((key) => (
              <div key={key} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">{key}</p>
                  <p className="text-slate-400 text-sm">••••••••••••</p>
                </div>
                <button className="text-primary-400 hover:text-primary-300 text-sm">Update</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
