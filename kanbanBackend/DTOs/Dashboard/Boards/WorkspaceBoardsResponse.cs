using kanbanBackend.Models.Enum;

namespace kanbanBackend.DTOs.Dashboard;

public class WorkspaceBoardsResponse
{
    public int WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? ImageUrl { get; set; }
    public WorkspaceRole Role { get; set; }
    public List<BoardSummaryResponse> Boards = [];
    public List<WorkspaceMemberResponse> Members { get; set; } = [];
    public List<WorkspaceInvitationResponse>? Invitations  { get; set; }
    public BoardsPermissionsResponse? Permissions { get; set; } = new();
}