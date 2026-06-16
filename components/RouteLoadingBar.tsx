import React from 'react';

interface RouteLoadingBarProps {
    visible: boolean;
}

const RouteLoadingBar: React.FC<RouteLoadingBarProps> = ({ visible }) => {
    return <div className={`route-loading${visible ? ' visible' : ''}`} />;
};

export default RouteLoadingBar;
