export type ChatUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  sender: Pick<ChatUser, "id" | "name" | "avatar">;
  text: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  participant: ChatUser | null;
  lastMessage: {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
};
