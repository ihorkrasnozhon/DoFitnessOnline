import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ExerciseSelection from "./Pages/exerciseSelector/ExerciseSelection";
import ArmTrackingPage from "./Pages/armbend/armbend";
import SquatTrackingPage from "./Pages/squat/squat";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<ExerciseSelection />} />
                <Route path="/armbend" element={<ArmTrackingPage />} />
                <Route path="/squat" element={<SquatTrackingPage />} />
            </Routes>
        </Router>
    );
}

export default App;
