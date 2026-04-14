
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ExerciseSelection from "./Pages/exerciseSelector/ExerciseSelection";
import ArmTrackingPage from "./Pages/armbend/armbend";
import SquatTrackingPage from "./Pages/squat/squat";
import PlankTrackingPage from "./Pages/plank/PlankPage";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<ExerciseSelection />} />
                <Route path="/armbend" element={<ArmTrackingPage />} />
                <Route path="/squat" element={<SquatTrackingPage />} />
                <Route path="/plank" element={<PlankTrackingPage />} />

            </Routes>
        </Router>
    );
}

export default App;
