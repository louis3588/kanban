using kanbanBackend.DTOs.Profile;
using kanbanBackend.Models.Enum;

namespace kanbanBackend.DTOs.Dashboard;

public class WorkspaceMemberResponse
{
    public int WorkspaceId { get; set; }
    public PeerProfileResponse User { get; set; } = new();
    public WorkspaceRole Role { get; set; }
    public DateTime JoinedAt { get; set; }
}