import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';

import VideoFeed from '../plank/VideoFeed';
import { isPlankCorrect } from './PoseUtils';
import PlankTimer from './PlankTimer';

const MoveNetPlank: React.FC = () => {
    const [isCorrect, setIsCorrect] = useState(false);
    const [modelReady, setModelReady] = useState(false);
    const [shouldStopCamera, setShouldStopCamera] = useState(false);
    const detectorRef = useRef<poseDetection.PoseDetector | null>(null);

    useEffect(() => {
        const init = async () => {
            await tf.ready();
            detectorRef.current = await poseDetection.createDetector(
                poseDetection.SupportedModels.MoveNet,
                { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
            );
            setModelReady(true);
        };
        init();
    }, []);

    const handleVideoReady = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const runDetection = async () => {
            if (shouldStopCamera) return;

            if (detectorRef.current && video.readyState === 4 && video.videoWidth > 0) {
                try {
                    const poses = await detectorRef.current.estimatePoses(video);

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    if (poses.length > 0) {
                        const pose = poses[0];
                        const check = isPlankCorrect(pose.keypoints);
                        setIsCorrect(check);

                        pose.keypoints.forEach((kp: any) => {
                            if (kp.score > 0.3) {
                                ctx.beginPath();
                                ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
                                ctx.fillStyle = check ? '#00FF00' : '#FF0000';
                                ctx.fill();
                            }
                        });
                    }
                } catch (e) {
                    console.warn("Skipping frame due to MoveNet error:", e);
                }
            }
            requestAnimationFrame(runDetection);
        };

        runDetection();
    };

    return (
        <div className="flex flex-col items-center bg-black p-4 rounded-3xl shadow-2xl">
            <div className="mb-4 w-full flex justify-between items-center px-4">
                <PlankTimer isPlanking={isCorrect && !shouldStopCamera} />
                <div className={`h-3 w-3 rounded-full ${isCorrect ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            </div>

            <div className="relative w-full border-4 border-gray-800 rounded-2xl overflow-hidden">
                {!modelReady && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 text-white">
                        Загрузка ИИ...
                    </div>
                )}
                <VideoFeed onVideoReady={handleVideoReady} shouldStopCamera={shouldStopCamera} />
            </div>

            <button
                onClick={() => setShouldStopCamera(!shouldStopCamera)}
                className={`mt-6 px-10 py-3 rounded-full font-bold transition-all ${
                    shouldStopCamera ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
                } text-white`}
            >
                {shouldStopCamera ? "ПРОДОЛЖИТЬ" : "СТОП"}
            </button>
        </div>
    );
};

export default MoveNetPlank;
