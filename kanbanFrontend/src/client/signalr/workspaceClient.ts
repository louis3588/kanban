import {UserProfile} from "@/client/signalr/profileClient";
import {getConnection} from "@/client/signalr/hubClient";

export enum WorkspaceRole {
    Owner= "Owner",
    Admin = "Admin",
    Member = "Member",
    Viewer = "Viewer",
}

export interface WorkspaceResponse{
    id: number;
    name: string;
    role: WorkspaceRole;
    createdAt: string;
}

export interface PeerProfileResponse extends UserProfile{
    username: string;
}

export interface WorkspaceMemberResponse{
    workspaceId: number;
    user: PeerProfileResponse;
    role: WorkspaceRole;
    joinedAt: string;
}

export interface CreateInvitationRequest{
    workspaceId: number;
    validForDays: number;
    maxUses?: number;
}

export interface WorkspaceInvitation{
    id: number;
    workspaceId: number;
    createdByUserId?: number;
    createdAtUtc: string;
    expiresAtUtc: string;
    revokedAtUtc?: string;
    redeemedCount: number;
    maxUses?: number;
}

export interface CreatedWorkspaceInvitation extends WorkspaceInvitation{
    code: string;
    inviteUrl: string;
}

export async function getWorkspaces(token: string): Promise<WorkspaceResponse[]> {
    const connection = await getConnection(token);
    return await connection.invoke<WorkspaceResponse[]>("GetWorkspaces");
}

export async function createWorkspace(token: string, name: string): Promise<WorkspaceResponse> {
    const connection = await getConnection(token);
    return await connection.invoke<WorkspaceResponse>("CreateWorkspace", name);
}

export async function updateWorkspaceName(token: string, workspaceId: number, name: string): Promise<WorkspaceResponse> {
    const connection = await getConnection(token);
    return await connection.invoke<WorkspaceResponse>("UpdateWorkspaceName", workspaceId, name);
}

export async function deleteWorkspace(token: string, workspaceId: number): Promise<boolean> {
    const connection = await getConnection(token);
    return await connection.invoke<boolean>("DeleteWorkspace", workspaceId);
}

export async function createWorkspaceInvitation(token: string, request: CreateInvitationRequest): Promise<CreatedWorkspaceInvitation> {
    const connection = await getConnection(token);
    return await connection.invoke<CreatedWorkspaceInvitation>("CreateWorkspaceInvitation", request);
}

export async function getWorkspaceInvitations(token: string, workspaceId: number): Promise<WorkspaceInvitation[]>{
    const connection = await getConnection(token);
    return await connection.invoke<WorkspaceInvitation[]>("GetWorkspaceInvitations", workspaceId);
}

export async function revokeWorkspaceInvitation(token: string, workspaceId: number, invitationId: number): Promise<boolean> {
    const connection = await getConnection(token);
    return await connection.invoke<boolean>("RevokeWorkspaceInvitation", workspaceId, invitationId);
}

export async function joinWorkspace(token: string, code: string): Promise<WorkspaceResponse>{
    const connection = await getConnection(token);
    return await connection.invoke<WorkspaceResponse>("JoinWorkspace", code);
}
