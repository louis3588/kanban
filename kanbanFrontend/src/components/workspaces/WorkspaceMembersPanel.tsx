import {WorkspaceBoardResponse, WorkspaceMemberResponse, WorkspaceRole} from "@/client/signalr/workspaceClient";
import {ThemeColors} from "@/theme/themes";
import {useState} from "react";
import {Pressable, View, Text} from "react-native";
import {Image} from "expo-image"
import {Ionicons} from "@expo/vector-icons";

interface Props {
    workspace: WorkspaceBoardResponse;
    currentUserId?: number;
    onChangeRole: (member: WorkspaceMemberResponse, role: WorkspaceRole) => void;
    onRemove: (member: WorkspaceMemberResponse) => void;
    onTransferOwnership: (member: WorkspaceMemberResponse) => void;
    colours: ThemeColors
}

export default function WorkspaceMembersPanel({
    workspace, currentUserId, onChangeRole, onRemove, onTransferOwnership, colours}: Props) {

    const [expandedId, setExpandedId] = useState<number | null>(null);
    const isOwner = workspace.role === WorkspaceRole.Owner;

    const canManage = (member: WorkspaceMemberResponse) => {
        if (
            !currentUserId ||
            member.user.userId === currentUserId ||
            !workspace.permissions.canManageMembers
        ) {
            return false;
        }

        if (isOwner) {
            return member.role !== WorkspaceRole.Owner;
        }

        return (
            member.role === WorkspaceRole.Member ||
            member.role === WorkspaceRole.Viewer
        );
    };

    const roleOptions = isOwner
        ? [WorkspaceRole.Admin, WorkspaceRole.Member, WorkspaceRole.Viewer]
        : [WorkspaceRole.Member, WorkspaceRole.Viewer];

    return (
        <View
            className="rounded-2xl border p-5"
            style={{
                backgroundColor: colours.surface,
                borderColor: colours.border,
            }}
        >
            <View className="mb-5 flex-row items-center justify-between">
                <Text
                    className="text-lg font-bold"
                    style={{ color: colours.text }}
                >
                    Members
                </Text>

                <Text
                    className="text-sm"
                    style={{ color: colours.textMuted }}
                >
                    {workspace.members.length}
                </Text>
            </View>

            {workspace.members.map(member => {
                const id = member.user.userId!;
                const expanded = expandedId === id;

                const name =
                    [member.user.firstname, member.user.lastname]
                        .filter(Boolean)
                        .join(" ") ||
                    member.user.username;

                return (
                    <View
                        key={id}
                        className="border-b py-3"
                        style={{ borderColor: colours.border }}
                    >
                        <View className="flex-row items-center gap-3">
                            {member.user.profileImage ? (
                                <Image
                                    source={{
                                        uri: member.user.profileImage,
                                    }}
                                    className="h-10 w-10 rounded-full"
                                />
                            ) : (
                                <View
                                    className="h-10 w-10 items-center justify-center rounded-full"
                                    style={{
                                        backgroundColor: colours.primary,
                                    }}
                                >
                                    <Text
                                        className="font-bold"
                                        style={{ color: colours.textLight }}
                                    >
                                        {member.user.username
                                            .slice(0, 2)
                                            .toUpperCase()}
                                    </Text>
                                </View>
                            )}

                            <View className="min-w-0 flex-1">
                                <Text
                                    numberOfLines={1}
                                    className="font-semibold"
                                    style={{ color: colours.text }}
                                >
                                    {name}
                                </Text>

                                <Text
                                    className="text-xs"
                                    style={{ color: colours.textMuted }}
                                >
                                    @{member.user.username} · {member.role}
                                </Text>
                            </View>

                            {canManage(member) && (
                                <Pressable
                                    accessibilityLabel={`Manage ${member.user.username}`}
                                    onPress={() =>
                                        setExpandedId(
                                            expanded ? null : id
                                        )
                                    }
                                    className="rounded-lg p-2"
                                >
                                    <Ionicons
                                        name="ellipsis-horizontal"
                                        size={22}
                                        color={colours.text}
                                    />
                                </Pressable>
                            )}
                        </View>

                        {expanded && canManage(member) && (
                            <View
                                className="mt-3 rounded-xl p-3"
                                style={{
                                    backgroundColor: colours.background,
                                }}
                            >
                                <Text
                                    className="mb-2 text-xs font-bold"
                                    style={{ color: colours.textMuted }}
                                >
                                    Change role
                                </Text>

                                {roleOptions
                                    .filter(role => role !== member.role)
                                    .map(role => (
                                        <Pressable
                                            key={role}
                                            className="py-2"
                                            onPress={() => {
                                                setExpandedId(null);
                                                onChangeRole(member, role);
                                            }}
                                        >
                                            <Text
                                                style={{ color: colours.text }}
                                            >
                                                Change to {role}
                                            </Text>
                                        </Pressable>
                                    ))}

                                {isOwner && (
                                    <Pressable
                                        className="py-2"
                                        onPress={() => {
                                            setExpandedId(null);
                                            onTransferOwnership(member);
                                        }}
                                    >
                                        <Text style={{ color: colours.primary }}>
                                            Transfer ownership
                                        </Text>
                                    </Pressable>
                                )}

                                <Pressable
                                    className="mt-2 border-t pt-3"
                                    style={{ borderColor: colours.border }}
                                    onPress={() => {
                                        setExpandedId(null);
                                        onRemove(member);
                                    }}
                                >
                                    <Text
                                        className="font-semibold"
                                        style={{ color: colours.error }}
                                    >
                                        Remove from workspace
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
}