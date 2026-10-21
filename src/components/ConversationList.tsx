"use client";

import { Avatar, Input, Spin, message } from "antd";
import { MessageSquare, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ChatUser, Conversation } from "@/types/chat";
import { useAppSelector } from "@/store/hooks";

function conversationTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function UserAvatar({ user, online }: { user: ChatUser; online: boolean }) {
  return (
    <span className={`relative flex-none after:absolute after:bottom-px after:right-0 after:size-[10px] after:rounded-full after:border-2 after:border-white after:content-[''] ${online ? "after:bg-brand" : "after:bg-[#a6a8b9]"}`}>
      <Avatar src={user.avatar || undefined}>{user.name[0]?.toUpperCase()}</Avatar>
      <span className="sr-only">{online ? "Online" : "Offline"}</span>
    </span>
  );
}

export function ConversationList({
  conversations,
  isLoading,
  isError,
  onRetry,
  onSelect,
  onConversationCreated
}: {
  conversations: Conversation[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelect: (conversation: Conversation) => void;
  onConversationCreated: (conversationId: string) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);
  const [toastApi, toastContext] = message.useMessage();
  const activeId = useAppSelector((state) => state.chat.activeConversationId);
  const onlineUserIds = useAppSelector((state) => state.chat.onlineUserIds);
  const searchQuery = useQuery({
    queryKey: ["user-search", query.trim()],
    enabled: query.trim().length > 0,
    queryFn: () => api<{ users: ChatUser[] }>(`/users?q=${encodeURIComponent(query.trim())}`)
  });
  const createConversation = useMutation({
    mutationFn: (user: ChatUser) =>
      api<{ conversationId: string }>("/conversations", {
        method: "POST",
        body: { userId: user.id }
      }),
    onSuccess: ({ conversationId }) => {
      onConversationCreated(conversationId);
      setSearchInput("");
      setQuery("");
    },
    onError: (error) => toastApi.error(error instanceof Error ? error.message : "Unable to start conversation")
  });
  const results = searchQuery.data?.users || [];

  return (
    <>
      {toastContext}
      <aside className="flex h-full min-h-0 flex-col">
        <div className="flex items-start justify-between px-[21px] pb-[15px] pt-6 max-[760px]:px-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-accent">YOUR SPACE</div>
            <h2 className="mb-0 mt-[5px] text-[22px] font-semibold tracking-[-0.055em] text-ink">Messages</h2>
          </div>
          <span className="mt-[7px] grid size-6 min-w-6 place-items-center rounded-lg bg-brand-soft text-[11px] text-ink">{conversations.length}</span>
        </div>
        <div className="conversation-search px-[18px] pb-[17px]">
          <Input
            allowClear
            prefix={<Search size="1em" aria-hidden="true" />}
            placeholder="Find people by name or email"
            value={searchInput}
            onChange={(event) => {
              const value = event.target.value;
              setSearchInput(value);
              if (!value.trim()) setQuery("");
            }}
            aria-label="Search people or conversations"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-[9px] pb-[14px]">
          {searchInput.trim() ? (
            searchInput.trim() !== query.trim() || searchQuery.isFetching ? (
              <div role="status" className="px-[26px] py-[38px] text-center text-xs leading-[1.7] text-muted-ui"><span className="sr-only">Searching people.</span><Spin size="small" /></div>
            ) : searchQuery.isError ? (
              <div role="alert" className="px-[26px] py-[38px] text-center text-xs leading-[1.7] text-muted-ui">
                <p className="mb-3">Couldn’t search just now. Please try again.</p>
                <button className="retry-action rounded-lg border border-line-soft bg-white px-3 py-2 font-medium text-brand hover:bg-canvas" type="button" onClick={() => void searchQuery.refetch()}>Retry search</button>
              </div>
            ) : results.length ? (
              <div>
              <span className="sr-only" role="status" aria-live="polite">{results.length} {results.length === 1 ? "person" : "people"} found.</span>
              <div className="px-3 pb-1.5 pt-2 text-[9px] font-bold tracking-[0.12em] text-muted-ui">PEOPLE</div>
                {results.map((user) => {
                  const online = onlineUserIds.includes(user.id);
                  return (
                    <button
                      className="conversation-row my-0.5 flex min-h-[74px] w-full items-center gap-3 rounded-xl border-0 bg-transparent px-3 py-[11px] text-left transition-[background,transform] duration-150 hover:bg-canvas active:scale-[0.99] disabled:cursor-wait"
                      key={user.id}
                      type="button"
                      onClick={() => createConversation.mutate(user)}
                      disabled={createConversation.isPending}
                    >
                      <UserAvatar user={user} online={online} />
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="flex min-w-0 items-center justify-between gap-2"><strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-ink">{user.name}</strong></span>
                        <span className="flex min-w-0 items-center justify-between gap-2"><span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-ui">{user.email}</span></span>
                      </span>
                      <Plus className="text-muted-ui" size={12} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div role="status" className="px-[26px] py-[38px] text-center text-xs leading-[1.7] text-muted-ui">No people found. Try a different name or email.</div>
            )
          ) : isLoading ? (
            <div className="px-[26px] py-[38px] text-center text-xs leading-[1.7] text-muted-ui"><Spin /></div>
          ) : isError ? (
            <div className="px-[26px] py-[38px] text-center text-xs leading-[1.7] text-muted-ui">
              <p className="mb-3">Couldn’t load your conversations. Please try again.</p>
              <button className="retry-action rounded-lg border border-line-soft bg-white px-3 py-2 font-medium text-brand hover:bg-canvas" type="button" onClick={onRetry}>Retry</button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-[26px] py-[38px] text-center text-xs leading-[1.7] text-muted-ui">
              <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-brand-soft text-[19px] text-brand"><MessageSquare size="1em" aria-hidden="true" /></span>
              Your conversations will feel right at home here. Search for a person to say hello.
            </div>
          ) : (
            <div>
              <div className="px-3 pb-1.5 pt-2 text-[9px] font-bold tracking-[0.12em] text-muted-ui">RECENT</div>
              {conversations.map((conversation) => {
                const user = conversation.participant;
                if (!user) return null;
                const online = onlineUserIds.includes(user.id);
                const lastMessage = conversation.lastMessage;
                let preview = "Start a conversation";
                if (lastMessage) {
                  preview = lastMessage.senderId === user.id
                    ? lastMessage.text
                    : `You: ${lastMessage.text}`;
                }
                return (
                  <button
                    className={`conversation-row my-0.5 flex min-h-[74px] w-full items-center gap-3 rounded-xl border-0 px-3 py-[11px] text-left transition-[background,transform] duration-150 hover:bg-canvas active:scale-[0.99] max-[760px]:min-h-[78px] max-[760px]:px-[17px] ${activeId === conversation.id ? "bg-brand-soft hover:!bg-brand-soft" : "bg-transparent"}`}
                    key={conversation.id}
                    type="button"
                    onClick={() => onSelect(conversation)}
                    aria-current={activeId === conversation.id ? "true" : undefined}
                  >
                    <UserAvatar user={user} online={online} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="flex min-w-0 items-center justify-between gap-2">
                        <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-ink">{user.name}</strong>
                        <time className="flex-none text-[10px] text-muted-ui">{conversationTime(conversation.lastMessage?.createdAt)}</time>
                      </span>
                      <span className="flex min-w-0 items-center justify-between gap-2">
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-muted-ui">{preview}</span>
                        {conversation.unreadCount > 0 && (
                          <span className="grid size-[19px] min-w-[19px] flex-none place-items-center rounded-[7px] bg-brand text-[10px] font-semibold text-white">{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-line-soft px-[18px] pb-[15px] pt-3 text-[10px] text-muted-ui">
          {onlineUserIds.length} {onlineUserIds.length === 1 ? "person" : "people"} online
        </div>
      </aside>
    </>
  );
}
