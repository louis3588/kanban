using kanbanBackend.Data;
using kanbanBackend.DTOs.Dashboard;
using kanbanBackend.Models;
using kanbanBackend.Services.Auth;
using kanbanBackend.Util;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Services.Dashboard;

public class WorkspaceService
{
    private readonly KanbanDbContext _dbContext;
    private readonly CurrentUserService _currentUser;
    private readonly WorkspaceAuthService _authService;

    public WorkspaceService(KanbanDbContext dbContext, CurrentUserService currentUser, WorkspaceAuthService authService)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _authService = authService;
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
            Role = "Owner"
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