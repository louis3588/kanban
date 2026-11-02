namespace kanbanBackend.DTOs.Dashboard;

public class CreatedWorkspaceInvitation : WorkspaceInvitationResponse
{
    public string Code { get; set; } = string.Empty;
    public string InviteUrl { get; set; } = string.Empty;
}