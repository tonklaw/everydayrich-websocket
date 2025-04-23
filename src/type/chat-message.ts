export interface ChatMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  type: "text" | "sticker";
  edited?: boolean;
}
