using kanbanBackend.DTOs.Dashboard;
using kanbanBackend.DTOs.Profile;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Services.Dashboard;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace kanbanBackend.Hubs;

[Authorize]
public class BoardHub : Hub
{
    private readonly WorkspaceService _workspaceService;
    private readonly IUserDetailsInterface _userDetailsService;

    public BoardHub(
        WorkspaceService workspaceService, IUserDetailsInterface userDetailsService)
    {
        _workspaceService = workspaceService;
        _userDetailsService = userDetailsService;
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

    public async Task<UserProfileResponse> GetUserProfile(int userId)
    {
        var result = await _userDetailsService.GetProfile(userId);
        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }

        return result.Value!;
    }

    public async Task<UserProfileResponse> EditProfile(UserProfile profile)
    {
        var result = await _userDetailsService.EditProfile(
            firstName: profile.FirstName,
            profileImage: profile.ProfileImage,
            lastName: profile.LastName,
            bio: profile.Bio
        );

        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }

        return result.Value!;
    }
}