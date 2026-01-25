import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'
import Imports from './pages/Imports'
import Exports from './pages/Exports'
import Settings from './pages/Settings'
import Pipeline from './pages/Pipeline'
import BlinkerGame from './pages/BlinkerGame'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={<LeadDetail />} />
        <Route path="/imports" element={<Imports />} />
        <Route path="/exports" element={<Exports />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/blinker" element={<BlinkerGame />} />
      </Routes>
    </Layout>
  )
}

export default App
