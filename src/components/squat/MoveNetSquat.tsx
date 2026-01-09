import React, { useRef, useCallback, useState, useEffect } from "react";
import VideoFeed from "./VideoFeed";
import { initDetector, drawPose, getAngle } from "./PoseUtils";
import { updateSquatCount } from "./SquatCounter";
import { Keypoint } from "@tensorflow-models/pose-detection";

const FAST_THRESHOLD = 15;
const SLOW_THRESHOLD = 3;
const HINT_HOLD_TIME = 800;
const BACK_LEAN_THRESHOLD = 150;

const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;


const MoveNetSquat: React.FC = () => {
    const detectorRef = useRef<any>(null);
    const prevHipPosition = useRef({ x: 0, y: 0 });
    const countsRef = useRef({ count: 0, isDown: false });
    const counterDivRef = useRef<HTMLDivElement>(null);
    const hintsDivRef = useRef<HTMLDivElement>(null);
    const hintsLogRef = useRef<string[]>([]);
    const lastHintTimeRef = useRef(0);
    const frameCountRef = useRef(0);

    const [aiResponse, setAiResponse] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);


    const handleVideoReady = useCallback(async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
        setIsLoading(true);
        try {
            const detector = await initDetector();
            detectorRef.current = detector;
            setIsLoading(false);
        } catch (error) {
            console.error("Ошибка инициализации MoveNet:", error);
            setIsLoading(false);
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const detect = async () => {
            if (!detectorRef.current || !video.readyState) {
                requestAnimationFrame(detect); // Продолжаем попытки
                return;
            }

            frameCountRef.current++;
            const poses = await detectorRef.current.estimatePoses(video);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            let speedHint = "";
            let techniqueHint = "";
            let depthHint = "";

            if (poses.length > 0) {
                const keypoints = poses[0].keypoints;
                drawPose(ctx, keypoints);

                const newState = updateSquatCount(keypoints, countsRef.current);
                countsRef.current = newState;

                const leftHip = keypoints.find((p: Keypoint) => p.name === "left_hip");
                const leftKnee = keypoints.find((p: Keypoint) => p.name === "left_knee");
                const leftAnkle = keypoints.find((p: Keypoint) => p.name === "left_ankle");
                const leftShoulder = keypoints.find((p: Keypoint) => p.name === "left_shoulder");

                if (leftShoulder && leftHip && leftKnee) {
                    const hipAngle = getAngle(leftShoulder, leftHip, leftKnee);
                    if (hipAngle < BACK_LEAN_THRESHOLD) {
                        techniqueHint = "Тримайте спину рівніше (менше нахилу вперед)";
                    }
                }

                if (leftHip && frameCountRef.current % 10 === 0) {
                    const dx = leftHip.x - prevHipPosition.current.x;
                    const dy = leftHip.y - prevHipPosition.current.y;
                    const speed = Math.sqrt(dx * dx + dy * dy);

                    if (speed > FAST_THRESHOLD) speedHint = "Контролюйте рух, присідайте повільніше";
                    else if (speed < SLOW_THRESHOLD && newState.isDown) speedHint = "Швидше вставайте";

                    prevHipPosition.current = { x: leftHip.x, y: leftHip.y };
                }

                if (leftHip && leftKnee && leftAnkle) {
                    const leftKneeAngle = getAngle(leftHip, leftKnee, leftAnkle);

                    if (newState.isDown) {
                        depthHint = "Відмінно, достатня глибина";
                    } else if (countsRef.current.isDown === false) {
                        if (leftKneeAngle > 100 && leftKneeAngle < 160 && countsRef.current.count > 0) {
                            depthHint = "Спробуйте присісти глибше";
                        } else if (leftKneeAngle > 170) {
                            depthHint = "Випряміться повністю";
                        }
                    }
                }

                const now = Date.now();
                const hintsToDisplay = [techniqueHint, speedHint, depthHint].filter(Boolean);

                if (now - lastHintTimeRef.current > HINT_HOLD_TIME) {
                    lastHintTimeRef.current = now;

                    if (hintsToDisplay.length > 0) {
                        const timestamp = new Date().toLocaleTimeString();
                        if (techniqueHint || speedHint) {
                            hintsLogRef.current.push(`[${timestamp}] ${hintsToDisplay.join(' | ')}`);
                        }
                    }

                    if (hintsDivRef.current) {
                        hintsDivRef.current.innerHTML = hintsToDisplay.map(h => `<div>${h}</div>`).join('');
                    }
                }

                // Обновление HTML счетчика
                if (counterDivRef.current) {
                    counterDivRef.current.innerText = `Присідання: ${countsRef.current.count}`;
                }
            }

            requestAnimationFrame(detect);
        };

        detect();
    }, []);

    const sendHintsToAPI = async () => {
        if (hintsLogRef.current.length === 0) {
            setAiResponse("Немає даних для аналізу. Спробуйте виконати кілька присідань.");
            return;
        }

        setAiResponse("ІІ аналізує ваші підказки...");

        const hintsText = hintsLogRef.current.join("\n");
        const systemPrompt = "Ви — досвідчений тренер зі спорту. Проаналізуйте наданий журнал підказок (технічних та швидкісних зауважень) від системи відстеження присідань. Надайте конструктивний, заохочувальний відгук та одну-дві поради для покращення техніки. Відповідь повинна бути українською.";
        const userQuery = `Ось журнал підказок від системи: \n\n${hintsText}\n\nНадай аналіз та рекомендації.`;

        try {
            const maxRetries = 3;
            let currentDelay = 1000;

            for (let i = 0; i < maxRetries; i++) {
                try {
                    const payload = {
                        contents: [{ parts: [{ text: userQuery }] }],
                        tools: [{ "google_search": {} }],
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                    };

                    const response = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    const aiMessage = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Не вдалося отримати відповідь від ІІ.";
                    setAiResponse(aiMessage);
                    return;
                } catch (error) {
                    console.error(`Спроба ${i + 1} завершилась помилкою:`, error);
                    if (i < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, currentDelay));
                        currentDelay *= 2;
                    } else {
                        throw error;
                    }
                }
            }
        } catch (error: unknown) {
            let errorMessage = "Невідома помилка";
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            setAiResponse(`Помилка під час виклику ІІ: ${errorMessage}`);
        }
    };


    return (
        <div>
            <h1>MoveNet Відстеження Присідань</h1>

            <div>
                {isLoading && (
                    <div>
                        Завантаження моделі...
                    </div>
                )}
                <VideoFeed onVideoReady={handleVideoReady} />

                <div ref={counterDivRef}>Присідання: 0</div>
                <div ref={hintsDivRef}></div>
            </div>

            <button onClick={sendHintsToAPI}>
                Отримати аналіз від Тренера-ІІ
            </button>

            {aiResponse && (
                <div>
                    <h4>Відповідь ІІ:</h4>
                    <p>{aiResponse}</p>
                </div>
            )}
        </div>
    );
};

export default MoveNetSquat;
