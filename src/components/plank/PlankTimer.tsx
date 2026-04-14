import React, { useEffect, useState } from 'react';

interface Props {
    isPlanking: boolean;
}

const PlankTimer: React.FC<Props> = ({ isPlanking }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlanking) {
            interval = setInterval(() => {
                setSeconds((prev) => +(prev + 0.1).toFixed(1));
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPlanking]);

    return (
        <div style={{ fontSize: '2rem', color: isPlanking ? 'green' : 'red' }}>
            Час в планці: {seconds}с
            {isPlanking ? " 🔥" : " ❌ Тримай спину рівно!"}
        </div>
    );
};

export default PlankTimer;
