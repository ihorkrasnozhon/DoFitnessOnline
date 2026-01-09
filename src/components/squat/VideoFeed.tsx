import React, { useEffect, useRef } from "react";

interface VideoFeedProps {
    onVideoReady: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ onVideoReady }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let cancelled = false;

        const setupCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 },
                });

                if (cancelled) return;

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;

                    await new Promise<void>((resolve) => {
                        videoRef.current!.onloadedmetadata = () => resolve();
                    });

                    await videoRef.current.play();
                }

                if (videoRef.current && canvasRef.current) {
                    onVideoReady(videoRef.current, canvasRef.current);
                }
            } catch (err) {
                console.error("Ошибка доступа к камере:", err);
            }
        };

        setupCamera();

        return () => {
            cancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, [onVideoReady]);

    return (
        <div>
            <video ref={videoRef} style={{ display: "none" }} playsInline muted />
            <canvas ref={canvasRef} width={640} height={480} />
        </div>
    );
};

export default VideoFeed;
