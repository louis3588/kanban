using kanbanBackend.Data;
using kanbanBackend.Models.Enum;
using Microsoft.EntityFrameworkCore;

namespace kanbanBackend.Services.Auth;

public class WorkspaceAuthService
{
    private readonly KanbanDbContext _context;

    public WorkspaceAuthService(KanbanDbContext context)
    {
        _context = context;
    }

    public async Task<bool> IsMemberAsync(int userId, int workspaceId)
    {
        return await _context.WorkspaceMembers
            .AnyAsync(member =>
                member.UserId == userId &&
                member.WorkspaceId == workspaceId
            );
    }

    public async Task<bool> IsOwnerAsync(int userId, int workspaceId)
    {
        return await _context.WorkspaceMembers
            .AnyAsync(member =>
                member.UserId == userId &&
                member.WorkspaceId == workspaceId &&
                member.Role == WorkspaceRole.Owner
            );
    }

    public async Task<bool> IsAdminAsync(int userId, int workspaceId)
    {
        return await _context.WorkspaceMembers
            .AnyAsync(member =>
                member.UserId == userId &&
                member.WorkspaceId == workspaceId &&
                (member.Role == WorkspaceRole.Admin || member.Role == WorkspaceRole.Owner)
            );
    }

    public async Task<bool> CanEditTasksAsync(int userId, int workspaceId)
    {
        return await _context.WorkspaceMembers
            .AnyAsync(member =>
                member.UserId == userId &&
                member.WorkspaceId == workspaceId &&
                member.Role != WorkspaceRole.Viewer);
    }
}