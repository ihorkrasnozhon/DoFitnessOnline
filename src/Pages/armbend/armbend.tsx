import React from "react";
import { useNavigate } from "react-router-dom";
import MoveNetArmBend from "../../components/armbending/MoveNetArmBend";

const ArmTrackingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold text-white mb-6">
                Відстеження згинання рук у реальному часі
            </h1>

            <MoveNetArmBend />

            <button
                onClick={() => navigate("/")}
            >
                ← Повернутись на головну
            </button>
        </div>
    );
};

export default ArmTrackingPage;
