import React from 'react';
import MoveNetPlank from '../../components/plank/MoveNetPlank';
import { useNavigate } from 'react-router-dom';

const PlankTrackingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col">
            {/* Шапка сторінки */}
            <header className="p-6 flex items-center justify-between border-b border-gray-800">
                <button
                    onClick={() => navigate('/')}
                    className="text-gray-400 hover:text-purple-400 transition-colors font-semibold flex items-center gap-2"
                >
                    <span className="text-xl">←</span> До вибору вправ
                </button>
                <h1 className="text-xl font-extrabold tracking-tight uppercase">Тренування: Планка</h1>
                <div className="w-24"></div> {/* Фейковий блок для центрування заголовка */}
            </header>

            {/* Основний контент */}
            <main className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-3xl">
                    {/* Викликаємо основний компонент з логікою MoveNet */}
                    <MoveNetPlank />
                </div>

                {/* Підказки під відео */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400 text-center w-full max-w-3xl">
                    <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl shadow-inner">
                        <p className="font-bold text-purple-400 mb-1 uppercase tracking-wider">Ракурс</p>
                        Встаньте боком до камери
                    </div>
                    <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl shadow-inner">
                        <p className="font-bold text-purple-400 mb-1 uppercase tracking-wider">Відстань</p>
                        Відійдіть на 2-3 метри
                    </div>
                    <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl shadow-inner">
                        <p className="font-bold text-purple-400 mb-1 uppercase tracking-wider">Техніка</p>
                        Тримайте тіло прямою лінією
                    </div>
                </div>
            </main>

            <footer className="p-6 text-center text-gray-600 text-xs italic">
                AI-аналіз виконується в реальному часі на вашому пристрої
            </footer>
        </div>
    );
};

export default PlankTrackingPage;
