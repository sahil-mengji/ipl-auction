import './App.css'
import { Route, Routes } from 'react-router-dom';
import AudienceView from './pages/AudienceView';
import ControlDashboard from './pages/ControlDashboard';

// Only two routes: the broadcast screen (/) and the control board.
// Everything the crowd sees (bidding, squads, break, chart) is switched
// remotely from /control's Live tab.
function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<AudienceView />} />
        <Route path="/control" element={<ControlDashboard />} />
      </Routes>

    </>
  )
}

export default App
