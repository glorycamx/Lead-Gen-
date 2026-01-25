import { Link, useLocation } from 'react-router-dom'
import {
  Sun,
  Users,
  Upload,
  Download,
  Settings,
  LayoutDashboard,
  Play,
  Leaf,
  Flame
} from 'lucide-react'
import clsx from 'clsx'

interface LayoutProps {
  children: React.ReactNode
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/imports', label: 'Imports', icon: Upload },
  { path: '/exports', label: 'Exports', icon: Download },
  { path: '/pipeline', label: 'Pipeline', icon: Play },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/blinker', label: 'Blinker Game', icon: Flame }
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Sun className="w-8 h-8 text-solar-400" />
              <Leaf className="w-6 h-6 text-masssave-400 -ml-2" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">MA Solar</h1>
              <p className="text-xs text-gray-400">+ Mass Save Lead Bot</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <Link
                  to={path}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    location.pathname === path
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-500">
            <p>Compliant Lead Generation</p>
            <p className="mt-1">No auto-send. Drafts only.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
