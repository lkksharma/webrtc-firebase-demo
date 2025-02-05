import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAu8NT_qskMRA0bzzANAPAvh0uU_F3D6U4",
  authDomain: "sahaj-9abf3.firebaseapp.com",
  projectId: "sahaj-9abf3",
  storageBucket: "sahaj-9abf3.firebasestorage.app",
  messagingSenderId: "411937034103",
  appId: "1:411937034103:web:6597b00383030720fa5b72",
  measurementId: "G-KR8GNNZ1NT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// WebRTC setup
const servers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
let pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = new MediaStream();

const webcamVideo = document.getElementById("webcamVideo");
const remoteVideo = document.getElementById("remoteVideo");

const webcamButton = document.getElementById("webcamButton");
const callButton = document.getElementById("callButton");
const answerButton = document.getElementById("answerButton");
const hangupButton = document.getElementById("hangupButton");
const callInput = document.getElementById("callInput");

webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  pc.ontrack = event => {
    event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
  };

  callButton.disabled = false;
  answerButton.disabled = false;
};

callButton.onclick = async () => {
  const callDoc = doc(collection(db, "calls"));
  callInput.value = callDoc.id;

  pc.onicecandidate = event => {
    if (event.candidate) {
      setDoc(doc(callDoc, "candidates", "caller"), { ice: event.candidate.toJSON() });
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await setDoc(callDoc, { offer });

  onSnapshot(callDoc, snapshot => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });

  onSnapshot(doc(callDoc, "candidates", "callee"), snapshot => {
    const data = snapshot.data();
    if (data?.ice) {
      pc.addIceCandidate(new RTCIceCandidate(data.ice));
    }
  });
};

answerButton.onclick = async () => {
  const callId = callInput.value;
  const callDoc = doc(db, "calls", callId);
  const callData = (await getDoc(callDoc)).data();

  if (!callData) {
    alert("Call not found!");
    return;
  }

  pc.onicecandidate = event => {
    if (event.candidate) {
      setDoc(doc(callDoc, "candidates", "callee"), { ice: event.candidate.toJSON() });
    }
  };

  await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await setDoc(callDoc, { answer });

  onSnapshot(doc(callDoc, "candidates", "caller"), snapshot => {
    const data = snapshot.data();
    if (data?.ice) {
      pc.addIceCandidate(new RTCIceCandidate(data.ice));
    }
  });
};

hangupButton.onclick = () => {
  pc.close();
  pc = new RTCPeerConnection(servers);
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;
  callInput.value = "";
  callButton.disabled = true;
  answerButton.disabled = true;
};
