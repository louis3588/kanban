import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";
import {
    AppTheme,
    DEFAULT_THEME,
    themes,
} from "@/theme/themes";
import {
    createWorkspace,
    getWorkspaces, joinWorkspace,
    WorkspaceResponse,
    WorkspaceRole,
} from "@/client/signalr/workspaceClient";

import CreateWorkspaceModal from "@/components/workspaces/CreateWorkspaceModal";
import JoinWorkspaceModal from "@/components/workspaces/JoinWorkspaceModal";

export default function WorkspacesScreen() {
    const { token, preferences } = useAuth();
    const { width } = useWindowDimensions();

    const theme = preferences?.theme ?? DEFAULT_THEME;
    const colours = themes[theme] ?? themes[DEFAULT_THEME];

    const isDarkBackground = [
        AppTheme.SepiaLight,
        AppTheme.SepiaDark,
        AppTheme.Dark,
        AppTheme.Forest,
    ].includes(theme);

    const pageText = isDarkBackground
        ? colours.textLight
        : colours.text;

    const pageMutedText = isDarkBackground
        ? colours.textLight
        : colours.textMuted;

    const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [shareWorkspace, setShareWorkspace] =
        useState<WorkspaceResponse | null>(null);

    const hasShownFirstWorkspace = useRef(false);

    const columns = width >= 1100 ? 3 : width >= 700 ? 2 : 1;

    const cardWidth: `${number}%` =
        columns === 3 ? "31%" :
            columns === 2 ? "48%" :
                "100%";

    useEffect(() => {
        let cancelled = false;
        hasShownFirstWorkspace.current = false;

        const loadWorkspaces = async () => {
            if (!token) {
                setWorkspaces([]);
                setError("Please sign in to view your workspaces.");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);

                const response = await getWorkspaces(token);

                if (cancelled) return;

                setWorkspaces(response);

                if (
                    response.length === 0 &&
                    !hasShownFirstWorkspace.current
                ) {
                    hasShownFirstWorkspace.current = true;
                    setShowCreateModal(true);
                }
            } catch (err) {

            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadWorkspaces();

        return () => {
            cancelled = true;
        };
    }, [token]);

    const refreshWorkspaces = async () => {
        if (!token) return;

        try {
            setIsRefreshing(true);
            setError(null);

            const response = await getWorkspaces(token);
            setWorkspaces(response);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to refresh workspaces."
            );
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleCreateWorkspace = async (name: string) => {
        if (!token) {
            throw new Error("You must be signed in to create a workspace.");
        }

        const created = await createWorkspace(token, name);

        setWorkspaces(current => [...current, created]);
        setShowCreateModal(false);
    };

    const handleJoinWorkspace = async (code: string) => {
        if(!token){
            throw new Error("You must be signed in to join a workspace.");
        }
        const joinedWorkspace = await joinWorkspace(token, code);

        setWorkspaces(current => {
            const alreadyExists = current.some(
                workspace => workspace.id === joinedWorkspace.id
            );

            if(alreadyExists){
                return current.map(workspace =>
                workspace.id === joinedWorkspace.id ?
                joinedWorkspace : workspace);
            }
            return [...current, joinedWorkspace];
        });
        setError(null);
        setShowJoinModal(false);
    }

    const openJoinModal = () => {
        setShowCreateModal(false);
        setShowJoinModal(true);
    };

    const openCreateModal = () => {
        setShowJoinModal(false);
        setShowCreateModal(true);
    };

    const canInvite = (role: WorkspaceRole) =>
        role === WorkspaceRole.Owner ||
        role === WorkspaceRole.Admin;

    const formatDate = (value: string) =>
        new Date(value).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    return (
        <View
            className="flex-1"
            style={{ backgroundColor: colours.background }}
        >
            <ScrollView
                className="flex-1"
                contentContainerClassName="flex-grow items-center px-5 py-8"
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => void refreshWorkspaces()}
                        tintColor={colours.primary}
                    />
                }
            >
                <View className="w-full max-w-6xl">

                    <View className="mb-9 flex-row flex-wrap items-start justify-between gap-4">
                        <View className="min-w-0 flex-1">
                            <View className="mb-2 flex-row items-center gap-2">
                                <Ionicons
                                    name="grid-outline"
                                    size={18}
                                    color={pageMutedText}
                                />
                                <Text
                                    className="text-xs font-bold uppercase tracking-widest"
                                    style={{ color: pageMutedText }}
                                >
                                    Workspace hub
                                </Text>
                            </View>

                            <Text
                                className="text-3xl font-extrabold"
                                style={{ color: pageText }}
                            >
                                Your workspaces
                            </Text>

                            <Text
                                className="mt-3 text-sm leading-6"
                                style={{ color: pageMutedText }}
                            >
                                Bring your teams, projects and boards
                                together in one place.
                            </Text>
                        </View>

                        {!isLoading && workspaces.length > 0 && (
                            <Pressable
                                testID="new-workspace-button"
                                onPress={openCreateModal}
                                className="flex-row items-center gap-2 rounded-xl border px-5 py-3 active:opacity-80"
                                style={{
                                    backgroundColor: colours.surface,
                                    borderColor: colours.border,
                                }}
                            >
                                <Ionicons
                                    name="add"
                                    size={21}
                                    color={colours.primary}
                                />
                                <Text
                                    className="font-bold"
                                    style={{ color: colours.text }}
                                >
                                    New workspace
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    {isLoading ? (
                        <View className="min-h-80 items-center justify-center gap-4">
                            <ActivityIndicator
                                size="large"
                                color={pageText}
                            />
                            <Text
                                className="text-sm"
                                style={{ color: pageMutedText }}
                            >
                                Loading workspaces...
                            </Text>
                        </View>
                    ) : (
                        <>
                            {error && (
                                <View
                                    className="mb-6 flex-row items-center gap-3 rounded-xl border p-4"
                                    style={{
                                        backgroundColor: colours.surface,
                                        borderColor: colours.error,
                                    }}
                                >
                                    <Ionicons
                                        name="alert-circle-outline"
                                        size={22}
                                        color={colours.error}
                                    />
                                    <Text
                                        className="min-w-0 flex-1 text-sm"
                                        style={{ color: colours.error }}
                                    >
                                        {error}
                                    </Text>
                                    <Pressable
                                        onPress={() => void refreshWorkspaces()}
                                        className="p-2"
                                    >
                                        <Text
                                            className="font-bold"
                                            style={{ color: colours.primary }}
                                        >
                                            Retry
                                        </Text>
                                    </Pressable>
                                </View>
                            )}

                            {workspaces.length === 0 ? (
                                <View
                                    className="mx-auto mt-3 w-full max-w-2xl items-center rounded-3xl border px-6 py-12"
                                    style={{
                                        backgroundColor: colours.surface,
                                        borderColor: colours.border,
                                    }}
                                >
                                    <View
                                        className="mb-6 h-20 w-20 items-center justify-center rounded-3xl"
                                        style={{
                                            backgroundColor: colours.primary,
                                        }}
                                    >
                                        <Ionicons
                                            name="layers-outline"
                                            size={37}
                                            color={colours.textLight}
                                        />
                                    </View>

                                    <Text
                                        className="mb-3 text-center text-2xl font-extrabold"
                                        style={{ color: colours.text }}
                                    >
                                        Your next project starts here
                                    </Text>

                                    <Text
                                        className="mb-7 max-w-md text-center text-sm leading-6"
                                        style={{ color: colours.textMuted }}
                                    >
                                        Create a workspace for your own
                                        projects or join an existing team.
                                        It's where your boards, tasks and
                                        collaboration will live.
                                    </Text>

                                    <Pressable
                                        onPress={openCreateModal}
                                        className="flex-row items-center gap-2 rounded-xl px-6 py-4 active:opacity-80"
                                        style={{
                                            backgroundColor: colours.primary,
                                        }}
                                    >
                                        <Ionicons
                                            name="add-circle-outline"
                                            size={21}
                                            color={colours.textLight}
                                        />
                                        <Text
                                            className="font-bold"
                                            style={{ color: colours.textLight }}
                                        >
                                            Create workspace
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={openJoinModal}
                                        className="mt-3 rounded-xl px-4 py-3"
                                    >
                                        <Text
                                            className="font-semibold"
                                            style={{ color: colours.primary }}
                                        >
                                            Join an existing workspace
                                        </Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <>
                                    <View className="mb-5 flex-row flex-wrap items-center justify-between gap-3">
                                        <View>
                                            <Text
                                                className="text-lg font-bold"
                                                style={{ color: pageText }}
                                            >
                                                All workspaces
                                            </Text>

                                            <Text
                                                className="mt-1 text-xs"
                                                style={{ color: pageMutedText }}
                                            >
                                                {workspaces.length}{" "}
                                                {workspaces.length === 1
                                                    ? "workspace"
                                                    : "workspaces"}
                                            </Text>
                                        </View>

                                        <Pressable
                                            onPress={openJoinModal}
                                            className="flex-row items-center gap-2 rounded-lg px-3 py-2"
                                        >
                                            <Ionicons
                                                name="enter-outline"
                                                size={19}
                                                color={pageText}
                                            />
                                            <Text
                                                className="text-sm font-semibold"
                                                style={{ color: pageText }}
                                            >
                                                Join workspace
                                            </Text>
                                        </Pressable>
                                    </View>

                                    <View className="flex-row flex-wrap gap-4">
                                        {workspaces.map(workspace => (
                                            <View
                                                key={workspace.id}
                                                className="min-h-56 justify-between rounded-2xl border p-5"
                                                style={{
                                                    width: cardWidth,
                                                    backgroundColor: colours.surface,
                                                    borderColor: colours.border,
                                                }}
                                            >
                                                <View>
                                                    <View className="mb-6 flex-row items-center justify-between gap-2">
                                                        <View
                                                            className="h-12 w-12 items-center justify-center rounded-2xl"
                                                            style={{
                                                                backgroundColor: colours.primary,
                                                            }}
                                                        >
                                                            <Text
                                                                className="text-xl font-bold"
                                                                style={{
                                                                    color: colours.textLight,
                                                                }}
                                                            >
                                                                {workspace.name
                                                                    .trim()
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </Text>
                                                        </View>

                                                        <View
                                                            className="rounded-full px-3 py-1.5"
                                                            style={{
                                                                backgroundColor: colours.backgroundDark,
                                                            }}
                                                        >
                                                            <Text
                                                                className="text-xs font-semibold"
                                                                style={{
                                                                    color: isDarkBackground
                                                                        ? colours.textLight
                                                                        : colours.text,
                                                                }}
                                                            >
                                                                {workspace.role}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <Text
                                                        className="text-xl font-bold"
                                                        numberOfLines={2}
                                                        style={{
                                                            color: colours.text,
                                                        }}
                                                    >
                                                        {workspace.name}
                                                    </Text>

                                                    <View className="mt-3 flex-row items-center gap-2">
                                                        <Ionicons
                                                            name="calendar-outline"
                                                            size={14}
                                                            color={colours.textMuted}
                                                        />
                                                        <Text
                                                            className="text-xs"
                                                            style={{
                                                                color: colours.textMuted,
                                                            }}
                                                        >
                                                            Created{" "}
                                                            {formatDate(workspace.createdAt)}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View
                                                    className="mt-6 flex-row items-center justify-between border-t pt-4"
                                                    style={{
                                                        borderColor: colours.border,
                                                    }}
                                                >
                                                    <View className="flex-row items-center gap-2">
                                                        <Ionicons
                                                            name="layers-outline"
                                                            size={16}
                                                            color={colours.textMuted}
                                                        />
                                                        <Text
                                                            className="text-xs"
                                                            style={{
                                                                color: colours.textMuted,
                                                            }}
                                                        >
                                                            Workspace
                                                        </Text>
                                                    </View>

                                                    {canInvite(workspace.role) && (
                                                        <Pressable
                                                            accessibilityLabel={`Invite to ${workspace.name}`}
                                                            className="flex-row items-center gap-2 rounded-lg p-2"
                                                            onPress={() =>
                                                                setShareWorkspace(workspace)
                                                            }
                                                        >
                                                            <Ionicons
                                                                name="link-outline"
                                                                size={17}
                                                                color={colours.primary}
                                                            />
                                                            <Text
                                                                className="text-xs font-bold"
                                                                style={{
                                                                    color: colours.primary,
                                                                }}
                                                            >
                                                                Invite
                                                            </Text>
                                                        </Pressable>
                                                    )}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            <CreateWorkspaceModal
                visible={showCreateModal}
                isFirstWorkspace={workspaces.length === 0}
                colours={colours}
                onClose={() => setShowCreateModal(false)}
                onJoin={openJoinModal}
                onCreate={handleCreateWorkspace}
            />

            <JoinWorkspaceModal
                visible={showJoinModal}
                colours={colours}
                onClose={() => setShowJoinModal(false)}
                onCreate={openCreateModal}
                onJoin={handleJoinWorkspace}
            />

            <Modal
                visible={shareWorkspace !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setShareWorkspace(null)}
            >
                <View className="flex-1 items-center justify-center bg-black/60 px-4">
                    <View
                        className="w-full max-w-md rounded-3xl border p-6"
                        style={{
                            backgroundColor: colours.surface,
                            borderColor: colours.border,
                        }}
                    >
                        <View
                            className="mb-5 h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: colours.primary }}
                        >
                            <Ionicons
                                name="share-social-outline"
                                size={27}
                                color={colours.textLight}
                            />
                        </View>

                        <Text
                            className="mb-2 text-2xl font-bold"
                            style={{ color: colours.text }}
                        >
                            Invite your team
                        </Text>

                        <Text
                            className="mb-6 text-sm leading-6"
                            style={{ color: colours.textMuted }}
                        >
                            Shareable invitations for{" "}
                            {shareWorkspace?.name} will be available
                            once invitation generation is implemented
                            on the backend.
                        </Text>

                        <Pressable
                            className="items-center rounded-xl py-4"
                            style={{ backgroundColor: colours.primary }}
                            onPress={() => setShareWorkspace(null)}
                        >
                            <Text
                                className="font-bold"
                                style={{ color: colours.textLight }}
                            >
                                Close
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}