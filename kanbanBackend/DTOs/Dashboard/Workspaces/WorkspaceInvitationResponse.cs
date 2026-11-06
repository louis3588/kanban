namespace kanbanBackend.DTOs.Dashboard.Workspaces;

public class WorkspaceInvitationResponse
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; }
    public int? CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public int RedeemedCount { get; set; }
    public int? MaxUses { get; set; }
}