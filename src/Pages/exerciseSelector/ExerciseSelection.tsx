import React from "react";
import { useNavigate } from "react-router-dom";

const ExerciseIcon: React.FC<{ icon: string }> = ({ icon }) => (
    <div className="text-6xl mb-6 p-4 bg-gray-800/50 rounded-full w-24 h-24 flex items-center justify-center border border-gray-700 shadow-inner">
        {icon}
    </div>
);

const ExerciseCard: React.FC<{
    title: string;
    icon: string;
    description: string;
    onClick: () => void;
}> = ({ title, icon, description, onClick }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-between text-center transition-all duration-300 hover:border-purple-600 hover:shadow-lg hover:shadow-purple-900/30 group">
        <ExerciseIcon icon={icon} />
        <div className="flex-1 mb-8">
            <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                {title}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed px-4">
                {description}
            </p>
        </div>
        <button
            onClick={onClick}
            className="w-full py-3 px-6 rounded-lg bg-purple-700 text-white font-semibold text-lg transition-colors hover:bg-purple-600 active:bg-purple-800 shadow-md"
        >
            ВИБРАТИ
        </button>
    </div>
);

const ExerciseSelection: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-black text-gray-200 p-6 md:p-12 font-sans">

            <header className="flex items-center justify-between mb-16 pb-6 border-b border-gray-800">
                <div className="flex items-center gap-4">
                    <span className="text-3xl text-purple-500">🏋️</span>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                        AI Фітнес<span className="text-purple-500">-Трекер</span>
                    </h1>
                </div>
                {/* Убрали статус камеры, так как тут она не нужна */}
                <div className="text-xs px-4 py-1 bg-gray-900/50 rounded-full border border-gray-800 text-gray-600 uppercase tracking-widest">
                    v1.0 Beta
                </div>
            </header>

            <div className="text-center mb-16">
                <p className="text-xs uppercase text-purple-400 tracking-widest mb-3">Готові почати?</p>
                <h1 className="text-5xl font-black text-white tracking-tighter mb-4">
                    Оберіть вправу
                </h1>
                <p className="text-gray-500 max-w-xl mx-auto">
                    Виберіть активність, і наша нейромережа допоможе вам тренуватися правильно.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                <ExerciseCard
                    title="Сгинання рук"
                    icon="💪"
                    description="Згинання на біцепс. Підраховує повторення та стежить за амплітудою."
                    onClick={() => navigate("/armbend")}
                />
                <ExerciseCard
                    title="Присідання"
                    icon="🦵"
                    description="Класичні присідання. Контролює глибину сіду та положення спини."
                    onClick={() => navigate("/squat")}
                />
                <ExerciseCard
                    title="Планка"
                    icon="⏱️"
                    description="Статична вправа. Таймер фіксує точний час у правильній позі."
                    onClick={() => navigate("/plank")}
                />
            </div>

            <footer className="mt-24 pt-8 border-t border-gray-800 text-center text-gray-600 text-xs italic">
                Для роботи трекера знадобиться доступ до камери на наступному кроці.
            </footer>
        </div>
    );
};

export default ExerciseSelection;
