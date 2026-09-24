using kanbanBackend.Data;
using kanbanBackend.Services.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace kanbanBackend.Hubs;

[Authorize]
public class BoardHub : Hub
{
    private readonly CurrentUserService _currentUser;
    private readonly WorkspaceAuthService _workspaceAuthorisation;
    private readonly KanbanDbContext _context;

    public BoardHub(
        CurrentUserService currentUser,
        WorkspaceAuthService workspaceAuthorisation,
        KanbanDbContext context)
    {
        _currentUser = currentUser;
        _workspaceAuthorisation = workspaceAuthorisation;
        _context = context;
    }
    
    private static string GetBoardGroupName(int boardId)
    {
        return $"board-{boardId}";
    }

    public async Task JoinBoard(int boardId)
    {
        var userId = _currentUser.UserId();

        if (userId is null)
        {
            throw new HubException(
                "User could not be identified.");
        }

        var workspaceId = await _context.Boards
            .Where(board => board.Id == boardId)
            .Select(board => (int?)board.WorkspaceId)
            .FirstOrDefaultAsync();

        if (workspaceId is null)
        {
            throw new HubException(
                "Board could not be found.");
        }

        var hasAccess =
            await _workspaceAuthorisation.IsMemberAsync(
                userId.Value,
                workspaceId.Value);

        if (!hasAccess)
        {
            throw new HubException(
                "You do not have access to this board.");
        }

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            GetBoardGroupName(boardId));
    }


    public async Task LeaveBoard(int boardId)
    {
        await Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            GetBoardGroupName(boardId));
    }
    
}