import { Routes, Route } from "react-router-dom";
import EntryPage from "./components/EntryPage";
import Room from "./components/Room"; // Video Call Component

function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryPage />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  );
}

export default App;
