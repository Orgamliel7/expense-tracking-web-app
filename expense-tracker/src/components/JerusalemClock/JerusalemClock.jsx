import React, { useEffect, useState } from 'react';
import './style.css';

export const JerusalemClock = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const options = { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      const jerusalemTime = new Intl.DateTimeFormat('en-GB', options).format(new Date());
      setTime(jerusalemTime);
    };

    updateClock(); // Initial call
    const intervalId = setInterval(updateClock, 1000); // Update every second

    return () => clearInterval(intervalId); // Cleanup on component unmount
  }, []);

  return <div className="jerusalem-clock">{`🕒 Jerusalem Time: ${time}`}</div>;
};
