import { io } from 'socket.io-client';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    // ✅ Use the CORRECT env variable
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    // ✅ Safety check
    if (!apiBaseUrl) {
      console.warn('❌ VITE_API_BASE_URL not set. Socket will not connect.');
      return null;
    }

    // ✅ Remove `/api` to get pure backend URL
    const socketUrl = apiBaseUrl.replace(/\/api$/, '');

    socketInstance = io(socketUrl, {
      transports: ['websocket'],   // avoid polling issues
      reconnection: true,
      reconnectionAttempts: 5,     // avoid infinite spam
      reconnectionDelay: 2000,
      timeout: 20000,
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('⚠️ Socket connection error:', error.message);
    });

    socketInstance.on('reconnect_attempt', (attempt) => {
      console.log('🔁 Socket reconnect attempt:', attempt);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed');
    });
  }

  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
