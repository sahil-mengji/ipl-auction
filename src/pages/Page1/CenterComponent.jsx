import React, { useState, useEffect, useRef } from "react";
import PlayerCard, { PlayerHero } from "./PlayerCard";
import LeftComponent from "./LeftComponent";
import Overview from "./Overview";
import MetalButton from "../../components/broadcast/MetalButton";

import { Link } from "react-router-dom";
import ReactConfetti from "react-confetti";
import { markPlayerAsSold } from "../../utils/updatePlayer";
import { fetchTeamsWithSquads } from "../../utils/teamswithplayers";
import { fetchUnsoldPlayers } from "../../utils/getUnSoldPlayers";
import { updatePurseOfTeam } from "../../utils/updateTeam";
import AuctionShell from "../../components/AuctionShell";
import CurrentBidWidget from "../../components/CurrentBidWidget";
import { playBidPlaced, playTrumpet } from "../../utils/sound";

const CenterComponent = ({ initteamlist, initplayersList }) => {
  const [isPlayerSold, setIsPlayerSold] = useState(false);
  const [showPlayerCard, setShowPlayerCard] = useState(false);
  const [showHammer, setShowHammer] = useState(false);
  const [currentBidder, setCurrentBidder] = useState(null);
  const [currentBidderId, setCurrentBidderId] = useState(0);
  const [currentBid, setCurrentBid] = useState(0);
  const [bidHistory, setBidHistory] = useState([]);
  const [playersList, setPlayersList] = useState(initplayersList);
  const [teamsList, setTeamsList] = useState(initteamlist);
  useEffect(() => {
    setPlayersList(initplayersList);
  }, [initplayersList]);
  useEffect(() => {
    if (!showPlayerCard) getTeamAndPlayers();
  }, []);

  useEffect(() => {
    setTeamsList(initteamlist);
  }, [initteamlist]);

  // Local bid history for the widget: reset on a new lot, append on each bid.
  const activePlayerId = playersList[0]?.id ?? null;
  useEffect(() => {
    setBidHistory([]);
  }, [activePlayerId]);
  useEffect(() => {
    if (currentBid > 0 && currentBidder) {
      setBidHistory((h) =>
        h.length > 0 && h[h.length - 1].amount === currentBid
          ? h
          : [...h, { amount: currentBid, teamName: currentBidder }],
      );
    }
  }, [currentBid, currentBidder]);
  const getTeamAndPlayers = async () => {
    fetchUnsoldPlayers().then((players) => {
      setPlayersList(players);
    });
    fetchTeamsWithSquads().then((teams) => {
      setTeamsList(teams);
    });
  };

  const markAsSold = async () => {
    setShowHammer(true);
    playTrumpet();
    var player = playersList[0];
    const { id, final_price, sold_to_team_id, sold_to_team } = player;
    try {
      await markPlayerAsSold(id, final_price, sold_to_team_id, sold_to_team);
    } catch (error) {
      console.error("Error in marking as sold:", error.message);
    }
    var team = teamsList[sold_to_team_id - 1];
    team.purse = team.purse - final_price;
    try {
      await updatePurseOfTeam(sold_to_team_id, team.purse);
    } catch (error) {
      console.error("Error in marking as sold:", error.message);
    }
    setTimeout(() => {
      setShowHammer(false);
      setShowPlayerCard(true);
      setIsPlayerSold(true);
    }, 2000);
  };

  const nextPlayer = async () => {
    setShowPlayerCard(false);
    setIsPlayerSold(false);
    setCurrentBid(0);
    setBidHistory([]);
    setCurrentBidderId(0);
    setCurrentBidder(null);
    await getTeamAndPlayers();
  };

  const markAsUnSold = async () => {
    try {
      await markPlayerAsSold(playersList[0].id, 0, -1, null);
    } catch (error) {
      console.error("Error in marking as unsold:", error.message);
    }
    setCurrentBid(0);
    setBidHistory([]);
    setCurrentBidderId(0);
    setCurrentBidder(null);
    await getTeamAndPlayers();
  };
  const handleKeyPress = async (event) => {
    var key = event.key;
    if (key >= 0 && key <= teamsList.length) {
      if (key == 0) {
        key = 10;
      }
      setCurrentBid((prevBid) => {
        let final_bid;
        if (prevBid === 0) {
          final_bid = playersList[0].base_price;
        } else if (prevBid === 150) {
          final_bid = prevBid + 10;
        } else if (prevBid < 100) {
          final_bid = prevBid + 10;
        } else if (prevBid < 500) {
          final_bid = prevBid + 20;
        } else {
          final_bid = prevBid + 25;
        }
        var bidding_team = teamsList[key - 1].name;
        var bidding_team_purse = teamsList[key - 1].purse;
        if (final_bid > bidding_team_purse) {
          return prevBid;
        } else {
          setCurrentBidder(bidding_team);
          setCurrentBidderId(key);
          try {
            setPlayersList((prevList) => {
              const updatedList = [...prevList];
              updatedList[0] = {
                ...updatedList[0],
                final_price: final_bid,
                sold_to_team_id: parseInt(key),
                sold_to_team: bidding_team,
              };
              return updatedList;
            });
          } catch (error) {
            console.error("Error during bidding:", error.message);
          }
        }
        return final_bid;
      });
    }
  };
  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [teamsList]);

  // Bid cha-ching on every new paddle (silent on reset / mount).
  useEffect(() => {
    if (currentBid > 0) playBidPlaced();
  }, [currentBid]);
  const centerPane = (
    <>
      {playersList.length > 0 && (
        <PlayerHero
          player={playersList[0]}
          showHammer={showHammer}
          currentBidder={currentBidder}
          currentBid={currentBid}
          showPlayerCard={showPlayerCard}
          docked
          actions={
            <div className="flex flex-wrap gap-3 justify-center">
              {currentBid > 0 && (
                <MetalButton tone="green" onClick={markAsSold}>
                  Mark as Sold
                </MetalButton>
              )}
              <Link to="/teamswithsquad">
                <MetalButton>Team Squad</MetalButton>
              </Link>
              <Link to="/break">
                <MetalButton>Break</MetalButton>
              </Link>
              <MetalButton tone="danger" onClick={markAsUnSold}>
                Mark as Unsold
              </MetalButton>
            </div>
          }
        />
      )}
      {playersList.length == 0 && (
        <div className="text-center">
          <h1 className="text-2xl mb-5">No Players Left</h1>
          <Link
            to={"/teamswithsquad"}
            className="flexw-36 h-12 max-w-xs bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Team Squad
          </Link>
        </div>
      )}
    </>
  );

  // Right column stays empty on classic: bid/price live in the top-right
  // widget and the docked ticket instead.
  const rightPane = null;

  return (
    <div className={`min-h-screen bc-shell-bg  text-white`}>
      {!isPlayerSold && !showPlayerCard && (
        <>
          <CurrentBidWidget
            bid={currentBid}
            team={teamsList.find((t) => (t.name ?? t.team_name) === currentBidder) ?? null}
            recentBids={bidHistory.slice(-4, -1).reverse()}
          />
          <AuctionShell
          left={
            <>
              <LeftComponent />
              <Overview />
            </>
          }
          center={centerPane}
          right={rightPane}
          topRight={
            <>
              <Link
                to="/"
                className="bg-white/10 text-white text-xs px-3 py-1.5 rounded hover:bg-white/20"
              >
                Live
              </Link>
              <Link
                to="/control"
                className="bg-white/10 text-white text-xs px-3 py-1.5 rounded hover:bg-white/20"
              >
                Control
              </Link>
            </>
          }
          />
        </>
      )}

      {showPlayerCard && (
        <div className="flex flex-col items-center">
          {isPlayerSold && (
            <ReactConfetti
              width={window.innerWidth}
              height={window.innerHeight}
            />
          )}
          <h1
            className="text-center pt-2 relative heading-font text-5xl mt-6 py-8 mb-20 z-20"
            style={{ textShadow: "4px 4px 0px #4f829c" }}
          >
            Player Sold
          </h1>
          {playersList.length > 0 && (
            <PlayerCard
              key={0}
              player={playersList[0]}
              onSold={setIsPlayerSold}
              currentBidder={currentBidder}
              currentBid={currentBid}
              showPlayerCard={showPlayerCard}
            />
          )}
          <div className="text-center mt-4 flex gap-4">
            <button
              onClick={nextPlayer}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 relative z-30"
            >
              Next Player
            </button>

            <Link
              to={"/break"}
              className="relative z-30 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Break
            </Link>
            <Link
              to={"/teamswithsquad"}
              className="relative z-30 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Team Squad
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterComponent;
