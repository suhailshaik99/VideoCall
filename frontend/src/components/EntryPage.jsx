import { useState } from "react";
import { useNavigate } from "react-router-dom";

const EntryPage = () => {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!name.trim()) return alert("Please enter your name");

    const roomId = "12345"; // Static room for now (later can be dynamic)
    navigate(`/room/${roomId}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="entry-container input-container">
      <h1>Video Call App</h1>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={handleJoin}>Join Now</button>
    </div>
  );
};

export default EntryPage;
