import React, { useEffect, useRef, useCallback } from "react";

interface VideoFeedProps {
    onVideoReady: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
    shouldStopCamera: boolean;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ onVideoReady, shouldStopCamera }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Функція зупинки потоку
    const stopMediaTracks = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const setupCamera = async () => {
            if (shouldStopCamera) return;

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
            stopMediaTracks();
        };
    }, [onVideoReady, stopMediaTracks, shouldStopCamera]);


    useEffect(() => {
        if (shouldStopCamera) {
            stopMediaTracks();
        }
    }, [shouldStopCamera, stopMediaTracks]);


    return (
        <div className="video-feed-container">
            <video ref={videoRef} className="hidden" playsInline muted />

            <canvas ref={canvasRef} width={640} height={480} className={shouldStopCamera ? 'hidden' : 'w-full h-full'} />
            {shouldStopCamera && (
                <div
                    className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-900 text-lg rounded-xl">
                    Виглядаєш потужно, але я тебе не бачу... <br/> Камера вимкнена. Натисніть 'Почати нову сесію'.
                </div>
            )}
        </div>
    );
};

export default VideoFeed;
