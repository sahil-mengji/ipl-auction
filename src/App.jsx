import { useEffect, useState } from 'react'
import './App.css'
import CenterComponent from './pages/Page1/CenterComponent'
import { fetchSupabaseData } from './utils/getFromRemote'
import { fetchExpensivePlayer } from './utils/expensivePlayer';
import { fetchPrevPlayer } from './utils/previousPlayer';
import { fetchTeamsWithSquads } from './utils/teamswithplayers';
import TeamsWithCompactDesign from './pages/FinalSquad';
import { Route, Router, Routes } from 'react-router-dom';
import { getTeamFromTeamID } from './utils/getTeamfromTeamId';
import { fetchUnsoldPlayers } from './utils/getUnSoldPlayers';
import TimerPage from './pages/TimerPage';
import CricketPlayersTable from './pages/Page1/players_test';
import AudienceView from './pages/AudienceView';
import ControlDashboard from './pages/ControlDashboard';

function App() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [prevPlayer, setPrevPlayer] = useState([]);
  const [expPlayer, setExpPlayer] = useState([]);
  const [teamswithsquad, setTeamsWithSquad] = useState([]);

  const fetchAllPlayers = async () => {
    var res = await fetchUnsoldPlayers('CricketPlayers');
    setPlayers(res);
  }
  const fetchAllTeams = async () => {
    var res = await fetchSupabaseData('Teams');
    setTeams(res);
  }
  const getExpensivePlayer = async () => {
    var res = await fetchExpensivePlayer();
    setExpPlayer(res);
  }
  const getPrevPlayer = async () => {
    var res = await fetchPrevPlayer();
    setPrevPlayer(res);
  }
  const getAllTeamswithplayers = async () => {
    fetchTeamsWithSquads().then((teams) => {
      setTeamsWithSquad(teams);
    });
  }

  useEffect(() => {
    fetchAllPlayers();
    fetchAllTeams();
    getExpensivePlayer();
    getPrevPlayer();
    getAllTeamswithplayers();
  }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={<CenterComponent initteamlist={teamswithsquad} initplayersList={players} />} />
        <Route path="/live" element={<AudienceView />} />
        <Route path="/control" element={<ControlDashboard />} />
        <Route path="/teamswithsquad" element={<TeamsWithCompactDesign />} />
        <Route path="/break" element={<TimerPage />} />
        <Route path="/players" element={<CricketPlayersTable />} />
      </Routes>

    </>
  )
}

export default App