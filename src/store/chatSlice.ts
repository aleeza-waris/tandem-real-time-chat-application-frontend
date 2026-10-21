import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type ChatState = {
  activeConversationId: string | null;
  typingUserId: string | null;
  onlineUserIds: string[];
};

const initialState: ChatState = {
  activeConversationId: null,
  typingUserId: null,
  onlineUserIds: []
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload;
      state.typingUserId = null;
    },
    setTypingUser(state, action: PayloadAction<string | null>) {
      state.typingUserId = action.payload;
    },
    setOnlineUsers(state, action: PayloadAction<string[]>) {
      state.onlineUserIds = action.payload;
    },
    setUserOnline(state, action: PayloadAction<{ userId: string; isOnline: boolean }>) {
      const { userId, isOnline } = action.payload;
      if (isOnline && !state.onlineUserIds.includes(userId)) {
        state.onlineUserIds.push(userId);
      } else if (!isOnline) {
        state.onlineUserIds = state.onlineUserIds.filter((id) => id !== userId);
      }
    }
  }
});

export const { setActiveConversation, setTypingUser, setOnlineUsers, setUserOnline } =
  chatSlice.actions;
export default chatSlice.reducer;
