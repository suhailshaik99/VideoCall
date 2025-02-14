import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";

const socket = io("https://videocall-1b04.onrender.com");

const Room = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const userName = new URLSearchParams(location.search).get("name");

  const [peers, setPeers] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoHidden, setIsVideoHidden] = useState(false);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const userStream = useRef(null);

  useEffect(() => {
    const initStream = async () => {
      try {
        // Get user media (video and audio)
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        userStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Notify server that the user has joined the room
        socket.emit("join-room", { roomId, userName });

        // Handle new user connections
        socket.on("user-connected", async ({ userId, userName }) => {
          console.log(`New user connected: ${userId}`);
          const peerConnection = createPeerConnection(userId);
          peerConnections.current[userId] = peerConnection;

          // Create and send an offer to the new user
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit("offer", { target: userId, offer });
        });

        // Handle incoming offers
        socket.on("offer", async ({ offer, target }) => {
          console.log(`Received offer from ${target}`);
          const peerConnection = createPeerConnection(target);
          peerConnections.current[target] = peerConnection;

          // Set remote description and create an answer
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit("answer", { target, answer });
        });

        // Handle incoming answers
        socket.on("answer", async ({ answer, target }) => {
          console.log(`Received answer from ${target}`);
          if (peerConnections.current[target]) {
            await peerConnections.current[target].setRemoteDescription(
              new RTCSessionDescription(answer)
            );
          }
        });

        // Handle ICE candidates
        socket.on("ice-candidate", ({ candidate, target }) => {
          console.log(`Received ICE candidate from ${target}`);
          if (peerConnections.current[target]) {
            peerConnections.current[target].addIceCandidate(new RTCIceCandidate(candidate));
          }
        });

        // Handle user disconnections
        socket.on("user-disconnected", (userId) => {
          console.log(`User disconnected: ${userId}`);
          if (peerConnections.current[userId]) {
            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
          }
          setPeers((prev) => prev.filter((peer) => peer.id !== userId));
        });
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    initStream();

    // Cleanup on component unmount
    return () => {
      socket.disconnect();
      userStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [roomId, userName]);

  // Create a new RTCPeerConnection
  const createPeerConnection = (userId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Add local tracks to the peer connection
    userStream.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, userStream.current);
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { target: userId, candidate: event.candidate });
      }
    };

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log(`Track received from ${userId}`);
      setPeers((prevPeers) => [
        ...prevPeers.filter((p) => p.id !== userId),
        { id: userId, stream: event.streams[0], userName: userName },
      ]);
    };

    return peerConnection;
  };

  // Toggle mute/unmute
  const toggleMute = () => {
    const audioTracks = userStream.current.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks[0].enabled = !audioTracks[0].enabled;
      setIsMuted(!isMuted);
    }
  };

  // Toggle video on/off
  const toggleVideo = () => {
    const videoTracks = userStream.current.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks[0].enabled = !videoTracks[0].enabled;
      setIsVideoHidden(!isVideoHidden);
    }
  };

  // End the call
  const endCall = () => {
    userStream.current.getTracks().forEach((track) => track.stop());
    navigate("/");
  };

  // Calculate grid layout based on number of peers
  const calculateGridLayout = () => {
    const numPeers = peers.length;
    if (numPeers === 1) return { gridTemplateColumns: "1fr", gridTemplateRows: "1fr" };
    if (numPeers === 2) return { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr" };
    if (numPeers === 3) return { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" };
    if (numPeers >= 4)
      return {
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gridTemplateRows: "repeat(auto-fit, minmax(150px, 1fr))",
      };
  };

  return (
    <div className="room-container">
      {/* Remote Videos */}
      <div
        className="remote-videos"
        style={{
          display: "grid",
          gap: "10px",
          width: "100%",
          height: "100%",
          ...calculateGridLayout(),
        }}
      >
        {peers.map((peer) => (
          <div key={peer.id} className="video-container">
            <video
              ref={(ref) => {
                if (ref) ref.srcObject = peer.stream;
              }}
              autoPlay
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Display user name if video is turned off */}
            {!peer.stream.getVideoTracks()[0]?.enabled && (
              <div className="user-name-overlay">{peer.userName}</div>
            )}
          </div>
        ))}
      </div>

      {/* Local Video */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="local-video"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "200px",
          height: "150px",
          borderRadius: "10px",
          zIndex: 1,
        }}
      />

      {/* Control Buttons */}
      <div
        className="controls"
        style={{
          position: "fixed",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "10px",
          zIndex: 2,
        }}
      >
        <button onClick={toggleMute}>{isMuted ? "Unmute" : "Mute"}</button>
        <button onClick={toggleVideo}>{isVideoHidden ? "Show Video" : "Hide Video"}</button>
        <button onClick={endCall}>End Call</button>
      </div>
    </div>
  );
};

export default Room;