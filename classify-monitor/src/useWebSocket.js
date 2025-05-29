import { useEffect, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

/**
 * Custom hook để quản lý kết nối WebSocket và xử lý dữ liệu từ server.
 * @param {Function} onMessage Callback để xử lý dữ liệu nhận được từ server.
 * @returns {Object} Trạng thái kết nối WebSocket.
 */
export const useWebSocket = (onMessage) => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new SockJS("http://192.168.1.14:8080/ws");
    const stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log("[WebSocket Debug] " + str),
      reconnectDelay: 5000,
      onConnect: (frame) => {
        console.log("[WebSocket] Connected: ", frame);
        setConnected(true);
        stompClient.subscribe("/topic/data", (message) => {
          try {
            const data = JSON.parse(message.body);
            onMessage(data);
          } catch (error) {
            console.error("[WebSocket] Error parsing message: ", error);
          }
        });
      },
      onStompError: (frame) => {
        console.error("[WebSocket] Broker error: ", frame.headers["message"]);
        setConnected(false);
      },
    });

    stompClient.activate();

    return () => {
      stompClient.deactivate();
    };
  }, [onMessage]);

  return { connected };
};