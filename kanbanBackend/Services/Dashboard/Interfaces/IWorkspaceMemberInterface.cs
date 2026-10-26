using kanbanBackend.DTOs.Dashboard;
using kanbanBackend.Models.Enum;
using kanbanBackend.Util;

namespace kanbanBackend.Services.Dashboard.Interfaces;

public interface IWorkspaceMemberInterface
{
    Task<ModelResult<List<WorkspaceMemberResponse>>> GetWorkspaceMembersAsync(int workspaceId,
        int? requestUserId = null);

    Task<ModelResult<WorkspaceMemberResponse>> AddWorkspaceMembersAsync(int workspaceId,
        string username, WorkspaceRole role = WorkspaceRole.Member, int? requestUserId = null);

    Task<ModelResult<WorkspaceMemberResponse>> UpdateWorkspaceMemberAsync(int workspaceId, int targetUserId,
        WorkspaceRole newRole, int? potentialUserId = null);

    Task<ModelResult<bool>> DeleteWorkspaceMemberAsync(int workspaceId, int targetUserId, int? potentialUserId = null);

    Task<ModelResult<WorkspaceMemberResponse>> TransferWorkspaceOwnershipAsync
        (int workspaceId, int targetUserId, int? triggererUserId = null);
}