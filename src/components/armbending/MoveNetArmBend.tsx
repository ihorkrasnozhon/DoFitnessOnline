import React, {useRef, useCallback, useState, useEffect, JSX} from "react";
import VideoFeed from "./VideoFeed";
import { initDetector, drawPose, getAngle, checkReadyPose, checkEndPose } from "./PoseUtils";
import { updateArmBendCount } from "./ArmBendCounter";
import { Keypoint } from "@tensorflow-models/pose-detection";
import Helmet from './services/helmet';
import {useNavigate} from "react-router-dom";


const VisualHint = ({ type, side }: { type: string | null, side?: 'left' | 'right' | 'center' }) => {
    if (!type) return null;

    const icons: Record<string, JSX.Element> = {
        elbow_inner: (
            <svg className="w-16 h-16 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={side === 'left' ? "m13 7-5 5 5 5M21 7l-5 5 5 5" : "m11 17 5-5-5-5M3 17l5-5-5-5"} />
            </svg>
        ),
        speed_fast: (
            <svg className="w-16 h-16 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
        ),
        speed_slow: (
            <svg className="w-16 h-16 text-yellow-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        ),
        sync_error: (
            <svg className="w-16 h-16 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l-4-4M17 20l4-4" />
            </svg>
        ),
        // Ошибка: Слишком острый угол (перебор вверху)
        angle_small: (
            <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 border-4 border-red-500 rounded-full animate-ping opacity-20"></div>
                <svg className="w-16 h-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                    <path d="M16 8l-4 4-4-4" /> {/* Стрелка вниз - "опусти руку" */}
                    <path d="M7 16h10" strokeDasharray="2 2" /> {/* База */}
                </svg>
            </div>
        ),
        // Ошибка: Слишком тупой угол (рука почти прямая внизу)
        angle_large: (
            <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 border-4 border-red-500 rounded-full animate-ping opacity-20"></div>
                <svg className="w-16 h-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                    <path d="M8 12l4-4 4 4" /> {/* Стрелка вверх - "подними/согни" */}
                    <path d="M7 16h10" />
                </svg>
            </div>
        )
    };

    return (
        <div className="flex flex-col items-center bg-black/50 p-3 rounded-full backdrop-blur-md border border-white/20 shadow-2xl">
            {icons[type]}
        </div>
    );
};

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

    const isMounted = useRef(true);
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


    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false; // СРАЗУ ставим false при уходе со страницы
        };
    }, []);

    const reloadPage = () => {
        window.location.reload();
    };

    const [activeVisualHints, setActiveVisualHints] = useState<{
        left: string | null,
        right: string | null,
        sync: boolean
    }>({ left: null, right: null, sync: false });


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

            if (!isMounted.current) return;

            let leftHint = "";
            let rightHint = "";
            let syncHint = "";

            if (shouldStopCamera) {
                // requestAnimationFrame(detect);
                if (isMounted.current) requestAnimationFrame(detect);
                return;
            }

            frameCountRef.current++;

            if (video.videoWidth === 0 || video.videoHeight === 0) {
                animationFrameId = requestAnimationFrame(detect);
                return;
            }

            const poses = await detectorInstance.estimatePoses(video);

            if (!isMounted.current) return;

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
                    // Режим очікування початку
                    if (checkReadyPose(keypoints)) {
                        setIsTrackingActive(true);
                        endPoseFrameCountRef.current = 0; // Скидаємо лічильник для безпеки
                        console.log("Тренування активовано!");
                    }
                } else {
                    // Режим активного тренування: перевірка на позу завершення
                    if (checkEndPose(keypoints)) {
                        endPoseFrameCountRef.current++;

                        if (endPoseFrameCountRef.current >= END_POSE_HOLD_FRAMES) {
                            setIsTrackingActive(false);
                            setIsTrackingComplete(true);
                            setShouldStopCamera(true);
                            endPoseFrameCountRef.current = 0;
                            console.log("Тренування завершено.");
                        }
                    } else {
                        // Якщо користувач перестав тримати позу завершення до того, як сплив час
                        endPoseFrameCountRef.current = 0;
                    }
                }

                if (isTrackingActive) {
                    // Временные переменные для текущего кадра
                    let currentLeftHint: string | null = null;
                    let currentRightHint: string | null = null;
                    let currentSyncHint = false;

                    // 1. Обработка счетчиков
                    const newCounts = updateArmBendCount(keypoints, {
                        leftCount: countsRef.current.leftCount,
                        rightCount: countsRef.current.rightCount,
                        leftArmUp: armStateRef.current.leftArmUp,
                        rightArmUp: armStateRef.current.rightArmUp,
                    });
                    countsRef.current = { leftCount: newCounts.leftCount, rightCount: newCounts.rightCount };
                    armStateRef.current = { leftArmUp: newCounts.leftArmUp, rightArmUp: newCounts.rightArmUp };

                    // 2. Анализ скорости
                    if (frameCountRef.current % 2 === 0) {
                        const leftElbowCheck = keypoints.find((k: Keypoint) => k.name === "left_elbow");
                        const rightElbowCheck = keypoints.find((k: Keypoint) => k.name === "right_elbow");

                        if (leftElbowCheck) {
                            const dx = leftElbowCheck.x - prevPositions.current.leftElbow.x;
                            const dy = leftElbowCheck.y - prevPositions.current.leftElbow.y;
                            const speed = Math.sqrt(dx * dx + dy * dy);
                            if (speed > FAST_THRESHOLD) currentLeftHint = "speed_fast";
                            else if (speed < SLOW_THRESHOLD) currentLeftHint = "speed_slow";
                            prevPositions.current.leftElbow = { x: leftElbowCheck.x, y: leftElbowCheck.y };
                        }

                        if (rightElbowCheck) {
                            const dx = rightElbowCheck.x - prevPositions.current.rightElbow.x;
                            const dy = rightElbowCheck.y - prevPositions.current.rightElbow.y;
                            const speed = Math.sqrt(dx * dx + dy * dy);
                            if (speed > FAST_THRESHOLD) currentRightHint = "speed_fast";
                            else if (speed < SLOW_THRESHOLD) currentRightHint = "speed_slow";
                            prevPositions.current.rightElbow = { x: rightElbowCheck.x, y: rightElbowCheck.y };
                        }
                    }

                    // 3. Анализ углов и положения локтей
                    if (leftShoulder && leftElbow && leftWrist && rightShoulder && rightElbow && rightWrist) {
                        const leftAngle = getAngle(leftShoulder, leftElbow, leftWrist);
                        const rightAngle = getAngle(rightShoulder, rightElbow, rightWrist);
                        const ELBOW_OUT_THRESHOLD = 30;

                        // Логика для ЛЕВОЙ руки
                        if (leftElbow.x > leftShoulder.x + ELBOW_OUT_THRESHOLD) {
                            currentLeftHint = "elbow_inner";
                        } else if (leftAngle < 20) {
                            currentLeftHint = "angle_small"; // Слишком сильно согнул
                        } else if (leftAngle > 160) {
                            currentLeftHint = "angle_large"; // Слишком сильно разогнул
                        }

                        // Логика для ПРАВОЙ руки
                        if (rightElbow.x < rightShoulder.x - ELBOW_OUT_THRESHOLD) {
                            currentRightHint = "elbow_inner";
                        } else if (rightAngle < 20) {
                            currentRightHint = "angle_small";
                        } else if (rightAngle > 160) {
                            currentRightHint = "angle_large";
                        }

                        // Синхронность
                        if (Math.abs(leftAngle - rightAngle) > 35) currentSyncHint = true;
                    }

                    // 4. Обновление состояния интерфейса (с задержкой HINT_HOLD_TIME)
                    const now = Date.now();
                    if (now - lastHintTimeRef.current > HINT_HOLD_TIME) {
                        setActiveVisualHints({
                            left: currentLeftHint,
                            right: currentRightHint,
                            sync: currentSyncHint
                        });

                        // Логирование текста для ИИ оставляем как было
                        const textHints = [];
                        if (currentLeftHint) textHints.push(`Left: ${currentLeftHint}`);
                        if (currentRightHint) textHints.push(`Right: ${currentRightHint}`);
                        if (currentSyncHint) textHints.push("Not sync");

                        if (textHints.length > 0) {
                            hintsLogRef.current.push(`[${new Date().toLocaleTimeString()}] ${textHints.join(", ")}`);
                        }
                        lastHintTimeRef.current = now;
                    }

                    // Обновление текстового счетчика
                    if (counterDivRef.current) {
                        counterDivRef.current.innerText = `Ліва: ${countsRef.current.leftCount} | Права: ${countsRef.current.rightCount}`;
                    }
                }
            }

            if (!isTrackingComplete && isMounted.current) {
                requestAnimationFrame(detect);
            } else if (endPoseFrameCountRef.current > 0 && isMounted.current) {
                requestAnimationFrame(detect);
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

        if (isTrackingActive) {
            if (endPoseFrameCountRef.current > 0) return "Утримуйте для завершення...";

            // Приоритетные сообщения
            const leftH = activeVisualHints.left;
            const rightH = activeVisualHints.right;

            if (leftH === "angle_small" || rightH === "angle_small") return "Не згинай так сильно!";
            if (leftH === "angle_large" || rightH === "angle_large") return "Не розгинай до кінця!";
            if (leftH === "elbow_inner" || rightH === "elbow_inner") return "Лікті ближче до тіла!";
            if (activeVisualHints.sync) return "Рухайся синхронно!";

            return "ТРЕНУВАННЯ АКТИВНЕ";
        }

        return "Прийміть початкову позу...";
    };

    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center p-8 bg-[#0d0d0d] min-h-screen">
            <Helmet />

            <div className="w-full max-w-6xl flex justify-start mb-4">
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors font-semibold group"
                >
                    <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span>
                    ДО ВИБОРУ ВПРАВ
                </button>
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-6 tracking-wider">
                AI Фітнес-Трекер (Згинання Рук)
            </h1>

            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl">

                <div
                    className={`relative w-full lg:w-3/5 aspect-video bg-[#1a1a1a] rounded-xl overflow-hidden ${isTrackingActive ? 'active-pulse shadow-[0_0_20px_rgba(147,51,234,0.3)]' : 'shadow-none'}`}>

                    <div className="video-canvas">
                        <VideoFeed onVideoReady={handleVideoReady} shouldStopCamera={shouldStopCamera} />
                    </div>

                    {/* --- НОВЫЙ СЛОЙ ВИЗУАЛЬНЫХ ПОДСКАЗОК (SVG) --- */}
                    <div className="absolute inset-0 pointer-events-none z-20 flex justify-between items-center px-12">
                        {/* Левая сторона */}
                        <div className="w-20 flex justify-center">
                            <VisualHint type={activeVisualHints.left} side="left" />
                        </div>

                        {/* Центр (Синхронность) */}
                        <div className="w-20 flex justify-center">
                            {activeVisualHints.sync && <VisualHint type="sync_error" side="center" />}
                        </div>

                        {/* Правая сторона */}
                        <div className="w-20 flex justify-center">
                            <VisualHint type={activeVisualHints.right} side="right" />
                        </div>
                    </div>
                    {/* ------------------------------------------ */}

                    <div
                        className="absolute top-0 left-0 p-4 w-full h-full flex flex-col justify-between pointer-events-none z-10">

                        <div ref={counterDivRef}
                             className="text-white text-2xl font-bold bg-purple-900/60 backdrop-blur-md rounded-lg px-4 py-2 shadow-lg inline-block self-start border border-white/10">
                            {isTrackingComplete ? "СЕАНС ЗАВЕРШЕНО" : `ЛІВА: ${countsRef.current.leftCount} | ПРАВА: ${countsRef.current.rightCount}`}
                        </div>

                        <div ref={hintsDivRef}
                             className="text-yellow-300 text-base font-semibold bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 max-w-xs shadow-xl transition duration-500 border border-yellow-500/30">
                            {getStatusMessage()}
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-2/5 flex flex-col gap-6">

                    <div className="flex justify-start">
                        <button
                            onClick={sendHintsToAPI}
                            disabled={!isTrackingComplete || isAnalysisLoading}
                            className={`px-8 py-3 w-full text-lg font-bold rounded-xl shadow-md transition duration-300 transform active:scale-95 
                            ${isTrackingComplete && !isAnalysisLoading
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500'
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isAnalysisLoading ? 'АНАЛІЗУЄМО...' : 'ОТРИМАТИ ЗВІТ ТРЕНЕРА-ІІ'}
                        </button>
                    </div>

                    <div
                        className="text-sm text-gray-400 bg-gray-800/50 p-4 rounded-xl border border-purple-800/30">
                        <h4 className="font-bold text-purple-400 mb-1 flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></span>
                            Інструкції:
                        </h4>
                        <p className="mb-2 italic">1. Початок: Руки вниз вздовж тіла (2 сек).</p>
                        <p className="italic">2. Кінець: Обидві руки вгору над головою (2 сек).</p>
                    </div>

                    <div
                        className="flex-grow bg-[#141414] p-5 rounded-xl border border-purple-700/50 shadow-2xl">
                        <h4 className="text-xl font-bold text-purple-400 mb-3 border-b border-gray-800 pb-2">
                            Звіт ІІ-Тренера
                        </h4>
                        <div className="scroll-box text-gray-300 text-sm h-64 lg:h-80 overflow-y-auto pr-2 custom-scrollbar">
                            {aiResponse ? (
                                <p className="whitespace-pre-line leading-relaxed">{aiResponse}</p>
                            ) : (
                                <div className="text-gray-500 flex flex-col gap-4">
                                    <p className="italic">Тут з'явиться аналіз після завершення...</p>
                                    <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg">
                                    <span className="text-red-500/80 text-xs">
                                        Ваше відео не передається на сервер. Система аналізує лише текстовий лог координат.
                                    </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={reloadPage}
                        className="w-full px-8 py-3 bg-indigo-950/50 text-indigo-300 border border-indigo-500/30 font-semibold rounded-xl transition duration-300 hover:bg-indigo-900 disabled:opacity-30"
                        disabled={isTrackingActive}
                    >
                        НОВА СЕСІЯ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoveNetArmBend;
