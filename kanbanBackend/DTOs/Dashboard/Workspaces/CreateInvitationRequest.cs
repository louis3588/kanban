namespace kanbanBackend.DTOs.Dashboard.Workspaces;

public class CreateInvitationRequest
{
    public int WorkspaceId { get; set; }
    public int ValidForDays { get; set; } = 7;
    public int? MaxUses { get; set; }
}