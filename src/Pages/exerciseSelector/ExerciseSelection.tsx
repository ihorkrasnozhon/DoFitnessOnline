import React from "react";
import { useNavigate } from "react-router-dom";

const ExerciseSelection: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div>
            <h1>Оберіть вправу</h1>

            <button onClick={() => navigate("/armbend")}>
                Сгинання рук
            </button>

            <button onClick={() => navigate("/squat")}>
                Присідання
            </button>
        </div>
    );
};

export default ExerciseSelection;
