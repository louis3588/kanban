using System.Data;
using kanbanBackend.Data;
using kanbanBackend.DTOs.Dashboard;
using kanbanBackend.DTOs.Profile;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Dashboard.Interfaces;
using kanbanBackend.Util;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Services.Dashboard;

public class WorkspaceMemberService : IWorkspaceMemberInterface
{
    private readonly KanbanDbContext _context;
    private readonly CurrentUserService _currentUserService;
    private readonly WorkspaceAuthService _workAuthService;
    private readonly ModelResult<WorkspaceMemberResponse> _userNotFound;
    
    public WorkspaceMemberService(KanbanDbContext dbContext, CurrentUserService currentUserService,
        WorkspaceAuthService workspaceService)
    {
        _context = dbContext;
        _currentUserService = currentUserService;
        _workAuthService = workspaceService;
        _userNotFound = ModelResult<WorkspaceMemberResponse>.Failure("User could not be found");
    }

    private static WorkspaceMemberResponse ToResponse(WorkspaceMember member)
    {
        var user = member.User;
        return new WorkspaceMemberResponse
        {
            WorkspaceId = member.WorkspaceId,
            Role = member.Role,
            JoinedAt = member.JoinedAt,
            User = new PeerProfileResponse
            {
                UserId = user.Id,
                Username = user.Username,
                FirstName = user.FirstName,
                LastName = user.LastName,
                ProfileImage = user.ProfileImage,
                Bio = user.Bio,
            }
        };
    }

    private ModelResult<int> RationaliseUserId(int? userId)
    {
        if (userId != null) return ModelResult<int>.Success(userId.Value);
        userId  = _currentUserService.UserId();
        return userId == null ? ModelResult<int>.Failure("User could not be identified") 
            : ModelResult<int>.Success(userId.Value);
    } 

    public async Task<ModelResult<List<WorkspaceMemberResponse>>> GetWorkspaceMembersAsync(int workspaceId, int? requestUserId = null)
    {
        var potentialUserId = RationaliseUserId(requestUserId);
        if (!potentialUserId.IsSuccess)
        {
            return ModelResult<List<WorkspaceMemberResponse>>
                .Failure(potentialUserId.ErrorMessage ?? "User could not be identified");
        }
        var userId =  potentialUserId.Value;

        var hasAccess = await _workAuthService.IsMemberAsync(userId, workspaceId);
        if (!hasAccess)
        {
            return ModelResult<List<WorkspaceMemberResponse>>.Failure("You do not have access to this workspace");
        }

        var members = await _context.WorkspaceMembers
            .AsNoTracking()
            .Where(m => m.WorkspaceId == workspaceId)
            .OrderBy(m => m.JoinedAt)
            .ThenBy(m => m.UserId)
            .Select(m => new WorkspaceMemberResponse
            {
                WorkspaceId = m.WorkspaceId,
                Role = m.Role,
                JoinedAt = m.JoinedAt,
                User = new PeerProfileResponse
                {
                    UserId = m.UserId,
                    Username = m.User.Username,
                    FirstName = m.User.FirstName,
                    LastName = m.User.LastName,
                    ProfileImage = m.User.ProfileImage,
                    Bio = m.User.Bio,
                }
            }).ToListAsync();

        return ModelResult<List<WorkspaceMemberResponse>>.Success(members);
    }

    public async Task<ModelResult<WorkspaceMemberResponse>> AddWorkspaceMembersAsync(int workspaceId,
        string username, WorkspaceRole role = WorkspaceRole.Member, int? requestUserId = null)
    {
        var potentialUser = RationaliseUserId(requestUserId);
        
        if (!potentialUser.IsSuccess)
        {
            return _userNotFound;
        }

        var userId = potentialUser.Value;
        var isAdmin = await _workAuthService.IsAdminAsync(userId, workspaceId);
        var isOwner = await _workAuthService.IsOwnerAsync(userId, workspaceId);
        if (!isAdmin)
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("You do not have permission to add members");
        }
        if (role != WorkspaceRole.Member && role != WorkspaceRole.Viewer && role != WorkspaceRole.Admin)
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("Invalid workspace role");
        }

        if (role == WorkspaceRole.Admin && !isOwner)
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("Only the workspace owner can add an admin");
        }
        if (string.IsNullOrEmpty(username))
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("Username can not be empty");
        }
        
        username = username.Trim();
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == username);

        if (user is null)
        {
            return _userNotFound;
        }
        var alreadyAMember = await _workAuthService.IsMemberAsync(user.Id, workspaceId);
        if (alreadyAMember)
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("User is already a member of this workspace");
        }

        var membership = new WorkspaceMember
        {
            WorkspaceId = workspaceId,
            UserId = user.Id,
            User = user,
            Role = role,
            JoinedAt = DateTime.UtcNow,
        };

        await _context.WorkspaceMembers.AddAsync(membership);
        await _context.SaveChangesAsync();
        var response = ToResponse(membership);
        return ModelResult<WorkspaceMemberResponse>.Success(response);
    }

    public async Task<ModelResult<WorkspaceMemberResponse>> UpdateWorkspaceMemberAsync(int workspaceId, int targetUserId,
        WorkspaceRole newRole, int? potentialUserId = null)
    {
        var potentialUser = RationaliseUserId(potentialUserId);
        if (!potentialUser.IsSuccess)
        {
            return _userNotFound;
        }
        var userId = potentialUser.Value;
        var isAdmin = await _workAuthService.IsAdminAsync(userId, workspaceId);
        var isOwner = await _workAuthService.IsOwnerAsync(userId, workspaceId);

        if (!isAdmin)
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("You do not have permission to edit member roles");
        }
        if (newRole != WorkspaceRole.Admin && newRole != WorkspaceRole.Member && newRole != WorkspaceRole.Viewer)
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("Invalid workspace role");
        }

        var membership = await _context.WorkspaceMembers
            .Include(m => m.User)
            .FirstOrDefaultAsync(m =>
                m.WorkspaceId == workspaceId &&
                m.UserId == targetUserId);
        if (membership is null)
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("Membership could not be found");
        }

        if (membership.Role == WorkspaceRole.Owner)
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("The workspace owner can not be demoted");
        }

        if (!isOwner && (membership.Role == WorkspaceRole.Admin || newRole == WorkspaceRole.Admin))
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("Only the workspace owner can manage admin roles");
        }

        membership.Role = newRole;
        await _context.SaveChangesAsync();
        var response = ToResponse(membership);
        return ModelResult<WorkspaceMemberResponse>.Success(response);
    }

    public async Task<ModelResult<bool>> DeleteWorkspaceMemberAsync(int workspaceId,
        int targetUserId, int? potentialUserId = null)
    {
        var potentialUser = RationaliseUserId(potentialUserId);
        if (!potentialUser.IsSuccess)
        {
            return ModelResult<bool>.Failure("User not found");
        }
        var userId =  potentialUser.Value;
        await using var transaction = await _context.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);
        var isAdmin = await _workAuthService.IsAdminAsync(userId, workspaceId);
        var isOwner = await _workAuthService.IsOwnerAsync(userId, workspaceId);
        if (!isAdmin)
        {
            return ModelResult<bool>.Failure("You do not have permission to remove members");
        }

        var membership = await _context.WorkspaceMembers
            .FirstOrDefaultAsync(m =>
                m.WorkspaceId == workspaceId &&
                m.UserId == targetUserId);
        if (membership is null)
        {
            return ModelResult<bool>.Failure("Workspace member could not be found");
        }

        if (membership.Role == WorkspaceRole.Owner)
        {
            return ModelResult<bool>
                .Failure("The workspace owner cannot be removed unless the workspace is transferred");
        }

        if (membership.Role == WorkspaceRole.Admin && !isOwner)
        {
            return ModelResult<bool>.Failure("Only the workspace owner can remove an admin");
        }

        await _context.WorkspaceInvitations
            .Where(i =>
                i.WorkspaceId == workspaceId &&
                i.CreatedByUserId == targetUserId &&
                i.RevokedAtUtc == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(i => i.RevokedAtUtc, DateTime.UtcNow));
        
        await _context.TaskItems
            .Where(t =>
                t.AssignedUserId == targetUserId &&
                t.Column.Board.WorkspaceId == workspaceId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(t => t.AssignedUserId, (int?)null)
                .SetProperty(t => t.UpdatedAt, DateTime.UtcNow));

        _context.WorkspaceMembers.Remove(membership);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        return ModelResult<bool>.Success(true);
    }

    public async Task<ModelResult<WorkspaceMemberResponse>> TransferWorkspaceOwnershipAsync
        (int workspaceId, int targetUserId, int? triggererUserId = null)
    {
        var potentialUserId = RationaliseUserId(triggererUserId);
        if (!potentialUserId.IsSuccess)
        {
            return _userNotFound;
        }

        var userId = potentialUserId.Value;
        await using var transaction = await _context.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);
        var isOwner = await _workAuthService.IsOwnerAsync(userId, workspaceId);
        if (!isOwner)
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("Only the workspace owner can transfer ownership");
        }

        if (userId == targetUserId)
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("You already own this workspace");
        }

        var currentOwner = await _context.WorkspaceMembers
            .FirstOrDefaultAsync(m =>
                m.WorkspaceId == workspaceId &&
                m.UserId == userId);
        var newOwner = await _context.WorkspaceMembers
            .FirstOrDefaultAsync(m =>
                m.WorkspaceId == workspaceId &&
                m.UserId == targetUserId);

        if (currentOwner is null || newOwner is null)
        {
            return ModelResult<WorkspaceMemberResponse>.Failure("The selected user is not a member");
        }

        currentOwner.Role = WorkspaceRole.Admin;
        await _context.SaveChangesAsync();
        newOwner.Role = WorkspaceRole.Owner;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        
        var response = ToResponse(newOwner);
        return ModelResult<WorkspaceMemberResponse>.Success(response);
    }
}