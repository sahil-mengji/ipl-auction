import { useEffect, useState } from "react";
import { fetchExpensivePlayer } from "../../utils/expensivePlayer.js";
import { fetchPrevPlayer } from "../../utils/previousPlayer.js";
import { getTeamFromTeamID } from "../../utils/getTeamfromTeamId.js";
import TrapHeader from "../../components/broadcast/TrapHeader";

const LeftComponent = () => {
  function formatPriceInLakhs(price) {
    if (price >= 100) {
      // Convert to crore
      const crore = (price / 100).toFixed(2); // 2 decimal places
      return `${Number(crore).toLocaleString("en-IN")} Crore`;
    } else {
      // Keep it in lakh
      return `${Number(price).toLocaleString("en-IN")} Lakh`;
      // return price;
    }
  }

  const [mostExpensivePlayer1, setPlayerData] = useState([]);
  const [lastSoldPlayer1, setLastSoldPlayer] = useState(null);
  const [mostExpensiveTeam, setMostExpensiveTeam] = useState(null); // Store data2
  const [lastSoldTeam, setLastSoldTeam] = useState(null); // Store data1

  useEffect(() => {
    const getPlayerData = async () => {
      const data = await fetchExpensivePlayer(); // Call the function
      setPlayerData(data); // Save the response array to state
    };

    // Fetch last sold player
    const getLastSoldPlayer = async () => {
      const data = await fetchPrevPlayer();
      setLastSoldPlayer(data);
    };
    getPlayerData(); // Fetch data on component mount
    getLastSoldPlayer();
    /*formatPriceInLakhs(mostExpensivePlayer1[0].final_price);
    formatPriceInLakhs(lastSoldPlayer1[0].final_price);*/
  }, []);
  useEffect(() => {
    if (mostExpensivePlayer1.length > 0) {
      const fetchTeam = async () => {
        const teamData = await getTeamFromTeamID(
          mostExpensivePlayer1[0].sold_to_team_id,
        );
        setMostExpensiveTeam(teamData[0]); // Assuming teamData is an array
      };
      fetchTeam();
    }
  }, [mostExpensivePlayer1]);

  useEffect(() => {
    if (lastSoldPlayer1 && lastSoldPlayer1.length > 0) {
      const fetchTeam = async () => {
        const teamData = await getTeamFromTeamID(
          lastSoldPlayer1[0].sold_to_team_id,
        );
        setLastSoldTeam(teamData[0]); // Assuming teamData is an array
      };
      fetchTeam();
    }
  }, [lastSoldPlayer1]);

  return (
    <div className="pb-8 pt-2 -translate-x-20 pr-5 space-y-3">
      {/* Most Expensive Player */}
      {mostExpensiveTeam?.team_name && (
        <div className="w-96 max-w-full">
          <div className="translate-x-5">
            <TrapHeader gold>Most expensive</TrapHeader>
          </div>
          <div className="bc-card-wrap pr-15 pl-20">
            <div className="bc-card-slant py-4 pr-10 overflow-visible pl-8 relative">
              {/* Player Details */}
              <div className="relative z-10 min-w-0">
                <h2 className="text-2xl font-extrabold bc-gold-text whitespace-nowrap overflow-hidden text-ellipsis">
                  {mostExpensivePlayer1[0].player_name}
                </h2>
                <p className="text-base text-white/60 mt-1">
                  {mostExpensiveTeam?.team_name || "Loading..."}
                </p>
                <div className="bc-para bc-para-gold px-4 py-1 mt-2 inline-block">
                  <p className="text-xl font-extrabold">
                    &#8377;{" "}
                    {formatPriceInLakhs(mostExpensivePlayer1[0].final_price)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Sold Player */}
      {lastSoldTeam?.team_name && (
        <div className="w-96 max-w-full">
          <div className="translate-x-5">
            <TrapHeader>Last sold</TrapHeader>
          </div>
          <div className="bc-card-wrap pr-15 pl-20">
            <div className="bc-card-slant py-4 pr-10 overflow-visible pl-8 relative">
                <div className="relative z-10 min-w-0">
                  <h2 className="text-3xl font-extrabold bc-emboss whitespace-nowrap overflow-hidden text-ellipsis">
                    {lastSoldPlayer1[0].player_name}
                  </h2>
                  <p className="text-base text-white/60 mt-1">
                    {lastSoldTeam?.team_name || "Loading..."}
                  </p>
                  <div className="bc-para px-4 py-1 mt-2 inline-block">
                    <p className="text-xl font-extrabold bc-gold-text">
                    &#8377;{" "}
                    {formatPriceInLakhs(lastSoldPlayer1[0].final_price)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftComponent;
