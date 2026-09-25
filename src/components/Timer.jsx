/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";

const Timer = ({ auctionEndTime }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  function calculateTimeLeft() {
    console.log(new Date(auctionEndTime));
    const difference = new Date(auctionEndTime) - new Date();
    if (difference > 0) {
      return {
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
      return null;
    }
  }
  useEffect(() => {
    if (auctionEndTime) {
      setTimeLeft(calculateTimeLeft(auctionEndTime));
    }
  }, [auctionEndTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(() => {
        const updatedTimeLeft = calculateTimeLeft(auctionEndTime);
        return updatedTimeLeft ? { ...updatedTimeLeft } : null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [auctionEndTime]);
  if (!timeLeft) {
    return (
      <div className="text-red-600 text-xl font-bold text-center">
        Auction Ended
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center text-white w-full">
      <h1 className="text-2xl font-bold mb-2 bc-emboss uppercase tracking-[0.2em]">IPL Auction Countdown</h1>
      <div className="flex space-x-4">
        <div className="text-center">
          <p className="text-7xl font-extrabold bc-gold-text">{timeLeft.hours}</p>
          <p className="text-sm uppercase text-white/60">Hours</p>
        </div>
        <div className="text-center">
          <p className="text-7xl font-extrabold bc-gold-text">{timeLeft.minutes}</p>
          <p className="text-sm uppercase text-white/60">Minutes</p>
        </div>
        <div className="text-center">
          <p className="text-7xl font-extrabold bc-gold-text">{timeLeft.seconds}</p>
          <p className="text-sm uppercase text-white/60">Seconds</p>
        </div>
      </div>
      <p className="mt-4 text-white/60 text-sm">
        Auction ends at{" "}
        <span className="text-white font-medium">
          {new Date(auctionEndTime).toLocaleString()}
        </span>
      </p>
    </div>
  );
};

export default Timer;
