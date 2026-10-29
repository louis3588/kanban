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
    return await connection.invoke<WorkspaceResponse>("UpdateWorkspace", workspaceId, name);
}

export async function deleteWorkspace(token: string, workspaceId: number): Promise<boolean> {
    const connection = await getConnection(token);
    return await connection.invoke<boolean>("DeleteWorkspace", workspaceId);
}

