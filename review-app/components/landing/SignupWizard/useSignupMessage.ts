import { useState, useRef, useCallback } from "react";

export type MessageType = "error" | "success" | "warn";

export interface MessageState {
  show: boolean;
  text: string;
  type: MessageType;
}

export function useSignupMessage() {
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");
  const [type, setType] = useState<MessageType>("error");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createMessage = useCallback(
    (message: string, msgType: MessageType) => {
      setText(message);
      setType(msgType);
      setShow(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setShow(false);
        timeoutRef.current = null;
      }, 4000);
    },
    []
  );

  const clearMessage = useCallback(() => {
    setShow(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    message: { show, text, type },
    createMessage,
    clearMessage,
  };
}
