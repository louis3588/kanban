using kanbanBackend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;

namespace kanbanBackend.Hubs;

[Authorize]
public class BoardHub : Hub
{
    
    private readonly KanbanDbContext _context;

    public BoardHub(KanbanDbContext context)
    {
        _context = context;
    }
    
    private static string GetBoardGroupName(int boardId) {
        return $"board-{boardId}";
    }

    public async Task JoinBoard(int boardId)
    {
        var userIdClaim = Context.User?
            .FindFirst(JwtRegisteredClaimNames.Sub);

        if (userIdClaim is null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            throw new HubException("User could not be identified");
        }
        
        var hasAccess = await _context.Boards
            .Where(b => b.Id == boardId)
            .SelectMany(board => board.Workspace.Members)
            .AnyAsync(member => member.UserId == userId);

        if (!hasAccess)
        {
            throw new HubException($"User {userId} does not have access to board {boardId}");
        }
        
        await Groups.AddToGroupAsync(Context.ConnectionId, GetBoardGroupName(boardId));
    }

    public async Task LeaveBoard(int boardId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetBoardGroupName(boardId));
    }
}