"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Avatar, Button, Input, message as toast, Spin, type InputRef } from "antd";
import { ArrowLeft, ArrowUp, MessageCircle, Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { ChatMessage, Conversation } from "@/types/chat";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setTypingUser } from "@/store/chatSlice";
import { EmojiPicker } from "@/components/EmojiPicker";

function timestamp(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();

  if (dateKey(value) === dateKey(today.toISOString())) {
    return "Today";
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateKey(value) === dateKey(yesterday.toISOString())) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ChatWindow({
  conversation,
  currentUserId,
  onBack,
}: {
  conversation: Conversation | null;
  currentUserId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const onlineUserIds = useAppSelector((state) => state.chat.onlineUserIds);
  const typingUserId = useAppSelector((state) => state.chat.typingUserId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState("");
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [toastApi, toastContext] = toast.useMessage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<InputRef>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationId = conversation?.id;
  const peer = conversation?.participant;

  const messageQuery = useQuery({
    queryKey: ["messages", conversationId],
    enabled: Boolean(conversationId),
    queryFn: () =>
      api<{ messages: ChatMessage[]; hasMore: boolean }>(
        `/conversations/${conversationId}/messages`
      ),
  });

  useEffect(() => {
    setMessages(messageQuery.data?.messages || []);
    setHasOlderMessages(messageQuery.data?.hasMore || false);
  }, [conversationId, messageQuery.data]);

  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    let isActive = true;

    const joinConversation = () => {
      if (process.env.NODE_ENV === "development") {
        console.info("[socket] conversation:join emitted");
      }

      socket.emit(
        "conversation:join",
        conversationId,
        (result: { error?: string }) => {
          if (process.env.NODE_ENV === "development") {
            console.info("[socket] conversation:join acknowledgement", {
              success: !result.error,
              error: result.error,
            });
          }

          if (!isActive) {
            socket.emit("conversation:leave", conversationId);
            return;
          }

          if (result.error) toastApi.error(result.error);
        }
      );
    };

    void api(`/conversations/${conversationId}/read`, { method: "POST" })
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ["conversations"] })
      )
      .catch((error) => {
        toastApi.error(
          error instanceof Error
            ? error.message
            : "Unable to update unread messages"
        );
      });

    const onMessage = (message: ChatMessage) => {
      if (message.conversationId === conversationId) {
        setMessages((current) =>
          current.some((item) => item.id === message.id)
            ? current
            : [...current, message]
        );
      }
    };

    const onTyping = (event: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      if (event.conversationId === conversationId) {
        dispatch(setTypingUser(event.isTyping ? event.userId : null));
      }
    };

    socket.on("message:new", onMessage);
    socket.on("typing:changed", onTyping);
    socket.on("connect", joinConversation);

    if (socket.connected) {
      joinConversation();
    } else {
      socket.connect();
    }

    return () => {
      isActive = false;
      socket.off("connect", joinConversation);
      emitTypingUpdate(conversationId, false);
      socket.emit("conversation:leave", conversationId);
      socket.off("message:new", onMessage);
      socket.off("typing:changed", onTyping);
      dispatch(setTypingUser(null));
    };
  }, [conversationId, dispatch, queryClient, toastApi]);

  function emitTypingUpdate(conversationId: string, isTyping: boolean) {
    const socket = getSocket();
    socket.emit("typing:update", { conversationId, isTyping });
  }

  async function loadOlderMessages() {
    if (!conversationId || !messages.length || loadingOlder) return;

    setLoadingOlder(true);
    setOlderMessagesError("");

    try {
      const result = await api<{
        messages: ChatMessage[];
        hasMore: boolean;
      }>(
        `/conversations/${conversationId}/messages?before=${encodeURIComponent(
          messages[0].createdAt
        )}`
      );

      setMessages((current) => [
        ...result.messages.filter(
          (message) => !current.some((item) => item.id === message.id)
        ),
        ...current,
      ]);

      setHasOlderMessages(result.hasMore);
    } catch (error) {
      setOlderMessagesError(
        error instanceof Error
          ? error.message
          : "Unable to load earlier messages"
      );
    } finally {
      setLoadingOlder(false);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUserId]);

  function updateText(value: string) {
    setText(value);
    if (!conversationId) return;

    emitTypingUpdate(conversationId, value.trim().length > 0);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      emitTypingUpdate(conversationId, false);
    }, 1500);
  }

  function insertEmoji(emoji: string) {
    const input = messageInputRef.current?.input;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? text.length;
    const nextText = `${text.slice(0, start)}${emoji}${text.slice(end)}`;

    if (nextText.length > 4000) {
      toastApi.error("Messages can contain up to 4,000 characters");
      return;
    }

    const nextCursorPosition = start + emoji.length;
    updateText(nextText);

    requestAnimationFrame(() => {
      const currentInput = messageInputRef.current?.input;
      currentInput?.focus();
      currentInput?.setSelectionRange(
        nextCursorPosition,
        nextCursorPosition
      );
    });
  }

  function send() {
    const value = text.trim();

    if (!conversationId || !value || sending) return;

    setSending(true);

    getSocket()
      .timeout(10000)
      .emit(
        "message:send",
        { conversationId, text: value },
        (
          timeoutError: Error | null,
          result?: { error?: string; message?: ChatMessage }
        ) => {
          setSending(false);

          if (timeoutError) {
            toastApi.error("Message send timed out. Please try again.");
            return;
          }

          if (!result) {
            toastApi.error("Message send did not return a result.");
            return;
          }

          if (result.error) {
            toastApi.error(result.error);
            return;
          }

          if (result.message) {
            const sentMessage = result.message;

            setMessages((current) =>
              current.some((item) => item.id === sentMessage.id)
                ? current
                : [...current, sentMessage]
            );

            setText("");
            emitTypingUpdate(conversationId, false);
          }
        }
      );
  }

  if (!conversation || !peer) {
    return (
      <>
        {toastContext}
        <section className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(ellipse_at_100%_0%,rgb(233_231_255_/_65%),transparent_30%),#f7f7fc] max-[760px]:hidden">
          <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">
            <span className="mb-4 grid size-12 place-items-center rounded-2xl border border-line-soft bg-brand-soft/70 text-brand">
              <MessageCircle size={21} aria-hidden="true" />
            </span>
            <h2 className="mb-2 mt-0 text-lg font-semibold tracking-[-0.035em] text-ink">
              Your conversations start here
            </h2>
            <p className="m-0 max-w-[290px] text-sm leading-6 text-muted-ui">
              Choose a conversation from the sidebar to start chatting.
            </p>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {toastContext}
      <section className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(ellipse_at_100%_0%,rgb(233_231_255_/_65%),transparent_30%),#f7f7fc]">
        <header className="flex h-[72px] min-h-[72px] items-center gap-[13px] border-b border-line bg-[#EFEDFA] px-[26px] max-[760px]:h-16 max-[760px]:min-h-16 max-[760px]:gap-2 max-[760px]:px-[15px]">
          <Button
            className="!inline-flex !text-[#62677d] max-[760px]:!size-8 max-[760px]:!-ml-[9px] max-[760px]:!items-center max-[760px]:!justify-center"
            type="text"
            icon={<ArrowLeft size="1em" aria-hidden="true" />}
            onClick={onBack}
            aria-label="Back to conversations"
          />
          <Avatar className="chat-peer-avatar" src={peer.avatar || undefined}>
            {peer.name[0]?.toUpperCase()}
          </Avatar>
          <span className="flex flex-col gap-1">
            <strong className="text-[13px] font-semibold text-ink">
              {peer.name}
            </strong>
            <span
              className={`flex items-center gap-1.5 text-[10px] ${
                onlineUserIds.includes(peer.id)
                  ? "text-brand"
                  : "text-muted-ui"
              }`}
            >
              <i
                className={`size-1.5 rounded-full ${
                  onlineUserIds.includes(peer.id)
                    ? "bg-brand"
                    : "bg-[#a6a8b9]"
                }`}
              />
              {onlineUserIds.includes(peer.id) ? "Online now" : "Offline"}
            </span>
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[clamp(18px,5vw,76px)] py-[27px] max-[760px]:px-4 max-[760px]:py-[22px]">
          <div className="mb-[27px] flex items-center gap-[14px] text-[10px] text-muted-ui before:h-px before:flex-1 before:bg-line-soft before:content-[''] after:h-px after:flex-1 after:bg-line-soft after:content-['']">
            YOUR CONVERSATION
          </div>

          {hasOlderMessages && (
            <div className="mb-4 self-center">
              {olderMessagesError && (
                <p
                  role="alert"
                  className="mb-2 text-center text-xs text-muted-ui"
                >
                  {olderMessagesError}
                </p>
              )}
              <Button
                type="link"
                icon={<ArrowUp size="1em" aria-hidden="true" />}
                loading={loadingOlder}
                onClick={() => void loadOlderMessages()}
              >
                {olderMessagesError
                  ? "Retry loading earlier messages"
                  : "Load earlier messages"}
              </Button>
            </div>
          )}

          {messageQuery.isLoading ? (
            <div className="grid min-h-[140px] place-items-center">
              <Spin />
            </div>
          ) : messageQuery.isError && !messageQuery.data ? (
            <div
              role="alert"
              className="px-[26px] py-[38px] text-center text-xs leading-[1.7] text-muted-ui"
            >
              <p className="mb-3">
                Unable to load conversation history. Please try again.
              </p>
              <Button
                loading={messageQuery.isFetching}
                onClick={() => void messageQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">
              <span className="mb-5 grid size-16 place-items-center rounded-[21px] border border-line-soft bg-brand-soft text-2xl text-brand">
                <Send size="1em" aria-hidden="true" />
              </span>
              <h2 className="mb-[9px] mt-0 text-[23px] font-semibold tracking-[-0.055em] text-ink">
                Say hello to {peer.name.split(" ")[0]}.
              </h2>
              <p className="m-0 max-w-[310px] text-xs leading-[1.7] text-muted-ui">
                This is the beginning of your conversation. Send a message to
                get things started.
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const mine = message.sender.id === currentUserId;
              const showDateSeparator =
                index === 0 ||
                dateKey(message.createdAt) !==
                  dateKey(messages[index - 1].createdAt);

              return (
                <Fragment key={message.id}>
                  {showDateSeparator && (
                    <div className="my-4 flex justify-center">
                      <span className="rounded-full border border-line-soft bg-white/90 px-3 py-1 text-[10px] font-medium text-muted-ui shadow-sm">
                        {dateLabel(message.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`mb-[14px] flex ${
                      mine ? "justify-end" : ""
                    }`}
                  >
                    <div
                      className={`max-w-[min(72%,470px)] rounded-[16px_16px_16px_5px] border px-[14px] pb-2 pt-[11px] shadow-[0_3px_10px_rgb(37_36_58_/_6%)] max-[760px]:max-w-[86%] ${
                        mine
                          ? "border-brand rounded-[16px_16px_5px_16px] bg-brand text-white"
                          : "border-line-soft bg-white text-ink"
                      }`}
                    >
                      <p className="m-0 whitespace-pre-wrap break-words text-[13px] leading-[1.6]">
                        {message.text}
                      </p>
                      <time
                        className={`mt-[5px] block text-right text-[9px] ${
                          mine ? "text-white/80" : "text-muted-ui"
                        }`}
                      >
                        {timestamp(message.createdAt)}
                      </time>
                    </div>
                  </div>
                </Fragment>
              );
            })
          )}

          {typingUserId === peer.id && (
            <div className="mt-1 self-start rounded-[12px_12px_12px_4px] border border-line-soft bg-white px-[13px] py-[9px] text-[10px] text-muted-ui">
              {peer.name} is typing...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <footer className="px-[clamp(18px,5vw,76px)] pb-[22px] pt-3 max-[760px]:px-[13px] max-[760px]:pb-[calc(12px_+_env(safe-area-inset-bottom))] max-[760px]:pt-[9px]">
          <div className="chat-compose flex items-end gap-[9px] rounded-[14px] border border-line-soft bg-white py-[7px] pl-[15px] pr-2 shadow-[0_5px_18px_rgb(37_36_58_/_5%)]">
            <EmojiPicker onEmojiSelect={insertEmoji} />
            <Input
              ref={messageInputRef}
              value={text}
              onChange={(event) => updateText(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              maxLength={4000}
              placeholder={`Write a message to ${peer.name.split(" ")[0]}...`}
              aria-label="Write a message"
            />
            <Button
              className="!grid !size-[38px] !flex-none !place-items-center !rounded-[11px] !border-0 !bg-brand !shadow-none hover:!bg-brand-dark disabled:!bg-brand-soft disabled:!text-ink"
              type="primary"
              icon={<Send size="1em" aria-hidden="true" />}
              onClick={send}
              loading={sending}
              disabled={!text.trim()}
              aria-label="Send message"
            />
          </div>
          <p className="mx-[3px] mb-0 mt-2 text-right text-[9px] text-muted-ui max-[760px]:hidden">
            Press Enter to send · Shift + Enter for a new line
          </p>
        </footer>
      </section>
    </>
  );
}