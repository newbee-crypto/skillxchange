import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { connectSocket, getSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';

const TURN_URLS = (import.meta.env.VITE_TURN_URLS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    ...(
      TURN_URLS.length > 0
        ? [{
            urls: TURN_URLS,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
          }]
        : []
    ),
  ],
  iceCandidatePoolSize: 10,
};

const VideoCall = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user: me, token } = useAuthStore();

  const [callState, setCallState] = useState('idle'); // idle, calling, connected
  const [booking, setBooking] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatusText, setCallStatusText] = useState('Ready');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const timerRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const callingUserRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);

  // Load users list when in standalone mode
  useEffect(() => {
    if (!bookingId) {
      api.get('/users?limit=50').then(res => {
        setAllUsers(res.data.users || []);
      });
    }
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;

    const fetchBooking = async () => {
      setBookingLoading(true);
      try {
        const { data } = await api.get(`/bookings/${bookingId}`);
        setBooking(data.booking);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Booking not found');
        navigate('/bookings');
      } finally {
        setBookingLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, navigate]);

  useEffect(() => {
    if (!bookingId) return;

    const storedCall = sessionStorage.getItem('incomingCall');
    if (!storedCall) return;

    try {
      const parsedCall = JSON.parse(storedCall);
      if (parsedCall?.roomId === bookingId) {
        setIncomingCall(parsedCall);
        setRemoteUser({ name: parsedCall.callerName, _id: parsedCall.from });
      }
    } catch (error) {
      sessionStorage.removeItem('incomingCall');
    }
  }, [bookingId]);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    remoteStreamRef.current = null;
    pendingIceCandidatesRef.current = [];
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    clearInterval(timerRef.current);
    clearTimeout(callTimeoutRef.current);
  }, []);

  const resetCallState = useCallback((statusText = 'Ready') => {
    cleanup();
    setCallState('idle');
    setDuration(0);
    setRemoteUser(null);
    setIncomingCall(null);
    setCallStatusText(statusText);
    callingUserRef.current = null;
  }, [cleanup]);

  const createPeerConnection = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const socket = getSocket();
    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play?.().catch(() => {});
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc:ice-candidate', {
          to: targetUserId,
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      if (e.track && !remoteStream.getTracks().some((track) => track.id === e.track.id)) {
        remoteStream.addTrack(e.track);
      }
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play?.().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (['connected', 'completed'].includes(pc.connectionState)) {
        setCallState('connected');
        setIncomingCall(null);
        clearTimeout(callTimeoutRef.current);
        setCallStatusText(`In call with ${remoteUser?.name || 'participant'}`);
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      }
      if (['disconnected', 'failed'].includes(pc.connectionState)) {
        toast.error('Connection lost');
        resetCallState('Connection lost');
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  }, [remoteUser?.name, resetCallState]);

  const startCall = async (targetUserId, targetUserName) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      callingUserRef.current = targetUserId;
      setRemoteUser({ name: targetUserName, _id: targetUserId });

      const pc = createPeerConnection(targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const socket = getSocket();
      socket.emit('webrtc:offer', {
        to: targetUserId,
        offer,
        roomId: bookingId || `call_${Date.now()}`,
      });

      setCallState('calling');
      setCallStatusText(`Calling ${targetUserName}...`);
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = setTimeout(() => {
        toast.error(`${targetUserName} did not answer`);
        resetCallState('Call timed out');
      }, 30000);
      toast(`Calling ${targetUserName}...`, { icon: '📞' });
    } catch (err) {
      toast.error('Camera/microphone access denied');
    }
  };

  const handleOffer = useCallback(async (data) => {
    sessionStorage.setItem('incomingCall', JSON.stringify(data));
    setIncomingCall(data);
    setRemoteUser({ name: data.callerName, _id: data.from });
  }, []);

  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      callingUserRef.current = incomingCall.from;
      const pc = createPeerConnection(incomingCall.from);
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      while (pendingIceCandidatesRef.current.length > 0) {
        const candidate = pendingIceCandidatesRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const socket = getSocket();
      socket.emit('webrtc:answer', { to: incomingCall.from, answer });

      setCallState('calling');
      setCallStatusText(`Connecting to ${remoteUser?.name || 'caller'}...`);
      sessionStorage.removeItem('incomingCall');
      setIncomingCall(null);
    } catch (err) {
      toast.error('Failed to accept call');
    }
  };

  const rejectCall = () => {
    const socket = getSocket();
    if (incomingCall) {
      socket.emit('webrtc:end-call', { to: incomingCall.from });
    }
    sessionStorage.removeItem('incomingCall');
    setIncomingCall(null);
    setRemoteUser(null);
  };

  const handleAnswer = async (data) => {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = setTimeout(() => {
        toast.error('Connection could not be established');
        resetCallState('Connection timed out');
      }, 45000);

      while (pendingIceCandidatesRef.current.length > 0) {
        const candidate = pendingIceCandidatesRef.current.shift();
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  };

  const handleIceCandidate = async (data) => {
    if (peerConnectionRef.current) {
      if (peerConnectionRef.current.remoteDescription) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else {
        pendingIceCandidatesRef.current.push(data.candidate);
      }
    }
  };

  const endCall = useCallback(() => {
    const socket = getSocket();
    if (callingUserRef.current) {
      socket?.emit('webrtc:end-call', { to: callingUserRef.current });
    }
    sessionStorage.removeItem('incomingCall');
    resetCallState('Call ended');
    if (bookingId) {
      navigate('/bookings');
    }
  }, [bookingId, navigate, resetCallState]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play?.().catch(() => {});
    }

    if (remoteVideoRef.current && remoteStreamRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play?.().catch(() => {});
    }
  });

  useEffect(() => {
    const socket = connectSocket(token);

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('webrtc:end-call', () => {
      toast('Call ended');
      resetCallState('Call ended');
    });

    socket.on('users:online', (ids) => setOnlineUsers(ids));
    socket.on('user:online', ({ userId }) => setOnlineUsers(prev => [...new Set([...prev, userId])]));
    socket.on('user:offline', ({ userId }) => setOnlineUsers(prev => prev.filter(id => id !== userId)));

    return () => {
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('webrtc:end-call');
      socket.off('users:online');
      socket.off('user:online');
      socket.off('user:offline');
      cleanup();
    };
  }, [token, cleanup, handleOffer, resetCallState]);

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // INCOMING CALL MODAL
  if (incomingCall && callState === 'idle') {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center px-4 fade-in">
        <div className="glass rounded-2xl p-6 sm:p-10 text-center w-full max-w-md">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-4 sm:mb-6 text-3xl sm:text-4xl text-white font-bold animate-pulse">
            {remoteUser?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Incoming Call</h2>
          <p className="text-dark-100 mb-8">{remoteUser?.name || 'Someone'} is calling you...</p>
          <div className="flex justify-center gap-6">
            <button onClick={rejectCall} className="p-5 rounded-full bg-red-500 text-white hover:bg-red-400 transition-colors shadow-lg shadow-red-500/20">
              <PhoneOff className="w-7 h-7" />
            </button>
            <button onClick={acceptCall} className="p-5 rounded-full bg-emerald-500 text-white hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 animate-bounce">
              <Phone className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // IDLE STATE — show user list to call
  if (callState === 'idle' && !bookingId) {
    return (
      <div className="space-y-6 fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Video Calls</h1>
          <p className="text-dark-100">Start a peer-to-peer video call with any online user</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Available Users</h2>
          </div>

          {allUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-dark-300 mx-auto mb-3" />
              <p className="text-dark-200">No other users found</p>
              <p className="text-dark-300 text-sm mt-1">Invite others to join the platform!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allUsers.map((u) => {
                const isOnline = onlineUsers.includes(u._id);
                return (
                  <div key={u._id} className="bg-dark-600 rounded-xl p-4 border border-dark-400 hover:border-primary-500/30 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-lg font-bold">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-dark-600 pulse-dot" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{u.name}</p>
                        <p className="text-xs text-dark-200">{isOnline ? '🟢 Online' : '⚪ Offline'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {u.skills?.slice(0, 2).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary-600/20 text-primary-300 text-xs rounded-full">{s.name}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => startCall(u._id, u.name)}
                      disabled={!isOnline}
                      className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                        isOnline
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          : 'bg-dark-500 text-dark-300 cursor-not-allowed'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      {isOnline ? 'Start Video Call' : 'Offline'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const bookingTargetUser = booking
    ? (booking.requester?._id === me?._id ? booking.provider : booking.requester)
    : null;
  const canUseBookingCall = Boolean(
    booking &&
    booking.status === 'accepted' &&
    (booking.requester?._id === me?._id || booking.provider?._id === me?._id)
  );
  const isBookingTargetOnline = bookingTargetUser?._id ? onlineUsers.includes(bookingTargetUser._id) : false;

  if (bookingId && bookingLoading) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (callState === 'idle' && bookingId) {
    return (
      <div className="max-w-2xl mx-auto py-12 fade-in">
        <div className="glass rounded-2xl p-6 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-white">Session Video Call</h1>
            <p className="text-dark-100 mt-1">
              {booking?.skill ? `${booking.skill} session` : 'Booking session'}
            </p>
          </div>

          <div className="bg-dark-600 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-100">Other person</span>
              <span className="text-white">{bookingTargetUser?.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-100">Status</span>
              <span className="text-white capitalize">{booking?.status || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-100">Availability</span>
              <span className={isBookingTargetOnline ? 'text-emerald-400' : 'text-amber-300'}>
                {isBookingTargetOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {!canUseBookingCall ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Video call becomes available only after the booking is accepted.
            </div>
          ) : (
            <button
              onClick={() => startCall(bookingTargetUser._id, bookingTargetUser.name)}
              disabled={!isBookingTargetOnline}
              className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                isBookingTargetOnline
                  ? 'bg-primary-600 text-white hover:bg-primary-500'
                  : 'bg-dark-500 text-dark-300 cursor-not-allowed'
              }`}
            >
              <Video className="w-5 h-5" />
              {isBookingTargetOnline ? 'Start Session Call' : 'Waiting For Other Person To Come Online'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ACTIVE CALL VIEW
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-2 sm:px-0 fade-in">
      <div className="relative w-full max-w-4xl aspect-video bg-dark-700 rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

        {callState !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-700">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-4 text-4xl text-white font-bold">
                {remoteUser?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <p className="text-white text-xl font-medium">{remoteUser?.name || 'Connecting...'}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Local Video PiP */}
        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-28 sm:w-48 aspect-video rounded-lg sm:rounded-xl overflow-hidden border-2 border-dark-400 shadow-xl">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {isVideoOff && (
            <div className="absolute inset-0 bg-dark-700 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-dark-200" />
            </div>
          )}
        </div>

        {callState === 'connected' && (
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-dark-800/80 backdrop-blur rounded-full text-white text-sm font-mono">
            🔴 {formatDuration(duration)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={toggleMute}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-200 ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-dark-500 text-white hover:bg-dark-400'}`}>
          {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        <button onClick={toggleVideo}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-200 ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-dark-500 text-white hover:bg-dark-400'}`}>
          {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        <button onClick={endCall}
          className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-500 text-white hover:bg-red-400 transition-colors shadow-lg shadow-red-500/20">
          <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      <p className="text-dark-200 text-sm mt-4">
        {callState === 'connected' ? `In call with ${remoteUser?.name}` : callStatusText}
      </p>
    </div>
  );
};

export default VideoCall;
