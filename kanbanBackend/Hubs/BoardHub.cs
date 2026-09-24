using kanbanBackend.DTOs.Dashboard;
using kanbanBackend.Services.Dashboard;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace kanbanBackend.Hubs;

[Authorize]
public class BoardHub : Hub
{
    private readonly WorkspaceService _workspaceService;

    public BoardHub(
        WorkspaceService workspaceService)
    {
        _workspaceService = workspaceService;
    }
    
    public async Task<WorkspaceResponse> CreateWorkspace(string name){
        var result = await _workspaceService.CreateWorkspaceAsync(name);

        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }

        return result.Value!;
    }

    public async Task<List<WorkspaceResponse>> GetWorkspaces()
    {
        var result = await _workspaceService.GetWorkspacesAsync();
        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }

        return result.Value!;
    }

    public async Task<WorkspaceResponse> UpdateWorkspaceName(int workspaceId, string name)
    {
        var result = await _workspaceService.UpdateWorkspaceNameAsync(workspaceId, name);
        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }

        return result.Value!;
    }

    public async Task<bool> DeleteWorkspace(int workspaceId)
    {
        var result = await _workspaceService.DeleteWorkspaceAsync(workspaceId);
        return result.IsSuccess;
    }
}