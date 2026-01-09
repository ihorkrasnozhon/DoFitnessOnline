import React from "react";
import { useNavigate } from "react-router-dom";
import MoveNetSquat from "../../components/squat/MoveNetSquat";

const SquatTrackingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <h1 className="text-3xl font-extrabold text-white mb-8">
                Відстеження присідань у реальному часі
            </h1>

            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl mb-8">
                <MoveNetSquat />
            </div>

            <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200"
            >
                ← Повернутись на головну
            </button>
        </div>
    );
};

export default SquatTrackingPage;
