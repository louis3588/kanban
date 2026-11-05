
import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";
import {
    DEFAULT_THEME,
    themes,
} from "@/theme/themes";
import {
    WorkspaceRole,
    getWorkspace,
    updateWorkspaceName,
    deleteWorkspace,
    createWorkspaceInvitation,
    revokeWorkspaceInvitation,
    updateWorkspaceMemberRole,
    removeWorkspaceMember,
    transferWorkspaceOwnership,
    type WorkspaceBoardResponse,
    type WorkspaceMemberResponse,
    type CreatedWorkspaceInvitation,
} from "@/client/signalr/workspaceClient";

import ConfirmActionModal, {
    type ConfirmationAction,
} from "@/components/workspaces/ConfirmActionModal";

import WorkspaceMembersPanel from "@/components/workspaces/WorkspaceMembersPanel";

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

const getErrorMessage = (error: unknown) =>
    error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.";

export default function WorkspaceBoardsScreen() {
    const { workspaceId: param } =
        useLocalSearchParams<{ workspaceId: string }>();

    const workspaceId = Number(param);
    const validId =
        Number.isSafeInteger(workspaceId) && workspaceId > 0;

    const { token, user, preferences } = useAuth();
    const { width } = useWindowDimensions();

    const [workspace, setWorkspace] =
        useState<WorkspaceBoardResponse | null>(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [editingName, setEditingName] = useState(false);
    const [draftName, setDraftName] = useState("");
    const renameRequested = useRef(false);

    const [confirmation, setConfirmation] =
        useState<ConfirmationAction | null>(null);

    const [creatingInvitation, setCreatingInvitation] = useState(false);
    const [newInvitation, setNewInvitation] =
        useState<CreatedWorkspaceInvitation | null>(null);

    const isWide = width >= 940;
    const boardWidth: `${number}%` =
        width >= 1200 ? "48%" : "100%";

    const theme = preferences?.theme ?? DEFAULT_THEME;
    const colours = themes[theme] ?? themes[DEFAULT_THEME];

    useEffect(() => {
        let active = true;

        setWorkspace(null);
        setError(null);
        setLoading(true);

        if (!token || !validId) {
            setError(
                !token
                    ? "Please sign in to view this workspace."
                    : "Invalid workspace ID."
            );
            setLoading(false);
            return;
        }

        getWorkspace(token, workspaceId)
            .then(data => {
                if (!active) return;

                setWorkspace(data);
                setDraftName(data.name);

                console.log("WorkspaceMembers:", JSON.stringify(data.members, null, 2));
            })
            .catch(err => {
                if (active) {
                    setError(getErrorMessage(err));
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });


        return () => {
            active = false;
        };
    }, [token, workspaceId, validId]);

    const reloadWorkspace = async () => {
        if (!token || !validId) {
            throw new Error("Invalid workspace session.");
        }

        const data = await getWorkspace(token, workspaceId);
        setWorkspace(data);
        setDraftName(data.name);
    };

    const refreshAfterMutation = async () => {
        try {
            await reloadWorkspace();
        } catch {
            setError(
                "The change was submitted, but the workspace could not be refreshed."
            );
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setError(null);

        try {
            await reloadWorkspace();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setRefreshing(false);
        }
    };

    const beginRename = () => {
        if (!workspace?.permissions.canEditWorkspace) return;

        renameRequested.current = false;
        setDraftName(workspace.name);
        setEditingName(true);
    };

    const requestRename = () => {
        if (
            !workspace ||
            !token ||
            !editingName ||
            renameRequested.current ||
            !workspace.permissions.canEditWorkspace
        ) {
            return;
        }

        renameRequested.current = true;
        setEditingName(false);

        const newName = draftName.trim();

        if (!newName || newName.length > 100) {
            setError(
                "Workspace name must be between 1 and 100 characters."
            );
            setDraftName(workspace.name);
            return;
        }

        if (newName === workspace.name) return;

        setConfirmation({
            title: "Rename workspace?",
            message:
                `Are you sure you want to rename "${workspace.name}" ` +
                `to "${newName}"?`,
            confirmationLabel: "Rename",
            onCancel: () => setDraftName(workspace.name),
            onConfirm: async () => {
                await updateWorkspaceName(
                    token,
                    workspace.workspaceId,
                    newName
                );

                setWorkspace(current =>
                    current ? { ...current, name: newName } : current
                );

                setDraftName(newName);
                await refreshAfterMutation();
                setSuccess("Workspace name updated.");
            },
        });
    };

    const requestDeleteWorkspace = () => {
        if (
            !workspace ||
            !token ||
            workspace.role !== WorkspaceRole.Owner
        ) {
            return;
        }

        setConfirmation({
            title: "Delete workspace?",
            message:
                `Are you sure you want to permanently delete ` +
                `"${workspace.name}"? Its boards and associated ` +
                `workspace data will also be deleted. ` +
                `This action cannot be undone.`,
            confirmationLabel: "Delete workspace",
            destructive: true,
            onConfirm: async () => {
                await deleteWorkspace(
                    token,
                    workspace.workspaceId
                );

                router.replace("/workspaces");
            },
        });
    };

    const requestChangeRole = (
        member: WorkspaceMemberResponse,
        role: WorkspaceRole
    ) => {
        if (!workspace || !token) return;

        setConfirmation({
            title: "Change member role?",
            message:
                `Are you sure you want to change ` +
                `@${member.user.username}'s role ` +
                `from ${member.role} to ${role}?`,
            confirmationLabel: "Change role",
            onConfirm: async () => {
                await updateWorkspaceMemberRole(
                    token,
                    workspace.workspaceId,
                    member.user.userId!,
                    role
                );

                await refreshAfterMutation();
                setSuccess("Member role updated.");
            },
        });
    };

    const requestRemoveMember = (
        member: WorkspaceMemberResponse
    ) => {
        if (!workspace || !token) return;

        setConfirmation({
            title: "Remove workspace member?",
            message:
                `Are you sure you want to remove ` +
                `@${member.user.username} from this workspace? ` +
                `They will lose access to its boards and tasks.`,
            confirmationLabel: "Remove member",
            destructive: true,
            onConfirm: async () => {
                await removeWorkspaceMember(
                    token,
                    workspace.workspaceId,
                    member.user.userId!
                );

                await refreshAfterMutation();
                setSuccess("Member removed.");
            },
        });
    };

    const requestTransferOwnership = (
        member: WorkspaceMemberResponse
    ) => {
        if (
            !workspace ||
            !token ||
            workspace.role !== WorkspaceRole.Owner
        ) {
            return;
        }

        setConfirmation({
            title: "Transfer workspace ownership?",
            message:
                `Are you sure you want to make ` +
                `@${member.user.username} the Owner of ` +
                `"${workspace.name}"? You will no longer have ` +
                `the Owner's exclusive permissions.`,
            confirmationLabel: "Transfer ownership",
            destructive: true,
            onConfirm: async () => {
                await transferWorkspaceOwnership(
                    token,
                    workspace.workspaceId,
                    member.user.userId!
                );

                await refreshAfterMutation();
                setSuccess("Ownership transferred.");
            }
        });
    };

    const handleCreateInvitation = async () => {
        if (
            !workspace ||
            !token ||
            !workspace.permissions.canManageInvitations
        ) {
            return;
        }

        setCreatingInvitation(true);
        setError(null);

        try {
            const created = await createWorkspaceInvitation(
                token,
                {
                    workspaceId: workspace.workspaceId,
                    validForDays: 7,
                }
            );

            setNewInvitation(created);
            await refreshAfterMutation();
            setSuccess("Invitation created.");
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setCreatingInvitation(false);
        }
    };

    const requestRevokeInvitation = (invitationId: number) => {
        if (
            !workspace ||
            !token ||
            !workspace.permissions.canManageInvitations
        ) {
            return;
        }

        setConfirmation({
            title: "Revoke invitation?",
            message:
                "Are you sure you want to revoke this invitation? " +
                "Anyone who hasn't redeemed it will no longer " +
                "be able to use it.",
            confirmationLabel: "Revoke invitation",
            destructive: true,
            onConfirm: async () => {
                await revokeWorkspaceInvitation(
                    token,
                    workspace.workspaceId,
                    invitationId
                );

                await refreshAfterMutation();
                setSuccess("Invitation revoked.");
            },
        });
    };

    const cardStyle = {
        backgroundColor: colours.surface,
        borderColor: colours.border,
    };

    if (loading) {
        return (
            <View
                className="flex-1 items-center justify-center"
                style={{ backgroundColor: colours.background }}
            >
                <ActivityIndicator
                    size="large"
                    color={colours.primary}
                />
                <Text
                    className="mt-4"
                    style={{ color: colours.textMuted }}
                >
                    Loading workspace...
                </Text>
            </View>
        );
    }

    if (!workspace) {
        return (
            <View
                className="flex-1 items-center justify-center px-6"
                style={{ backgroundColor: colours.background }}
            >
                <Ionicons
                    name="alert-circle-outline"
                    size={42}
                    color={colours.error}
                />

                <Text
                    className="mt-4 text-center text-lg font-bold"
                    style={{ color: colours.text }}
                >
                    Workspace unavailable
                </Text>

                <Text
                    className="mt-2 text-center"
                    style={{ color: colours.textMuted }}
                >
                    {error ?? "Unable to load this workspace."}
                </Text>

                <Pressable
                    onPress={() => router.replace("/workspaces")}
                    className="mt-6 rounded-xl px-5 py-3"
                    style={{ backgroundColor: colours.primary }}
                >
                    <Text
                        className="font-semibold"
                        style={{ color: colours.textLight }}
                    >
                        Back to workspaces
                    </Text>
                </Pressable>
            </View>
        );
    }

    const boards = [...workspace.boards].sort(
        (a, b) => a.position - b.position || a.boardId - b.boardId
    );

    const canInvite = workspace.permissions.canManageInvitations;

    return (
        <View
            className="flex-1"
            style={{ backgroundColor: colours.background }}
        >
            <ScrollView
                testID="workspace-scroll"
                className="flex-1"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => void handleRefresh()}
                        tintColor={colours.primary}
                    />
                }
            >
                <View className="mx-auto w-full max-w-6xl px-5 py-8">
                    <Pressable
                        onPress={() => router.push("/workspaces")}
                        className="mb-6 flex-row items-center gap-2 self-start"
                    >
                        <Ionicons
                            name="arrow-back"
                            size={17}
                            color={colours.textMuted}
                        />
                        <Text style={{ color: colours.textMuted }}>
                            Your workspaces
                        </Text>
                    </Pressable>

                    <View
                        className="mb-7 rounded-3xl border p-5"
                        style={cardStyle}
                    >
                        <View className="flex-row flex-wrap items-center gap-4">
                            {workspace.imageUrl ? (
                                <Image
                                    source={{ uri: workspace.imageUrl }}
                                    className="h-20 w-20 rounded-2xl"
                                    resizeMode="cover"
                                />
                            ) : (
                                <View
                                    className="h-20 w-20 items-center justify-center rounded-2xl"
                                    style={{
                                        backgroundColor: colours.primary,
                                    }}
                                >
                                    <Ionicons
                                        name="layers-outline"
                                        size={36}
                                        color={colours.textLight}
                                    />
                                </View>
                            )}

                            <View className="min-w-0 flex-1">
                                {editingName ? (
                                    <TextInput
                                        testID="workspace-name-edit"
                                        autoFocus
                                        value={draftName}
                                        maxLength={100}
                                        onChangeText={setDraftName}
                                        onBlur={requestRename}
                                        onSubmitEditing={requestRename}
                                        returnKeyType="done"
                                        className="rounded-xl border px-3 py-2 text-xl font-bold"
                                        style={{
                                            color: colours.text,
                                            borderColor: colours.primary,
                                            backgroundColor: colours.background,
                                        }}
                                    />
                                ) : (
                                    <View className="flex-row items-center gap-3">
                                        <Text
                                            className="min-w-0 shrink text-2xl font-extrabold"
                                            style={{ color: colours.text }}
                                        >
                                            {workspace.name}
                                        </Text>

                                        {workspace.permissions.canEditWorkspace && (
                                            <Pressable
                                                testID="rename-workspace"
                                                accessibilityLabel="Rename workspace"
                                                onPress={beginRename}
                                                className="p-2"
                                            >
                                                <Ionicons
                                                    name="pencil-outline"
                                                    size={19}
                                                    color={colours.primary}
                                                />
                                            </Pressable>
                                        )}
                                    </View>
                                )}

                                <Text
                                    className="mt-2 text-sm"
                                    style={{ color: colours.textMuted }}
                                >
                                    Created {formatDate(workspace.createdAt)}
                                    {" · "}
                                    {boards.length} boards
                                    {" · "}
                                    {workspace.members.length} members
                                </Text>

                                <Text
                                    className="mt-1 text-xs font-semibold"
                                    style={{ color: colours.primary }}
                                >
                                    Your role: {workspace.role}
                                </Text>
                            </View>

                            {workspace.role === WorkspaceRole.Owner && (
                                <Pressable
                                    testID="delete-workspace"
                                    onPress={requestDeleteWorkspace}
                                    className="flex-row items-center gap-2 rounded-xl border px-4 py-3"
                                    style={{ borderColor: colours.error }}
                                >
                                    <Ionicons
                                        name="trash-outline"
                                        size={18}
                                        color={colours.error}
                                    />
                                    <Text style={{ color: colours.error }}>
                                        Delete
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {error && (
                        <View
                            className="mb-5 rounded-xl border p-4"
                            style={{
                                backgroundColor: colours.surface,
                                borderColor: colours.error,
                            }}
                        >
                            <Text style={{ color: colours.error }}>
                                {error}
                            </Text>
                            <Pressable
                                className="mt-2 self-start"
                                onPress={() => setError(null)}
                            >
                                <Text style={{ color: colours.primary }}>
                                    Dismiss
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {success && (
                        <Pressable
                            onPress={() => setSuccess(null)}
                            className="mb-5 rounded-xl border p-4"
                            style={cardStyle}
                        >
                            <Text style={{ color: colours.text }}>
                                {success}
                            </Text>
                        </Pressable>
                    )}

                    <View className="flex-row flex-wrap gap-6">
                        <View
                            style={{
                                flexBasis: isWide ? "62%" : "100%",
                                flexGrow: 1,
                                minWidth: 0,
                            }}
                        >
                            <View className="mb-4 flex-row items-center justify-between">
                                <Text
                                    className="text-xl font-bold"
                                    style={{ color: colours.text }}
                                >
                                    Boards
                                </Text>

                                <Text
                                    className="text-sm"
                                    style={{ color: colours.textMuted }}
                                >
                                    {boards.length} total
                                </Text>
                            </View>

                            {boards.length === 0 ? (
                                <View
                                    className="items-center rounded-2xl border px-6 py-14"
                                    style={cardStyle}
                                >
                                    <Ionicons
                                        name="albums-outline"
                                        size={38}
                                        color={colours.primary}
                                    />
                                    <Text
                                        className="mt-4 text-lg font-bold"
                                        style={{ color: colours.text }}
                                    >
                                        No boards yet
                                    </Text>
                                    <Text
                                        className="mt-2 text-center text-sm"
                                        style={{ color: colours.textMuted }}
                                    >
                                        {workspace.permissions.canManageBoards
                                            ? "This workspace is ready for its first board."
                                            : "An administrator can add boards to this workspace."}
                                    </Text>
                                </View>
                            ) : (
                                <View className="flex-row flex-wrap gap-4">
                                    {boards.map(board => (
                                        <Pressable
                                            key={board.boardId}
                                            testID={`board-card-${board.boardId}`}
                                            onPress={() =>
                                                router.push({
                                                    pathname: "/boards/[boardId]",
                                                    params: {
                                                        boardId: String(board.boardId),
                                                    },
                                                })
                                            }
                                            className="overflow-hidden rounded-2xl border"
                                            style={{
                                                ...cardStyle,
                                                width: boardWidth,
                                            }}
                                        >
                                            {board.imageUrl ? (
                                                <Image
                                                    source={{ uri: board.imageUrl }}
                                                    className="h-36 w-full"
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View
                                                    className="h-36 items-center justify-center"
                                                    style={{
                                                        backgroundColor: colours.background,
                                                    }}
                                                >
                                                    <Ionicons
                                                        name="grid-outline"
                                                        size={40}
                                                        color={colours.primary}
                                                    />
                                                </View>
                                            )}

                                            <View className="flex-row items-center justify-between p-4">
                                                <Text
                                                    numberOfLines={2}
                                                    className="min-w-0 flex-1 text-base font-bold"
                                                    style={{ color: colours.text }}
                                                >
                                                    {board.name}
                                                </Text>

                                                <Ionicons
                                                    name="arrow-forward"
                                                    size={19}
                                                    color={colours.primary}
                                                />
                                            </View>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View
                            style={{
                                flexBasis: isWide ? "30%" : "100%",
                                flexGrow: 1,
                                minWidth: 0,
                            }}
                        >
                            <WorkspaceMembersPanel
                                workspace={workspace}
                                currentUserId={user?.id}
                                onChangeRole={requestChangeRole}
                                onRemove={requestRemoveMember}
                                onTransferOwnership={requestTransferOwnership}
                                colours={colours}
                            />

                            {canInvite && (
                                <View
                                    className="mt-5 rounded-2xl border p-5"
                                    style={cardStyle}
                                >
                                    <Text
                                        className="text-lg font-bold"
                                        style={{ color: colours.text }}
                                    >
                                        Invitations
                                    </Text>

                                    <Text
                                        className="mt-2 text-sm"
                                        style={{ color: colours.textMuted }}
                                    >
                                        Invite someone to collaborate
                                        in this workspace.
                                    </Text>

                                    <Pressable
                                        testID="create-invitation"
                                        disabled={creatingInvitation}
                                        onPress={() =>
                                            void handleCreateInvitation()
                                        }
                                        className="mt-4 flex-row items-center justify-center gap-2 rounded-xl px-4 py-3"
                                        style={{
                                            backgroundColor: colours.primary,
                                            opacity: creatingInvitation ? 0.6 : 1,
                                        }}
                                    >
                                        {creatingInvitation ? (
                                            <ActivityIndicator
                                                color={colours.textLight}
                                                size="small"
                                            />
                                        ) : (
                                            <Ionicons
                                                name="link-outline"
                                                size={18}
                                                color={colours.textLight}
                                            />
                                        )}

                                        <Text
                                            className="font-bold"
                                            style={{ color: colours.textLight }}
                                        >
                                            Create invitation
                                        </Text>
                                    </Pressable>

                                    {newInvitation && (
                                        <View className="mt-4">
                                            <Text
                                                className="mb-2 text-xs font-bold"
                                                style={{ color: colours.text }}
                                            >
                                                New invitation link
                                            </Text>

                                            <TextInput
                                                testID="created-invitation-url"
                                                value={newInvitation.inviteUrl}
                                                editable={false}
                                                selectTextOnFocus
                                                className="rounded-lg border p-3 text-xs"
                                                style={{
                                                    color: colours.text,
                                                    borderColor: colours.border,
                                                }}
                                            />

                                            <Text
                                                className="mt-2 text-xs"
                                                style={{ color: colours.textMuted }}
                                            >
                                                Save or share this link now.
                                                It won't be returned when
                                                you reload the invitation list.
                                            </Text>
                                        </View>
                                    )}

                                    <View className="mt-5">
                                        {workspace.invitations.map(invite => {
                                            const revoked =
                                                Boolean(invite.revokedAtUtc);

                                            const expired =
                                                new Date(invite.expiresAtUtc)
                                                    .getTime() <= Date.now();

                                            const exhausted =
                                                invite.maxUses != null &&
                                                invite.redeemedCount >= invite.maxUses;

                                            const active =
                                                !revoked &&
                                                !expired &&
                                                !exhausted;

                                            return (
                                                <View
                                                    key={invite.id}
                                                    className="border-t py-3"
                                                    style={{
                                                        borderColor: colours.border,
                                                    }}
                                                >
                                                    <View className="flex-row items-center justify-between">
                                                        <View className="flex-1">
                                                            <Text
                                                                className="text-sm font-semibold"
                                                                style={{
                                                                    color: colours.text,
                                                                }}
                                                            >
                                                                Invitation #{invite.id}
                                                            </Text>

                                                            <Text
                                                                className="mt-1 text-xs"
                                                                style={{
                                                                    color: colours.textMuted,
                                                                }}
                                                            >
                                                                {revoked
                                                                    ? "Revoked"
                                                                    : expired
                                                                        ? "Expired"
                                                                        : exhausted
                                                                            ? "Usage limit reached"
                                                                            : "Active"}
                                                                {" · "}
                                                                {invite.redeemedCount}
                                                                {invite.maxUses != null
                                                                    ? `/${invite.maxUses}`
                                                                    : ""} uses
                                                            </Text>
                                                        </View>

                                                        {active && (
                                                            <Pressable
                                                                accessibilityLabel={`Revoke invitation ${invite.id}`}
                                                                onPress={() =>
                                                                    requestRevokeInvitation(
                                                                        invite.id
                                                                    )
                                                                }
                                                                className="p-2"
                                                            >
                                                                <Ionicons
                                                                    name="close-circle-outline"
                                                                    size={21}
                                                                    color={colours.error}
                                                                />
                                                            </Pressable>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>

            <ConfirmActionModal
                action={confirmation}
                onClose={() => setConfirmation(null)}
                colours={colours}
            />
        </View>
    );
}
