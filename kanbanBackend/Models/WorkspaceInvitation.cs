namespace kanbanBackend.Models;

public class WorkspaceInvitation
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;
    public string CodeHash { get; set; } = string.Empty;
    public int? CreatedByUserId {get; set;}
    public User? CreatedByUser { get; set; }
    public DateTime CreatedAtUtc { get; set; } =  DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public int RedeemedCount { get; set; } = 0;
    //if null uses are unlimited
    public int? MaxUses { get; set; }
}