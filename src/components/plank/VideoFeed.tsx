import React, { useEffect, useRef } from 'react';

export interface VideoFeedProps {
    onVideoReady: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
    shouldStopCamera: boolean;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ onVideoReady, shouldStopCamera }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;

        const setupCamera = async () => {
            if (shouldStopCamera) return;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 },
                    audio: false,
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Ждем именно oncanplay, чтобы видео точно было готово
                    videoRef.current.oncanplay = () => {
                        videoRef.current?.play();
                        if (videoRef.current && canvasRef.current && videoRef.current.videoWidth > 0) {
                            onVideoReady(videoRef.current, canvasRef.current);
                        }
                    };
                }
            } catch (err) {
                console.error("Camera error:", err);
            }
        };

        setupCamera();

        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [shouldStopCamera, onVideoReady]);

    return (
        <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden">
            <video ref={videoRef} muted playsInline style={{ display: 'none' }} />
            <canvas ref={canvasRef} width={640} height={480} className="w-full h-auto block transform -scale-x-100" />
        </div>
    );
};

export default VideoFeed;
