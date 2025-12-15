import { io } from 'socket.io-client';

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      forceNew: false,
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected the socket, reconnect manually
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('Socket connection error:', error.message);
      // Don't log as error if it's just a reconnection attempt
      if (error.message !== 'xhr poll error') {
        console.warn('Socket will attempt to reconnect...');
      }
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt', attemptNumber);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.warn('Socket reconnection error:', error.message);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after all attempts');
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

