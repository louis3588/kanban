namespace kanbanBackend.DTOs.Dashboard;

public class BoardsPermissionsResponse
{
    public bool CanEditTasks { get; set; }
    public bool CanManageBoards { get; set; }
    public bool CanManageMembers { get; set; }
    public bool CanManageAdmins { get; set; }
    public bool CanManageInvitations { get; set; }
    public bool CanEditWorkspace { get; set; }
    public bool CanTransferOwnership { get; set; }
}