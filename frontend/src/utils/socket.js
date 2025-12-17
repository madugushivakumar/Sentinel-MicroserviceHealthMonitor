import { io } from 'socket.io-client';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    // ✅ Use the correct Vite env variable
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

    // ✅ Safety check (important for prod)
    if (!apiBaseUrl) {
      console.warn('❌ VITE_API_BASE_URL not set. Socket will not connect.');
      return null;
    }

    // ✅ Remove `/api` safely to get backend base URL
    const socketUrl = apiBaseUrl.replace(/\/api$/, '');

    socketInstance = io(socketUrl, {
      transports: ['websocket'],   // avoid polling issues
      reconnection: true,
      reconnectionAttempts: 5,     // prevent infinite spam
      reconnectionDelay: 2000,
      timeout: 20000,
      autoConnect: true
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
