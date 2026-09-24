using kanbanBackend.Data;
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
                member.Role == "Owner"
            );
    }

    public async Task<bool> IsAdminAsync(int userId, int workspaceId)
    {
        return await _context.WorkspaceMembers
            .AnyAsync(member =>
                member.UserId == userId &&
                member.WorkspaceId == workspaceId &&
                (member.Role == "Admin" || member.Role == "Owner")
            );
    }
}