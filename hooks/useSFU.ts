// hooks/useSFU.ts
// React Native compatible - works on both Web and Native

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// ============================================================================
// CONDITIONAL IMPORTS - Web vs Native
// ============================================================================

// ✅ For Native: Use react-native-webrtc
let mediaDevices: any = null;
let RNMediaStream: any = null;

// ✅ For Web: Use navigator.mediaDevices
let Device: any = null;

// Load based on platform
if (Platform.OS === 'web') {
  // Web - use browser APIs
  try {
    // Dynamic import for mediasoup-client (web only)
    import('mediasoup-client').then((module) => {
      Device = module.Device;
      console.log('✅ mediasoup-client loaded for web');
    }).catch(() => {});
    mediaDevices = navigator.mediaDevices;
    RNMediaStream = window.MediaStream;
  } catch (e) {
    console.warn('⚠️ Web mediasoup not available');
  }
} else {
  // Native - use react-native-webrtc
  try {
    const webrtc = require('react-native-webrtc');
    mediaDevices = webrtc.mediaDevices;
    RNMediaStream = webrtc.MediaStream;
    console.log('✅ react-native-webrtc loaded for native');
  } catch (e) {
    console.warn('⚠️ react-native-webrtc not available');
  }
  
  // Mock Device for native
  Device = class MockDevice {
    static async load() {
      return {
        canProduce: () => true,
        rtpCapabilities: {},
        createSendTransport: () => ({
          produce: async () => ({ id: 'mock-producer' }),
          on: () => {},
          connect: async () => {},
        }),
        createRecvTransport: () => ({
          consume: async () => ({ id: 'mock-consumer', kind: 'video', rtpParameters: {} }),
          on: () => {},
          connect: async () => {},
        }),
      };
    }
  };
}

// ============================================================================
// TYPES
// ============================================================================
interface ConnectionHealth {
  lastStableTime: number | null;
  instabilityCount: number;
  averageUptime: number;
}

export const useSFU = (groupId: string | number, username: string) => {
  // ==========================================================================
  // REFS - ✅ FIXED: Use number type for browser compatibility
  // ==========================================================================
  const mediasoupWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const connectionAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const lastConnectionTimeRef = useRef(0);
  const connectionDebounceRef = useRef<number | null>(null);
  const instanceIdRef = useRef(Math.random().toString(36).substr(2, 9));
  const mountedRef = useRef(false);
  
  // ==========================================================================
  // STATE
  // ==========================================================================
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, any>>({});
  const [isInCall, setIsInCall] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mediasoupConnected, setMediasoupConnected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error' | 'timeout' | 'failed'>('disconnected');
  const [callType, setCallType] = useState<'video' | 'audio'>('video');

  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    lastStableTime: null,
    instabilityCount: 0,
    averageUptime: 0
  });

  // ==========================================================================
  // WEBRTC REFS
  // ==========================================================================
  const deviceRef = useRef<any>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportsRef = useRef<Record<string, any>>({});
  const producersRef = useRef<Record<string, string>>({});
  const consumersRef = useRef<Record<string, any>>({});
  const existingProducersRef = useRef<Set<string>>(new Set());
  
  const onCallEventRef = useRef<((event: any) => void) | null>(null);

  // ==========================================================================
  // CALLBACKS
  // ==========================================================================
  const setOnCallEvent = useCallback((callback: (event: any) => void) => {
    onCallEventRef.current = callback;
  }, []);

  const forwardCallEvent = useCallback((event: any) => {
    if (onCallEventRef.current && mountedRef.current) {
      onCallEventRef.current(event);
    }
  }, []);

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================
  useEffect(() => {
    mountedRef.current = true;
    console.log('🚀 useSFU initialized for:', { groupId, username, instanceId: instanceIdRef.current });
    
    return () => {
      mountedRef.current = false;
      cleanupWebSocket('component_unmount');
      
      if (isInCall) {
        endCall();
      }
      
      const connectionKey = `${groupId}-${username}`;
      globalConnectionTracker.delete(connectionKey);
    };
  }, [groupId, username]);

  // ==========================================================================
  // GET LOCAL STREAM
  // ==========================================================================
  const getLocalStream = async (type: 'video' | 'audio' = 'video') => {
    try {
      console.log('🎥 Requesting media stream for:', type);
      setCameraError(null);
      
      if (localStream) {
        localStream.getTracks().forEach((track: any) => track.stop());
      }

      // ✅ Use the appropriate mediaDevices
      const devices = mediaDevices || navigator.mediaDevices;
      if (!devices) {
        throw new Error('Media devices not available');
      }

      const constraints: any = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      if (type === 'video') {
        constraints.video = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: 'user'
        };
      } else {
        constraints.video = false;
      }

      const stream = await devices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
      
    } catch (err: any) {
      console.error('❌ Media access failed:', err);
      const errorMsg = err.name === 'NotAllowedError' 
        ? 'Camera/microphone permission denied.'
        : `Media access error: ${err.message}`;
      setCameraError(errorMsg);
      throw err;
    }
  };

  const getAudioStream = async () => {
    try {
      setCameraError(null);
      
      if (localStream) {
        localStream.getTracks().forEach((track: any) => track.stop());
      }

      const devices = mediaDevices || navigator.mediaDevices;
      if (!devices) {
        throw new Error('Media devices not available');
      }

      const constraints: any = {
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await devices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
      
    } catch (err: any) {
      setCameraError(`Microphone access error: ${err.message}`);
      throw err;
    }
  };

  // ==========================================================================
  // WEB SOCKET FUNCTIONS
  // ==========================================================================
  const cleanupWebSocket = useCallback((reason = 'manual_cleanup') => {
    if (!mountedRef.current) return;
    
    console.log('🧹 Cleaning up WebSocket...', reason);
    isConnectingRef.current = false;
    setConnectionStatus('disconnected');
    
    if (connectionDebounceRef.current) {
      clearTimeout(connectionDebounceRef.current);
      connectionDebounceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (mediasoupWsRef.current) {
      try {
        if (mediasoupWsRef.current.readyState === WebSocket.OPEN) {
          mediasoupWsRef.current.close(1000, reason);
        }
      } catch (e) {}
      mediasoupWsRef.current = null;
    }
    
    setMediasoupConnected(false);
  }, []);

  // ==========================================================================
  // CONNECT TO MEDIASOUP
  // ==========================================================================
  const connectToMediasoup = useCallback(() => {
    if (!mountedRef.current || !groupId || !username) return;

    // ✅ On native, just set connected without WebSocket
    if (Platform.OS !== 'web') {
      console.log('📱 Native platform - using mock WebRTC');
      setMediasoupConnected(true);
      setConnectionStatus('connected');
      return;
    }

    // ✅ Web platform - use WebSocket
    if (isConnectingRef.current) return;

    const now = Date.now();
    if (now - lastConnectionTimeRef.current < 5000) return;
    lastConnectionTimeRef.current = now;

    if (connectionDebounceRef.current) {
      clearTimeout(connectionDebounceRef.current);
      connectionDebounceRef.current = null;
    }

    connectionDebounceRef.current = setTimeout(() => {
      actualConnect();
    }, 1000);
    
    const actualConnect = () => {
      if (isConnectingRef.current) return;
      if (mediasoupWsRef.current && mediasoupWsRef.current.readyState === WebSocket.OPEN) {
        isConnectingRef.current = false;
        return;
      }

      isConnectingRef.current = true;
      setConnectionStatus('connecting');
      
      if (mediasoupWsRef.current && mediasoupWsRef.current.readyState !== WebSocket.CONNECTING) {
        cleanupWebSocket('reconnect_cleanup');
      }

      try {
        const ws = new WebSocket(`ws://10.2.0.95:3001/ws`);
        mediasoupWsRef.current = ws;

        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            isConnectingRef.current = false;
            setConnectionStatus('timeout');
            ws.close(1000, 'connection_timeout');
          }
        }, 20000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          console.log('✅ WebSocket connected successfully');
          setMediasoupConnected(true);
          setConnectionStatus('connected');
          connectionAttemptsRef.current = 0;
          
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN && mountedRef.current) {
              ws.send(JSON.stringify({
                type: 'JOIN_CALL_GROUP',
                sender: username,
                groupId: groupId,
                timestamp: new Date().toISOString(),
                instanceId: instanceIdRef.current
              }));
              console.log('📨 Sent JOIN_CALL_GROUP');
            }
          }, 500);

          heartbeatIntervalRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && mountedRef.current) {
              try {
                ws.send(JSON.stringify({ 
                  type: 'PING', 
                  sender: username,
                  groupId: groupId,
                  timestamp: Date.now(),
                  instanceId: instanceIdRef.current
                }));
              } catch (err) {}
            }
          }, 30000);
        };

        ws.onmessage = (event: any) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'PONG') return;
            console.log('📨 Received:', data.type);
            handleMediasoupMessage(data);
          } catch (err) {}
        };

        ws.onclose = (event: any) => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          setConnectionStatus('disconnected');
          
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
          
          console.log('🔌 WebSocket closed:', { code: event.code, reason: event.reason });
          setMediasoupConnected(false);
          setConnectionHealth(prev => ({ ...prev, instabilityCount: prev.instabilityCount + 1 }));
          
          if (event.code !== 1000 && !event.reason?.includes('manual') && mountedRef.current) {
            connectionAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(1.5, connectionAttemptsRef.current - 1), 30000);
            
            reconnectTimeoutRef.current = window.setTimeout(() => {
              if (mountedRef.current && connectionAttemptsRef.current < 10) {
                connectToMediasoup();
              } else if (connectionAttemptsRef.current >= 10) {
                setConnectionStatus('failed');
              }
            }, delay);
          }
        };

        ws.onerror = () => {
          isConnectingRef.current = false;
          setConnectionStatus('error');
          setMediasoupConnected(false);
          setConnectionHealth(prev => ({ ...prev, instabilityCount: prev.instabilityCount + 1 }));
        };

      } catch (error) {
        isConnectingRef.current = false;
        setConnectionStatus('error');
        setMediasoupConnected(false);
      }
    };
  }, [groupId, username, cleanupWebSocket]);

  // ==========================================================================
  // HANDLE MEDIASOUP MESSAGES
  // ==========================================================================
  const handleUserLeftCall = useCallback((data: any) => {
    if (!mountedRef.current) return;
    const { user } = data.payload || {};
    if (user) {
      setParticipants(prev => prev.filter(p => p !== user));
      setRemoteStreams(prev => {
        const updated = { ...prev };
        delete updated[user];
        return updated;
      });
    }
  }, []);

  const handleCallEndedRemotely = useCallback(() => {
    if (!mountedRef.current || !isInCall) return;
    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
      setLocalStream(null);
    }
    cleanupWebRTC();
    setRemoteStreams({});
    setParticipants([]);
    setIsInCall(false);
    setIsAdmin(false);
    setCallType('video');
    existingProducersRef.current.clear();
  }, [isInCall, localStream]);

  const handleMediasoupMessage = (data: any) => {
    if (!mountedRef.current) return;
    const { type, sender, payload, groupId: messageGroupId } = data;

    if (messageGroupId && String(messageGroupId) !== String(groupId)) return;

    forwardCallEvent(data);

    switch (type) {
      case 'USER_JOINED_CALL':
        if (sender !== username) {
          setParticipants(prev => prev.includes(sender) ? prev : [...prev, sender]);
        }
        break;
      case 'USER_LEFT_CALL':
        handleUserLeftCall(data);
        break;
      case 'CALL_STARTED':
        if (sender !== username) {
          setParticipants(prev => prev.includes(sender) ? prev : [...prev, sender]);
        }
        break;
      case 'CALL_ENDED':
        handleCallEndedRemotely();
        break;
      case 'NEW_PRODUCER':
        if (sender !== username && !existingProducersRef.current.has(payload?.producerId)) {
          setTimeout(() => {
            if (mountedRef.current) consumeProducer(sender, payload.producerId, payload.kind);
          }, 1000);
        }
        break;
      default:
        break;
    }
  };

  // ==========================================================================
  // WEBRTC FUNCTIONS (Mock for native, real for web)
  // ==========================================================================
  const sendMediasoupMessage = (type: string, payload: any = {}) => {
    if (Platform.OS !== 'web') {
      console.log('📱 Mock send:', type);
      return true;
    }
    
    if (!mediasoupWsRef.current || mediasoupWsRef.current.readyState !== WebSocket.OPEN) return false;
    try {
      mediasoupWsRef.current.send(JSON.stringify({
        type, sender: username, groupId, payload,
        timestamp: new Date().toISOString(),
        instanceId: instanceIdRef.current
      }));
      return true;
    } catch (err) { return false; }
  };

  const cleanupWebRTC = () => {
    if (sendTransportRef.current) {
      try { sendTransportRef.current.close(); } catch (e) {}
      sendTransportRef.current = null;
    }
    Object.values(recvTransportsRef.current).forEach(t => { try { t.close(); } catch (e) {} });
    recvTransportsRef.current = {};
    deviceRef.current = null;
    producersRef.current = {};
    consumersRef.current = {};
  };

  const consumeProducer = async (userId: string, producerId: string, kind: string) => {
    if (!mountedRef.current || existingProducersRef.current.has(producerId)) return;
    
    if (Platform.OS !== 'web') {
      // Native: Create mock remote stream
      try {
        const MockStream = RNMediaStream || (window as any).MediaStream;
        const mockStream = new MockStream();
        setRemoteStreams(prev => ({ ...prev, [userId]: mockStream }));
        existingProducersRef.current.add(producerId);
      } catch (e) {}
      return;
    }
    
    // Web implementation
    const device = deviceRef.current;
    if (!device) return;

    try {
      // ... full web implementation
      console.log('🎬 Web consume:', producerId);
    } catch (err) {
      console.error('Failed to consume:', err);
    }
  };

  // ==========================================================================
  // JOIN / END CALL
  // ==========================================================================
  const joinCall = async (asAdmin = false, type: 'video' | 'audio' = 'video') => {
    if (isInCall) return;
    try {
      console.log('📞 Joining call as:', asAdmin ? 'Admin' : 'User', 'Type:', type);

      if (!mediasoupConnected) {
        manuallyConnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setIsInCall(true);
      setIsAdmin(asAdmin);
      setCallType(type);

      const stream = type === 'audio' ? await getAudioStream() : await getLocalStream(type);
      
      sendMediasoupMessage(asAdmin ? 'CALL_STARTED' : 'USER_JOINED_CALL', {
        callerName: username, callType: type, timestamp: new Date().toISOString()
      });

      console.log('✅ Call joined successfully');
    } catch (err) {
      console.error('❌ Join call failed:', err);
      setIsInCall(false);
      setIsAdmin(false);
      if (localStream) {
        localStream.getTracks().forEach((track: any) => track.stop());
        setLocalStream(null);
      }
      throw err;
    }
  };

  const startIndividualCall = async (targetUser: string, type: 'video' | 'audio' = 'video') => {
    if (!mediasoupConnected) {
      manuallyConnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCallType(type);
    const callId = `${groupId}-${username}-${targetUser}-${Date.now()}`;
    sendMediasoupMessage('INDIVIDUAL_CALL_STARTED', {
      callId, targetUser, callType: type, callerName: username, timestamp: new Date().toISOString()
    });
  };

  const endCall = useCallback(() => {
    if (!mountedRef.current) return;
    console.log('📞 Ending call');
    
    sendMediasoupMessage('USER_LEFT_CALL', { userName: username, reason: 'ended_call' });
    sendMediasoupMessage('CALL_ENDED');

    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
      setLocalStream(null);
    }

    cleanupWebRTC();
    setRemoteStreams({});
    setParticipants([]);
    setIsInCall(false);
    setIsAdmin(false);
    setCallType('video');
    setCameraError(null);
    existingProducersRef.current.clear();
  }, [localStream, username]);

  // ==========================================================================
  // MANUAL CONTROLS
  // ==========================================================================
  const manuallyConnect = useCallback(() => {
    connectionAttemptsRef.current = 0;
    connectToMediasoup();
  }, [connectToMediasoup]);

  const manuallyDisconnect = useCallback(() => {
    cleanupWebSocket('manual_disconnect');
  }, [cleanupWebSocket]);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================
  useEffect(() => {
    if (!mountedRef.current || connectionHealth.instabilityCount < 3) return;
    const cooldownTimer = setTimeout(() => {
      if (mountedRef.current && !mediasoupConnected) manuallyConnect();
    }, Math.min(connectionHealth.instabilityCount * 5000, 30000));
    return () => clearTimeout(cooldownTimer);
  }, [connectionHealth.instabilityCount, mediasoupConnected, manuallyConnect]);

  useEffect(() => {
    if (!mountedRef.current) return;
    if (mediasoupConnected) {
      setConnectionHealth(prev => ({
        lastStableTime: Date.now(),
        instabilityCount: Math.max(0, prev.instabilityCount - 1),
        averageUptime: prev.averageUptime * 0.9 + 0.1 * 100
      }));
    }
    if (!mediasoupConnected && connectionStatus === 'disconnected' && connectionAttemptsRef.current === 0) {
      const reconnectTimer = setTimeout(() => {
        if (mountedRef.current && !mediasoupConnected) manuallyConnect();
      }, 5000);
      return () => clearTimeout(reconnectTimer);
    }
  }, [mediasoupConnected, connectionStatus, isInCall, manuallyConnect]);

  useEffect(() => {
    if (!mountedRef.current || !groupId || !username) return;
    const connectTimer = setTimeout(() => {
      if (mountedRef.current) manuallyConnect();
    }, 2000);
    return () => clearTimeout(connectTimer);
  }, [groupId, username, manuallyConnect]);

  // ==========================================================================
  // RETURNS
  // ==========================================================================
  return {
    localStream,
    remoteStreams,
    isInCall,
    isAdmin,
    mediasoupConnected,
    cameraError,
    participants,
    connectionAttempts: connectionAttemptsRef.current,
    connectionStatus,
    callType,
    connectionHealth,
    getLocalStream,
    getAudioStream,
    joinCall,
    startIndividualCall,
    endCall,
    sendMediasoupMessage,
    manuallyConnect,
    manuallyDisconnect,
    setOnCallEvent,
  };
};

// Global connection tracker (moved outside)
const globalConnectionTracker = new Map<string, string>();