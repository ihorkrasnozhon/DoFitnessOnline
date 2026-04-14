import React from "react";

const Helmet = () => (
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style dangerouslySetInnerHTML={{ __html: `
            body { 
                font-family: 'Inter', sans-serif; 
                background-color: #0d0d0d; 
            }
            .video-canvas canvas {
                transform: scaleX(-1);
                border-radius: 1rem;
                box-shadow: 0 0 40px rgba(128, 0, 128, 0.4); 
                transition: transform 0.3s ease;
            }
            .scroll-box {
                max-height: 400px;
                overflow-y: auto;
                scrollbar-color: #8A2BE2 #1a1a1a;
                scrollbar-width: thin;
            }
            .scroll-box::-webkit-scrollbar {
                width: 6px;
            }
            .scroll-box::-webkit-scrollbar-thumb {
                background: #8A2BE2; 
                border-radius: 3px;
            }
            .scroll-box::-webkit-scrollbar-track {
                background: #1a1a1a;
            }
            @keyframes pulse-active {
                0% { box-shadow: 0 0 0 0 rgba(173, 216, 230, 0.4); }
                70% { box-shadow: 0 0 0 10px rgba(173, 216, 230, 0); }
                100% { box-shadow: 0 0 0 0 rgba(173, 216, 230, 0); }
            }
            .active-pulse {
                animation: pulse-active 2s infinite;
            }
        `}} />
        <title></title>
    </head>
);

export default Helmet;
