using kanbanBackend.DTOs.Dashboard.Workspaces;
using kanbanBackend.Util;

namespace kanbanBackend.Services.Dashboard.Interfaces;

public interface IWorkspaceInvitationInterface
{
    Task<ModelResult<CreatedWorkspaceInvitation>> CreateWorkspaceInvitation(
        CreateInvitationRequest request);
    Task<ModelResult<List<WorkspaceInvitationResponse>>> GetWorkspaceInvitations(int workspaceId);
    Task<ModelResult<bool>> RevokeInvitation(int workspaceId, int invitationId);
    Task<ModelResult<WorkspaceResponse>> JoinWorkspace(string code);
}