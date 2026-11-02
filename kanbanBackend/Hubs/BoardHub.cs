using kanbanBackend.DTOs.Dashboard;
using kanbanBackend.DTOs.Profile;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Auth.Interfaces;
using kanbanBackend.Services.Dashboard;
using kanbanBackend.Services.Dashboard.Interfaces;
using kanbanBackend.Util;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace kanbanBackend.Hubs;

[Authorize]
public class BoardHub : Hub
{
    private readonly WorkspaceService _workspaceService;
    private readonly IUserDetailsInterface _userDetailsService;
    private readonly IWorkspaceMemberInterface _workspaceMemberService;
    private readonly IWorkspaceInvitationInterface _workspaceInvitationService;

    public BoardHub(
        WorkspaceService workspaceService, IUserDetailsInterface userDetailsService,
        IWorkspaceMemberInterface workspaceMemberService, IWorkspaceInvitationInterface workspaceInvitationService)
    {
        _workspaceService = workspaceService;
        _userDetailsService = userDetailsService;
        _workspaceMemberService = workspaceMemberService;
        _workspaceInvitationService = workspaceInvitationService;
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

    public async Task<UserProfileResponse> EditUsername(string username, int userId)
    {
        var result = await _userDetailsService.EditUsername(username, userId);
        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }

        return result.Value!;
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
            userId: profile.UserId,
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

    public async Task<UserPreferences> GetPreferences(int userId)
    {
        var result = await _userDetailsService.GetPreferences(userId);
        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }
        return result.Value!;
    }

    public async Task<UserPreferences> UpdatePreferences(PreferenceRequest preferences, int id)
    {
        var result = await _userDetailsService.EditSettings(
            appTheme: preferences.Theme,
            defaultBoardId: preferences.DefaultBoardId,
            showOnlineStatus: preferences.ShowOnlineStatus,
            enableEmailNotifications: preferences.EnableEmailNotifications,
            userId: id
        );
        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }

        return result.Value!;
    }
    
    public async Task<List<WorkspaceMemberResponse>> GetWorkspaceMembers(
        int workspaceId)
    {
        var result = await _workspaceMemberService.GetWorkspaceMembersAsync(workspaceId);

        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }

        return result.Value!;
    }

    public async Task<WorkspaceMemberResponse> AddWorkspaceMember(
        int workspaceId, string username, WorkspaceRole role)
    {
        var result = await _workspaceMemberService.AddWorkspaceMembersAsync(workspaceId, username, role);

        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }

        return result.Value!;
    }

    public async Task<WorkspaceMemberResponse> UpdateWorkspaceMemberRole(
        int workspaceId, int userId, WorkspaceRole role)
    {
        var result = await _workspaceMemberService.UpdateWorkspaceMemberAsync(workspaceId, userId, role);

        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }

        return result.Value!;
    }

    public async Task<bool> RemoveWorkspaceMember(
        int workspaceId, int userId)
    {
        var result = await _workspaceMemberService.DeleteWorkspaceMemberAsync(workspaceId, userId);

        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }

        return result.Value!;
    }

    public async Task<WorkspaceMemberResponse> TransferWorkspaceOwnership(
        int workspaceId, int newOwnerId)
    {
        var result = await _workspaceMemberService.TransferWorkspaceOwnershipAsync(workspaceId, newOwnerId);

        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }
        return result.Value!;
    }

    public async Task<CreatedWorkspaceInvitation> CreateWorkspaceInvitation(CreateInvitationRequest request)
    {
        var result = await _workspaceInvitationService.CreateWorkspaceInvitation(request);
        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }
        return result.Value!;
    }

    public async Task<List<WorkspaceInvitationResponse>> GetWorkspaceInvitations(int workspaceId)
    {
        var result = await _workspaceInvitationService.GetWorkspaceInvitations(workspaceId);
        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }
        return result.Value!;
    }

    public async Task<bool> RevokeWorkspaceInvitation(int workspaceId, int invitationId)
    {
        var result = await _workspaceInvitationService.RevokeInvitation(workspaceId, invitationId);
        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }
        return result.IsSuccess;
    }

    public async Task<WorkspaceResponse> JoinWorkspace(string code)
    {
        var result = await _workspaceInvitationService.JoinWorkspace(code);
        if (!result.IsSuccess)
        {
            throw new HubException(result.ErrorMessage);
        }
        return result.Value!;
    }
}