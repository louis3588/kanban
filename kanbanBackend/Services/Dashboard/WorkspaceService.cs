using kanbanBackend.Data;
using kanbanBackend.DTOs.Dashboard;
using kanbanBackend.DTOs.Dashboard.Boards;
using kanbanBackend.DTOs.Dashboard.Workspaces;
using kanbanBackend.Models;
using kanbanBackend.Models.Enum;
using kanbanBackend.Services.Auth;
using kanbanBackend.Services.Dashboard.Interfaces;
using kanbanBackend.Util;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Services.Dashboard;

public class WorkspaceService
{
    private readonly KanbanDbContext _dbContext;
    private readonly CurrentUserService _currentUser;
    private readonly WorkspaceAuthService _authService;
    private readonly IWorkspaceMemberInterface _memberService;

    public WorkspaceService(KanbanDbContext dbContext, CurrentUserService currentUser, WorkspaceAuthService authService,
        IWorkspaceMemberInterface memberService)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _authService = authService;
        _memberService = memberService;
    }

    private static BoardsPermissionsResponse GetPermissions(WorkspaceRole role)
    {
        return role switch
        {
            WorkspaceRole.Owner => new BoardsPermissionsResponse
            {
                CanEditTasks = true,
                CanManageBoards = true,
                CanManageMembers = true,
                CanManageAdmins = true,
                CanManageInvitations = true,
                CanEditWorkspace = true,
                CanTransferOwnership = true
            },
            WorkspaceRole.Admin => new BoardsPermissionsResponse
            {
                CanEditTasks = true,
                CanManageBoards = true,
                CanManageMembers = true,
                CanManageAdmins = false,
                CanManageInvitations = true,
                CanEditWorkspace = false,
                CanTransferOwnership = false
            },
            WorkspaceRole.Member => new BoardsPermissionsResponse
            {
                CanEditTasks = true,
                CanManageBoards = false,
                CanManageMembers = false,
                CanManageAdmins = false,
                CanManageInvitations = false,
                CanEditWorkspace = false,
                CanTransferOwnership = false
            },
            _ => new BoardsPermissionsResponse()
        };
    }
    
    public async Task<ModelResult<WorkspaceBoardsResponse>> GetWorkspaceAsync(int workspaceId)
    {
        var userId = _currentUser.UserId();
        var userNotFound = ModelResult<WorkspaceBoardsResponse>.Failure("User could not be identified");
        var permissionDenied = ModelResult<WorkspaceBoardsResponse>.Failure("You do not have permission to access this workspace");
        
        if (userId is null)
        {
            return userNotFound;
        }
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value);

        if (user is null)
        {
            return userNotFound;
        }

        var isMember = await _authService.IsMemberAsync(user.Id, workspaceId);
        
        if (!isMember)
        {
            return permissionDenied;
        }
        
        var membership = await _dbContext.WorkspaceMembers
            .FirstOrDefaultAsync(m => m.WorkspaceId == workspaceId && m.UserId == user.Id);
        
        if (membership is null)
        {
            return permissionDenied;
        }
        
        var isAdminOrOwner = membership.Role is WorkspaceRole.Admin or WorkspaceRole.Owner;
        
        var query = _dbContext.Workspaces
            .AsNoTracking()
            .AsSplitQuery()
            .Include(workspace => workspace.Boards)
            .Include(workspace => workspace.Members)
                .ThenInclude(m => m.User)
            .AsQueryable();

        if (isAdminOrOwner)
        {
            query = query.Include(w => w.Invitations);
        }
        var workspace = await query.FirstOrDefaultAsync(w => w.Id == workspaceId);

        if (workspace is null)
        {
            return permissionDenied;
        }

        var boardSummaries = workspace.Boards
            .OrderBy(b => b.Position)
            .ThenBy(b => b.Id)
            .Select(board => new BoardSummaryResponse
            {
                BoardId = board.Id, 
                Name = board.Name, 
                ImageUrl = board.ImageUrl, 
                Position = board.Position,
            })
            .ToList();

        var workspaceMembers = workspace.Members
            .Select(member => _memberService.ToResponse(member)).ToList();
        
        var potentialInvitations = new List<WorkspaceInvitationResponse>();
        if (isAdminOrOwner)
        {
            var invitationResponse = workspace.Invitations
                .Select(invite => new WorkspaceInvitationResponse
                {
                    Id = invite.Id,
                    WorkspaceId = workspaceId,
                    CreatedByUserId = invite.CreatedByUserId,
                    CreatedAtUtc = invite.CreatedAtUtc,
                    ExpiresAtUtc = invite.ExpiresAtUtc,
                    RevokedAtUtc = invite.RevokedAtUtc,
                    RedeemedCount = invite.RedeemedCount,
                    MaxUses = invite.MaxUses
                }).ToList();
            
            potentialInvitations.AddRange(invitationResponse);
        }
        
        var permissions = GetPermissions(membership.Role);
        var workspaceBoards = new WorkspaceBoardsResponse
        {
            WorkspaceId = workspaceId,
            Name = workspace.Name,
            CreatedAt = workspace.CreatedAt,
            ImageUrl = workspace.ImageUrl,
            Role = membership.Role,
            Boards = boardSummaries,
            Members = workspaceMembers,
            Invitations = potentialInvitations,
            Permissions = permissions,
        };

        return ModelResult<WorkspaceBoardsResponse>.Success(workspaceBoards);
    }
    
    
    public async Task<ModelResult<WorkspaceResponse>> CreateWorkspaceAsync(string name)
    {
        var userId = _currentUser.UserId();
        var userNull = ModelResult<WorkspaceResponse>.Failure("User could not be identified");
        
        if (userId is null)
        {
            return userNull;
        }
        var user = await _dbContext
            .Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value);
        if (user is null)
        {
            return userNull;
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            return ModelResult<WorkspaceResponse>.Failure("Workspace name cannot be empty");
        }

        if (name.Length > 100)
        {
            return ModelResult<WorkspaceResponse>.Failure("Workspace name cannot exceed 100 chars");
        }

        var workspace = new Workspace
        {
            Name = name,
            CreatedAt = DateTime.UtcNow,
        };
        var membership = new WorkspaceMember
        {
            UserId = userId.Value,
            User = user,
            Workspace = workspace,
            JoinedAt = DateTime.UtcNow,
            Role = WorkspaceRole.Owner
        };
        
        workspace.Members.Add(membership);

        _dbContext.Workspaces.Add(workspace);

        await _dbContext.SaveChangesAsync();

        var response = new WorkspaceResponse
        {
            Id = workspace.Id,
            Name = workspace.Name,
            CreatedAt = workspace.CreatedAt,
            Role = membership.Role,
        };
        
        return ModelResult<WorkspaceResponse>.Success(response);
    }

    public async Task<ModelResult<List<WorkspaceResponse>>> GetWorkspacesAsync()
    {
        var userId = _currentUser.UserId();
        var userNull = ModelResult<List<WorkspaceResponse>>.
            Failure("User could not be identified");

        if (userId is null)
        {
            return userNull;
        }

        var user = await _dbContext
            .Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value);
        if (user == null)
        {
            return userNull;
        }

        var workspaces = await _dbContext
            .WorkspaceMembers
            .Where(member => member.UserId == userId.Value)
            .OrderBy(member => member.Workspace.CreatedAt)
            .Select(member => new WorkspaceResponse
            {
                Id = member.WorkspaceId,
                Name = member.Workspace.Name,
                Role = member.Role,
                CreatedAt = member.Workspace.CreatedAt,
            }).ToListAsync();
        
        return ModelResult<List<WorkspaceResponse>>.Success(workspaces);
    }

    public async Task<ModelResult<WorkspaceResponse>> UpdateWorkspaceNameAsync(int workspaceId, string name)
    {
        var userId = _currentUser.UserId();
        var userNull = ModelResult<WorkspaceResponse>.Failure("User could not be identified");
        
        if (userId is null)
        {
            return userNull;
        }
        var user = await _dbContext
            .Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value);
        if (user is null)
        {
            return userNull;
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            return ModelResult<WorkspaceResponse>.Failure("Workspace name cannot be empty");
        }

        if (name.Length > 100)
        {
            return ModelResult<WorkspaceResponse>.Failure("Workspace name cannot exceed 100 chars");
        }

        var canUpdate = await _authService.IsOwnerAsync(userId.Value, workspaceId);
        if (!canUpdate)
        {
            return ModelResult<WorkspaceResponse>.Failure(
                "You do not have permission to update the name for this workspace");
        }

        var workspace = await _dbContext
            .Workspaces
            .FirstOrDefaultAsync(workspace =>
                workspace.Id == workspaceId);

        if (workspace is null)
        {
            return ModelResult<WorkspaceResponse>.Failure("Workspace could not be found");
        }

        workspace.Name = name;
        await _dbContext.SaveChangesAsync();

        var membership = await _dbContext
            .WorkspaceMembers
            .FirstAsync(member =>
                member.UserId == userId.Value &&
                member.WorkspaceId == workspace.Id);
        var response = new WorkspaceResponse
        {
            Id = workspace.Id,
            Name = workspace.Name,
            Role = membership.Role,
            CreatedAt = workspace.CreatedAt
        };
        return ModelResult<WorkspaceResponse>.Success(response);
    }

    public async Task<ModelResult<bool>> DeleteWorkspaceAsync(int workspaceId)
    {
        var userId = _currentUser.UserId();
        var userNull = ModelResult<bool>.Failure("User could not be identified");
        
        if (userId is null)
        {
            return userNull;
        }
        var user = await _dbContext
            .Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value);
        if (user is null)
        {
            return userNull;
        }

        var isOwner = await _authService.IsOwnerAsync(userId.Value, workspaceId);
        if (!isOwner)
        {
            return ModelResult<bool>.Failure("Only the workspace owner can delete this workspace");
        }

        var workspace = await _dbContext
            .Workspaces
            .FirstOrDefaultAsync(workspace => workspace.Id == workspaceId);

        if (workspace is null)
        {
            return ModelResult<bool>.Failure("Workspace could not be found");
        }

        _dbContext.Workspaces.Remove(workspace);
        await _dbContext.SaveChangesAsync();
        return ModelResult<bool>.Success(true);
    }
}