import { AlertCircle, Tv2 } from 'lucide-react'

interface Props {
  onSignIn: () => void
  gsiReady: boolean
  error: string | null
}

export function LandingPage({ onSignIn, gsiReady, error }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8">

        {/* Logo & name */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Tv2 className="w-10 h-10 text-red-500 opacity-60" />
            <h1 className="text-4xl font-bold text-slate-50 tracking-tight">QuieTube</h1>
          </div>
          <p className="text-slate-400 text-lg leading-relaxed">
            Find the YouTube channels that went silent.<br />
            Sort your subscriptions by last upload and quietly let go.
          </p>
        </div>

        {/* Feature bullets */}
        <ul className="text-slate-500 text-sm space-y-2 text-left max-w-xs mx-auto">
          {[
            'See every subscription sorted by last upload date',
            'One-click unsubscribe with a 5-second undo window',
            'Results cached for 24 hours to save your API quota',
            'No data ever leaves your browser',
          ].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5 shrink-0">•</span>
              {f}
            </li>
          ))}
        </ul>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-950/50 border border-red-800 rounded-lg p-3 text-red-300 text-sm text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Sign-in button */}
        <button
          onClick={onSignIn}
          disabled={!gsiReady}
          className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
        >
          {gsiReady ? 'Sign in with Google' : 'Loading…'}
        </button>

        <p className="text-slate-600 text-xs">
          Requires read access to your YouTube subscriptions and permission to unsubscribe.
          Your token is held in memory only and cleared when you leave.
        </p>
      </div>
    </div>
  )
}
