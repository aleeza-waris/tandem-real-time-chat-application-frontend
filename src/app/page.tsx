"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Avatar, Button, Input, Modal, Spin, message as toast } from "antd";
import Image from "next/image";
import { Camera, ChevronDown, LogOut, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthForm } from "@/components/AuthForm";
import { ChatWindow } from "@/components/ChatWindow";
import { ConversationList } from "@/components/ConversationList";
import { LoadingScreen } from "./loading";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { ChatMessage, ChatUser, Conversation } from "@/types/chat";
import {
  setActiveConversation,
  setOnlineUsers,
  setUserOnline,
} from "@/store/chatSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function Home() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const activeId = useAppSelector((state) => state.chat.activeConversationId);
  const [authUser, setAuthUser] = useState<ChatUser | null>(null);
  const authenticatedUserId = authUser?.id;
  const [authChecked, setAuthChecked] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const nameSaveInProgress = useRef(false);
  const [toastApi, toastContext] = toast.useMessage();
  const authQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: ChatUser }>("/auth/me"),
    retry: false,
  });
  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api<{ conversations: Conversation[] }>("/conversations"),
    enabled: Boolean(authUser),
    refetchInterval: 30000,
  });
  const conversations = conversationsQuery.data?.conversations || [];
  const sessionIsSignedOut =
    authQuery.error instanceof Error &&
    authQuery.error.message === "Authentication required";
  const activeConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeId) ||
      null,
    [activeId, conversations],
  );

  useEffect(() => {
    if (authQuery.isSuccess) setAuthUser(authQuery.data.user);
    setAuthChecked(!authQuery.isLoading);
  }, [authQuery.data, authQuery.isLoading, authQuery.isSuccess]);

  useEffect(() => {
    if (!mobileProfileMenuOpen) return;

    function closeMenuOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !mobileProfileMenuRef.current?.contains(event.target)
      ) {
        setMobileProfileMenuOpen(false);
      }
    }

    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileProfileMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeMenuOutside);
    document.addEventListener("keydown", closeMenuOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeMenuOutside);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [mobileProfileMenuOpen]);

  useEffect(() => {
    if (!authenticatedUserId) return;
    const socket = getSocket();
    const onPresenceSnapshot = ({ userIds }: { userIds: string[] }) =>
      dispatch(setOnlineUsers(userIds));
    const onPresence = (event: { userId: string; isOnline: boolean }) =>
      dispatch(setUserOnline(event));
    const onUpdated = () =>
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    const onConnectError = () => {
      toastApi.error("Chat connection lost. Reconnecting...");
    };
    socket.on("presence:snapshot", onPresenceSnapshot);
    socket.on("presence:changed", onPresence);
    socket.on("conversation:updated", onUpdated);
    socket.on("connect_error", onConnectError);
    socket.connect();
    return () => {
      socket.off("presence:snapshot", onPresenceSnapshot);
      socket.off("presence:changed", onPresence);
      socket.off("conversation:updated", onUpdated);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [authenticatedUserId, dispatch, queryClient, toastApi]);

  const avatarUploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      return api<{ avatar: string }>("/users/avatar", { method: "POST", body: formData });
    },
    onSuccess: ({ avatar }) => updateAvatarInUI(avatar),
    onError: (error) => {
      toastApi.error(error instanceof Error ? error.message : "Unable to upload profile picture");
    }
  });

  const avatarRemovalMutation = useMutation({
    mutationFn: () => {
      if (process.env.NODE_ENV !== "production") {
        console.log("[Avatar Delete] Mutation started");
        console.log("[Avatar Delete] Sending DELETE request");
      }
      return api<{ avatar: string }>("/users/avatar", { method: "DELETE" });
    },
    onSuccess: ({ avatar }) => {
      if (process.env.NODE_ENV !== "production") {
        console.log("[Avatar Delete] Success");
      }
      updateAvatarInUI(avatar);
    },
    onError: (error) => {
      if (process.env.NODE_ENV !== "production") {
        console.log("[Avatar Delete] Error", error);
      }
      toastApi.error(error instanceof Error ? error.message : "Unable to remove profile picture");
    }
  });

  const displayNameMutation = useMutation({
    mutationFn: (name: string) =>
      api<{ user: { id: string; name: string } }>("/users/name", {
        method: "PATCH",
        body: { name }
      }),
    onSuccess: ({ user }) => {
      setAuthUser((current) => current ? { ...current, name: user.name } : current);
      queryClient.setQueryData<{ user: ChatUser }>(["me"], (current) =>
        current ? { ...current, user: { ...current.user, name: user.name } } : current
      );
      queryClient.setQueriesData<{ conversations: Conversation[] }>(
        { queryKey: ["conversations"] },
        (current) => current ? {
          ...current,
          conversations: current.conversations.map((conversation) =>
            conversation.participant?.id === user.id
              ? { ...conversation, participant: { ...conversation.participant, name: user.name } }
              : conversation
          )
        } : current
      );
      queryClient.setQueriesData<{ users: ChatUser[] }>(
        { queryKey: ["user-search"] },
        (current) => current ? {
          ...current,
          users: current.users.map((cachedUser) =>
            cachedUser.id === user.id ? { ...cachedUser, name: user.name } : cachedUser
          )
        } : current
      );
      queryClient.setQueriesData<{ messages: ChatMessage[] }>(
        { queryKey: ["messages"] },
        (current) => current ? {
          ...current,
          messages: current.messages.map((chatMessage) =>
            chatMessage.sender.id === user.id
              ? { ...chatMessage, sender: { ...chatMessage.sender, name: user.name } }
              : chatMessage
          )
        } : current
      );
      setNameError("");
      setNameDialogOpen(false);
      toastApi.success("Display name updated");
    },
    onError: (error) => {
      setNameError(error instanceof Error ? error.message : "Unable to update display name");
    },
    onSettled: () => {
      nameSaveInProgress.current = false;
    }
  });

  function saveDisplayName() {
    const name = nameDraft.trim();
    if (nameSaveInProgress.current || displayNameMutation.isPending) return;
    if (!name || name.length > 80) {
      setNameError("Enter a name between 1 and 80 characters");
      return;
    }
    if (name === authUser?.name) {
      setNameDialogOpen(false);
      return;
    }

    nameSaveInProgress.current = true;
    setNameError("");
    displayNameMutation.mutate(name);
  }

  function openDisplayNameDialog() {
    if (!authUser) return;
    setNameDraft(authUser.name);
    setNameError("");
    setNameDialogOpen(true);
  }

  function removeProfilePicture() {
    if (process.env.NODE_ENV !== "production") {
      console.log("[Avatar Delete] Remove button clicked");
    }
    if (avatarRemovalMutation.isPending) return;
    if (process.env.NODE_ENV !== "production") {
      console.log("[Avatar Delete] Calling mutation");
    }
    avatarRemovalMutation.mutate();
  }

  function updateAvatarInUI(avatar: string) {
    setAuthUser((current) => current ? { ...current, avatar } : current);
    void queryClient.invalidateQueries({ queryKey: ["me"] });
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    void queryClient.invalidateQueries({ queryKey: ["user-search"] });
    toastApi.success("Profile picture updated");
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toastApi.error("Choose a JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastApi.error("Profile picture must be 5 MB or smaller");
      return;
    }
    avatarUploadMutation.mutate(file);
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setAuthUser(null);
      dispatch(setActiveConversation(null));
      await queryClient.clear();
      getSocket().disconnect();
    } catch (error) {
      toastApi.error(
        error instanceof Error ? error.message : "Unable to sign out",
      );
    }
  }

  async function openConversation(conversation: Conversation) {
    dispatch(setActiveConversation(conversation.id));
  }

  function createdConversation(conversationId: string) {
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    dispatch(setActiveConversation(conversationId));
  }

  if (!authChecked) return <LoadingScreen />;
  if (authQuery.isError && !sessionIsSignedOut) {
    return (
      <main className="grid min-h-svh place-items-center bg-canvas p-6 text-center text-[13px] text-muted-ui">
        {toastContext}
        <div className="rounded-2xl border border-line-soft bg-white px-6 py-6 shadow-[0_8px_24px_rgb(37_36_58_/_5%)]">
          <p className="mb-4">
            We couldn’t check your session. Please check your connection and try
            again.
          </p>
          <Button
            loading={authQuery.isFetching}
            onClick={() => void authQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      </main>
    );
  }
  if (!authUser) {
    return (
      <>
        {toastContext}
        <AuthForm
          onAuthenticated={(user) => {
            setAuthUser(user);
            void queryClient.invalidateQueries({ queryKey: ["me"] });
          }}
        />
      </>
    );
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(ellipse_at_5%_0%,rgb(233_231_255_/_70%),transparent_32%),var(--canvas)] p-6 max-[900px]:p-3 max-[760px]:bg-white max-[760px]:p-0">
      {toastContext}
      <div className="mx-auto flex h-[calc(100svh-48px)] min-h-[560px] w-full max-w-[1320px] flex-col overflow-hidden rounded-[22px] border border-line-soft bg-white shadow-[0_24px_70px_rgb(37_36_58_/_9%),0_2px_8px_rgb(37_36_58_/_3%)] max-[900px]:h-[calc(100svh-24px)] max-[900px]:min-h-[520px] max-[760px]:h-svh max-[760px]:min-h-0 max-[760px]:rounded-none max-[760px]:border-0 max-[760px]:shadow-none">
        <header className="flex h-[68px] min-h-[68px] items-center justify-between border-b border-line bg-white px-6 max-[760px]:h-[60px] max-[760px]:min-h-[60px] max-[760px]:px-4">
          <div className="flex items-center">
            <div className="flex items-center gap-[10px]">
              <Image
                src="/tandem-favicon.png"
                alt=""
                width={40}
                height={40}
                className="size-[35px] object-contain"
                priority
              />
              <span className="flex flex-col gap-px text-[13px] font-bold tracking-[-0.02em] text-ink">
                Tandem
                <span className="text-[10px] font-normal tracking-[0.015em] text-muted-ui">
                  GOOD CONVERSATIONS, CLOSER
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center gap-[11px]">
              <Avatar className="max-[760px]:!hidden" size={34} src={authUser.avatar || undefined}>
                {authUser.name[0]?.toUpperCase()}
              </Avatar>
              <span className="flex flex-col leading-[1.3] max-[760px]:hidden">
                <strong className="text-xs font-semibold text-ink">
                  {authUser.name}
                </strong>
                <span className="text-[10px] text-muted-ui">
                  Your personal inbox
                </span>
              </span>
              <Button
                className="max-[760px]:!hidden"
                type="text"
                size="small"
                icon={<Pencil size={14} aria-hidden="true" />}
                aria-label="Edit display name"
                title="Edit display name"
                onClick={openDisplayNameDialog}
              />
              <div ref={mobileProfileMenuRef} className="relative">
                <Button
                  className="!hidden items-center gap-1 rounded-full p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-[760px]:!inline-flex"
                  type="text"
                  htmlType="button"
                  aria-label="Open profile actions"
                  title="Profile actions"
                  aria-haspopup="menu"
                  aria-expanded={mobileProfileMenuOpen}
                  aria-controls="mobile-profile-actions"
                  onClick={() => setMobileProfileMenuOpen((open) => !open)}
                >
                  <Avatar size={34} src={authUser.avatar || undefined}>
                    {authUser.name[0]?.toUpperCase()}
                  </Avatar>
                  <ChevronDown size={13} aria-hidden="true" />
                </Button>
                {mobileProfileMenuOpen && (
                  <div
                    id="mobile-profile-actions"
                    className="absolute right-0 top-full z-[1000] mt-2 w-56 rounded-xl border border-line-soft bg-white p-1.5 shadow-[0_12px_32px_rgb(37_36_58_/_16%)]"
                    role="menu"
                    aria-label="Profile actions"
                  >
                    <button
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      role="menuitem"
                      disabled={avatarUploadMutation.isPending || avatarRemovalMutation.isPending}
                      onClick={() => {
                        setMobileProfileMenuOpen(false);
                        avatarInputRef.current?.click();
                      }}
                    >
                      {avatarUploadMutation.isPending ? <Spin size="small" /> : <Camera size={15} aria-hidden="true" />}
                      {avatarUploadMutation.isPending ? "Uploading picture..." : "Change profile picture"}
                    </button>
                    <button
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      role="menuitem"
                      disabled={avatarUploadMutation.isPending || avatarRemovalMutation.isPending}
                      onClick={() => {
                        setMobileProfileMenuOpen(false);
                        removeProfilePicture();
                      }}
                    >
                      {avatarRemovalMutation.isPending ? <Spin size="small" /> : <Trash2 size={15} aria-hidden="true" />}
                      {avatarRemovalMutation.isPending ? "Removing picture..." : "Remove profile picture"}
                    </button>
                    <button
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
                      type="button"
                      role="menuitem"
                      disabled={displayNameMutation.isPending}
                      onClick={() => {
                        setMobileProfileMenuOpen(false);
                        openDisplayNameDialog();
                      }}
                    >
                      {displayNameMutation.isPending ? <Spin size="small" /> : <Pencil size={15} aria-hidden="true" />}
                      {displayNameMutation.isPending ? "Saving name..." : "Edit display name"}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <input
              ref={avatarInputRef}
              className="hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileChange}
              aria-label="Choose a profile picture"
            />
            <div className="ml-2 flex items-center gap-0.5 max-[760px]:!hidden">
              <Button
                type="text"
                size="small"
                icon={<Camera size={15} aria-hidden="true" />}
                aria-label="Change profile picture"
                title="Change profile picture"
                loading={avatarUploadMutation.isPending}
                disabled={avatarRemovalMutation.isPending}
                onClick={() => avatarInputRef.current?.click()}
              />
              <Button
                type="text"
                size="small"
                icon={<Trash2 size={15} aria-hidden="true" />}
                aria-label="Remove profile picture"
                title="Remove profile picture"
                loading={avatarRemovalMutation.isPending}
                disabled={avatarUploadMutation.isPending || avatarRemovalMutation.isPending}
                onClick={removeProfilePicture}
              />
            </div>
            <Button
  className="!ml-2 !h-[34px] !rounded-[9px] !border-[#4F46E5] !bg-[#4F46E5] !text-[11px] !text-white hover:!border-[#4338CA] hover:!bg-[#4338CA] max-[760px]:!ml-px max-[760px]:!h-[31px] max-[760px]:!px-[9px]"
  icon={<LogOut size="1em" aria-hidden="true" />}
  onClick={() => void logout()}
>
  Sign out
</Button>
          </div>
        </header>
        <Modal
          title="Edit display name"
          open={nameDialogOpen}
          onCancel={() => setNameDialogOpen(false)}
          onOk={saveDisplayName}
          okText="Save"
          confirmLoading={displayNameMutation.isPending}
          cancelButtonProps={{ disabled: displayNameMutation.isPending }}
          closable={!displayNameMutation.isPending}
          maskClosable={!displayNameMutation.isPending}
        >
          <label className="mb-2 mt-2 block text-xs font-medium text-ink" htmlFor="display-name-input">Display name</label>
          <Input
            id="display-name-input"
            autoFocus
            maxLength={80}
            value={nameDraft}
            onChange={(event) => {
              setNameDraft(event.target.value);
              if (nameError) setNameError("");
            }}
            onPressEnter={saveDisplayName}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "display-name-error" : undefined}
          />
          {nameError && <p id="display-name-error" role="alert" className="mb-0 mt-2 text-xs text-[#D9485F]">{nameError}</p>}
        </Modal>
        <div className="relative flex min-h-0 flex-1">
          <aside
            className={`w-[350px] min-w-[320px] border-r border-line bg-white max-[900px]:w-[310px] max-[900px]:min-w-[290px] max-[760px]:w-full max-[760px]:min-w-0 max-[760px]:border-r-0 ${activeId ? "max-[760px]:hidden" : ""}`}
          >
            <ConversationList
              conversations={conversations}
              isLoading={conversationsQuery.isLoading}
              isError={conversationsQuery.isError}
              onRetry={() => void conversationsQuery.refetch()}
              onSelect={(conversation) => void openConversation(conversation)}
              onConversationCreated={createdConversation}
            />
          </aside>
          <ChatWindow
            key={activeId || "empty"}
            conversation={activeConversation}
            currentUserId={authUser.id}
            onBack={() => dispatch(setActiveConversation(null))}
          />
        </div>
      </div>
    </main>
  );
}
