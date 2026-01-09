import React, { useRef, useCallback, useState } from "react";
import VideoFeed from "./VideoFeed";
import { initDetector, drawPose, getAngle, checkReadyPose, checkEndPose } from "./PoseUtils";
import { updateArmBendCount } from "./ArmBendCounter";
import { Keypoint } from "@tensorflow-models/pose-detection";

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
    </head>
);

const MoveNetArmBend: React.FC = () => {
    const FAST_THRESHOLD = 1;
    const SLOW_THRESHOLD = 3;
    const HINT_HOLD_TIME = 500;
    const END_POSE_HOLD_FRAMES = 40;

    const prevPositions = useRef({
        leftElbow: { x: 0, y: 0 },
        rightElbow: { x: 0, y: 0 },
    });

    const countsRef = useRef({ leftCount: 0, rightCount: 0 });
    const armStateRef = useRef({ leftArmUp: false, rightArmUp: false });
    const counterDivRef = useRef<HTMLDivElement>(null);
    const hintsDivRef = useRef<HTMLDivElement>(null);

    const lastHintsRef = useRef({ left: "", right: "", sync: "" });
    const lastHintTimeRef = useRef(0);
    const frameCountRef = useRef(0);
    const hintsLogRef = useRef<string[]>([]);

    const endPoseFrameCountRef = useRef(0);

    const [aiResponse, setAiResponse] = useState<string>("");
    const [isTrackingActive, setIsTrackingActive] = useState(false);
    const [isTrackingComplete, setIsTrackingComplete] = useState(false);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

    const detectorRef = useRef<any>(null);

    const [shouldStopCamera, setShouldStopCamera] = useState(false);

    const reloadPage = () => {
        window.location.reload();
    };


    const handleVideoReady = useCallback(async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {

        let detectorInstance = detectorRef.current;
        if (!detectorInstance) {
            detectorInstance = await initDetector();
            detectorRef.current = detectorInstance;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx || !detectorInstance) return;

        let animationFrameId: number;

        const detect = async () => {

            let leftHint = "";
            let rightHint = "";
            let syncHint = "";

            if (shouldStopCamera) {
                requestAnimationFrame(detect);
                return;
            }

            frameCountRef.current++;

            if (video.videoWidth === 0 || video.videoHeight === 0) {
                animationFrameId = requestAnimationFrame(detect);
                return;
            }

            const poses = await detectorInstance.estimatePoses(video);

            if (poses.length === 0) {
                requestAnimationFrame(detect);
                return;
            }

            const keypoints = poses[0].keypoints;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            drawPose(ctx, keypoints);

            if (poses.length > 0) {

                const leftShoulder = keypoints.find((p: Keypoint) => p.name === "left_shoulder");
                const leftElbow = keypoints.find((p: Keypoint) => p.name === "left_elbow");
                const leftWrist = keypoints.find((p: Keypoint) => p.name === "left_wrist");
                const rightShoulder = keypoints.find((p: Keypoint) => p.name === "right_shoulder");
                const rightElbow = keypoints.find((p: Keypoint) => p.name === "right_elbow");
                const rightWrist = keypoints.find((p: Keypoint) => p.name === "right_wrist");


                if (isTrackingComplete) {

                    if (checkReadyPose(keypoints)) {
                        endPoseFrameCountRef.current++;

                        if (hintsDivRef.current) {
                            const holdTime = Math.round(endPoseFrameCountRef.current / 30);
                            hintsDivRef.current.innerHTML = `<div class="text-indigo-400">Сесія завершена. Утримуйте позу 'руки по швах' для початку нового тренування (${holdTime} сек.).</div>`;
                        }

                        if (endPoseFrameCountRef.current > END_POSE_HOLD_FRAMES) {
                            window.location.reload();
                            return;
                        }
                    } else {
                        endPoseFrameCountRef.current = 0;
                        if (hintsDivRef.current) {
                            hintsDivRef.current.innerHTML = "<div>Сесія завершена. Натисніть кнопку 'Аналіз' або прийміть позу початку для рестарту.</div>";
                        }
                    }

                    requestAnimationFrame(detect);
                    return;
                }


                if (!isTrackingActive) {
                    if (checkReadyPose(keypoints)) {
                        setIsTrackingActive(true);
                        console.log("Тренування активовано!");
                        if (hintsDivRef.current) {
                            hintsDivRef.current.innerHTML = "<div>Розпочинайте тренування!</div>";
                        }
                    } else {
                        if (hintsDivRef.current) {
                            hintsDivRef.current.innerHTML = "<div>Прийміть початкову позу: руки випрямлені та опущені вздовж корпусу.</div>";
                        }
                    }
                } else {
                    if (checkEndPose(keypoints)) {
                        endPoseFrameCountRef.current++;
                        const holdTime = Math.round(endPoseFrameCountRef.current / 30);

                        if (hintsDivRef.current) {
                            hintsDivRef.current.innerHTML = `<div class="text-pink-400">Утримуйте позу завершення... (${holdTime} сек.)</div>`;
                        }

                        if (endPoseFrameCountRef.current >= END_POSE_HOLD_FRAMES) {
                            setIsTrackingActive(false);
                            setIsTrackingComplete(true);
                            endPoseFrameCountRef.current = 0;
                            setShouldStopCamera(true);
                            console.log("Тренування завершено позою.");
                        }
                    } else {
                        if (endPoseFrameCountRef.current > 0) {
                            endPoseFrameCountRef.current = 0;
                            if (hintsDivRef.current) {
                                hintsDivRef.current.innerHTML = "<div>Продовжуйте тренування або знову прийміть позу завершення.</div>";
                            }
                        }
                    }
                }

                if (isTrackingActive) {

                    const newCounts = updateArmBendCount(keypoints, {
                        leftCount: countsRef.current.leftCount,
                        rightCount: countsRef.current.rightCount,
                        leftArmUp: armStateRef.current.leftArmUp,
                        rightArmUp: armStateRef.current.rightArmUp,
                    });

                    countsRef.current = {
                        leftCount: newCounts.leftCount,
                        rightCount: newCounts.rightCount,
                    };
                    armStateRef.current = {
                        leftArmUp: newCounts.leftArmUp,
                        rightArmUp: newCounts.rightArmUp,
                    };

                    let leftSpeedHint = "";
                    let rightSpeedHint = "";

                    if (frameCountRef.current % 2 === 0) {
                        const leftElbowCheck = keypoints.find((k: Keypoint) => k.name === "left_elbow");
                        const rightElbowCheck = keypoints.find((k: Keypoint) => k.name === "right_elbow");

                        if (leftElbowCheck) {
                            const dx = leftElbowCheck.x - prevPositions.current.leftElbow.x;
                            const dy = leftElbowCheck.y - prevPositions.current.leftElbow.y;
                            const speed = Math.sqrt(dx * dx + dy * dy);

                            if (speed > FAST_THRESHOLD) leftSpeedHint = "Медленніше";
                            else if (speed < SLOW_THRESHOLD) leftSpeedHint = "Швидше";

                            prevPositions.current.leftElbow = { x: leftElbowCheck.x, y: leftElbowCheck.y };
                        }

                        if (rightElbowCheck) {
                            const dx = rightElbowCheck.x - prevPositions.current.rightElbow.x;
                            const dy = rightElbowCheck.y - prevPositions.current.rightElbow.y;
                            const speed = Math.sqrt(dx * dx + dy * dy);

                            if (speed > FAST_THRESHOLD) rightSpeedHint = "Медленніше";
                            else if (speed < SLOW_THRESHOLD) rightSpeedHint = "Швидше";

                            prevPositions.current.rightElbow = { x: rightElbowCheck.x, y: rightElbowCheck.y };
                        }
                    }

                    if (leftShoulder && leftElbow && leftWrist && rightShoulder && rightElbow && rightWrist) {
                        const leftAngle = getAngle(leftShoulder, leftElbow, leftWrist);
                        const rightAngle = getAngle(rightShoulder, rightElbow, rightWrist);
                        const ELBOW_OUT_THRESHOLD = 30;

                        if (leftElbow.x > leftShoulder.x + ELBOW_OUT_THRESHOLD) leftHint = "Тримай лівий лікоть ближче до корпусу";
                        if (rightElbow.x < rightShoulder.x - ELBOW_OUT_THRESHOLD) rightHint = "Тримай правий лікоть ближче до корпусу";

                        if (leftAngle < 15) leftHint = "Згинай слабше ліву руку";
                        else if (leftAngle > 165) leftHint = "Не перерозгибай ліву руку";

                        if (rightAngle < 15) rightHint = "Згинай слабше праву руку";
                        else if (rightAngle > 165) rightHint = "Не перерозгибай праву руку";

                        if (Math.abs(leftAngle - rightAngle) > 30) syncHint = "Руки рухаються не синхронно";
                    }

                    const now = Date.now();
                    if (now - lastHintTimeRef.current > HINT_HOLD_TIME) {
                        lastHintsRef.current = { left: leftHint, right: rightHint, sync: syncHint };
                        lastHintTimeRef.current = now;

                        const allHints = [leftHint, rightHint, syncHint, leftSpeedHint, rightSpeedHint].filter(Boolean);
                        if (allHints.length > 0) {
                            const timestamp = new Date().toLocaleTimeString();
                            allHints.forEach(h => hintsLogRef.current.push(`[${timestamp}] ${h}`));
                        }
                    }

                    if (counterDivRef.current) {
                        counterDivRef.current.innerText = `Ліва: ${countsRef.current.leftCount} | Права: ${countsRef.current.rightCount}`;
                    }

                    if (hintsDivRef.current) {
                        const { left, right, sync } = lastHintsRef.current;
                        hintsDivRef.current.innerHTML = `
                            ${left ? `<div class="text-red-400">${left}</div>` : ""}
                            ${right ? `<div class="text-red-400">${right}</div>` : ""}
                            ${sync ? `<div class="text-yellow-400">${sync}</div>` : ""}
                        `;
                    }
                }
            }

            if (!isTrackingComplete) {
                animationFrameId = requestAnimationFrame(detect);
            } else if (endPoseFrameCountRef.current > 0) {
                animationFrameId = requestAnimationFrame(detect);
            }
        };

        detect();
    }, [isTrackingActive, isTrackingComplete, shouldStopCamera]);

    const sendHintsToAPI = async () => {
        if (isAnalysisLoading) return;

        setIsAnalysisLoading(true);
        setAiResponse("ІІ-тренер аналізує вашу сесію...");

        const hintsText = hintsLogRef.current.join("\n");

        const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const systemPrompt = "Ви — досвідчений фітнес-тренер. Проаналізуйте журнал технічних підказок, які стосуються згинання рук." +
            " Надайте одне речення мотивуючого зворотного зв'язку та 1-3 конкретні поради для покращення техніки виконання. Відповідь повинна бути лише українською," +
            " а також не повинна містити списки, а також не пиши жирним шрифтом, все повинно бути написано 'основним текстом'. Відповідь може бути розділена на абзаци." +
            "Бажано для нагляднсті використовувати фрази по типу 'Найбільше зауважень від системи у Вас щодо *ТЕКСТ ЗАУВАЖЕННЯ* *і далі йдуть поради*'";
        const userQuery = `Проаналізуйте наступний лог підказок: \n\n${hintsText}`;

        try {
            if (!apiKey) {
                throw new Error("API key is missing. Please check your .env file and REACT_APP_GEMINI_API_KEY.");
            }

            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                tools: [{ "google_search": {} }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            const aiMessage = result?.candidates?.[0]?.content?.parts?.[0]?.text ||
                "Не вдалося отримати відповідь від ІІ. (Порожній контент моделі)";

            setAiResponse(aiMessage);

        } catch (error) {
            let errorMessage = "Невідома помилка";
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            setAiResponse(`Помилка під час виклику ІІ: ${errorMessage}`);
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    const getStatusMessage = () => {
        if (isAnalysisLoading) return "ІІ аналізує дані...";
        if (isTrackingComplete) return "ГОТОВО: Натисніть кнопку 'Аналіз'.";
        if (isTrackingActive) return "ТРЕНУВАННЯ АКТИВНЕ";
        return "ОЧІКУВАННЯ ПОЗИ: Прийміть початкову позу...";
    };

    return (
        <div className="flex flex-col items-center p-8 bg-[#0d0d0d] min-h-screen">
            <Helmet />

            <h1 className="text-3xl font-extrabold text-white mb-6 tracking-wider">
                AI Фітнес-Трекер (Згинання Рук)
            </h1>

            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl">

                <div className={`relative w-full lg:w-3/5 aspect-video bg-[#1a1a1a] rounded-xl overflow-hidden ${isTrackingActive ? 'active-pulse' : 'shadow-none'}`}>
                    <div className="video-canvas">
                        <VideoFeed onVideoReady={handleVideoReady} shouldStopCamera={shouldStopCamera} />
                    </div>

                    <div className="absolute top-0 left-0 p-4 w-full h-full flex flex-col justify-between pointer-events-none">

                        <div ref={counterDivRef} className="text-white text-2xl font-bold bg-purple-900 bg-opacity-60 rounded-lg px-2 py-2 shadow-lg">
                            {isTrackingComplete ? "СЕАНС ЗАВЕРШЕНО" : `ЛІВА: ${countsRef.current.leftCount} | ПРАВА: ${countsRef.current.rightCount}`}
                        </div>

                        <div ref={hintsDivRef} className="text-yellow-300 text-base font-semibold bg-gray-900 bg-opacity-70 rounded-lg p-3 max-w-xs shadow-xl transition duration-500">
                            {getStatusMessage()}
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-2/5 flex flex-col gap-6">

                    <div className="flex justify-start">
                        <button
                            onClick={sendHintsToAPI}
                            disabled={!isTrackingComplete || isAnalysisLoading}
                            className={`px-8 py-3 text-lg font-bold rounded-xl shadow-md transition duration-300 transform hover:scale-105 
                                ${isTrackingComplete && !isAnalysisLoading
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isAnalysisLoading ? 'АНАЛІЗУЄМО...' : 'ОТРИМАТИ ЗВІТ ТРЕНЕРА-ІІ'}
                        </button>
                    </div>

                    <div className="text-sm text-gray-400 bg-gray-800 p-4 rounded-xl shadow-inner border border-purple-800/50">
                        <h4 className="font-bold text-purple-400 mb-1">Інструкції:</h4>
                        <p className="mb-2">Для початку: Опустіть руки по швах і тримайте їх прямо (2 сек.).</p>
                        <p>Для завершення: Підніміть обидві руки прямо над головою і утримуйте (2 сек.).</p>
                    </div>

                    <div className="flex-grow bg-gray-800 p-5 rounded-xl border border-purple-700 shadow-2xl shadow-purple-900/40">
                        <h4 className="text-xl font-bold text-purple-400 mb-3 border-b border-gray-700 pb-2">
                            Звіт ІІ-Тренера
                        </h4>
                        <div className="scroll-box text-gray-300 text-sm h-64 lg:h-80 overflow-y-auto">
                            {aiResponse ? (
                                <p className="whitespace-pre-line leading-relaxed">{aiResponse}</p>
                            ) : (
                                <p className="text-gray-500 italic">
                                    {isAnalysisLoading
                                        ? "Очікування завершення аналізу..."
                                        : <>
                                            Після завершення тренування тут з'явиться детальний аналіз вашої техніки та
                                            індивідуальні рекомендації.
                                            <br/><br/>
                                            <br/><br/>
                                            <br/><br/>

                                            <span className="text-red-500 italic text-xs">
          Не хвилюйтеся, Ваше відео обробляється виключно на вашому девайсі.
          ІІ-Тренер отримує тільки текстовий лог вашого виконання
          <br/>
          без будь-яких ідентифікуючих особу признаків.
        </span>
                                        </>
                                    }
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={reloadPage}
                            className="w-full px-8 py-3 bg-indigo-900 text-indigo-300 font-semibold rounded-xl transition duration-300 hover:bg-indigo-800 disabled:opacity-50"
                            disabled={isTrackingActive}
                        >
                            ПОЧАТИ НОВУ СЕСІЮ (ПЕРЕЗАВАНТАЖЕННЯ)
                        </button>
                    </div>

                </div>
            </div>

        </div>
    );
};

export default MoveNetArmBend;
