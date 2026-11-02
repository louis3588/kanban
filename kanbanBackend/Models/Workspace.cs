namespace kanbanBackend.Models;

public class Workspace
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public string? ImageUrl { get; set; } = string.Empty;
    
    public ICollection<WorkspaceLabel> Labels { get; set; } = new List<WorkspaceLabel>();

    public ICollection<WorkspaceMember> Members { get; set; }
        = new List<WorkspaceMember>();

    public ICollection<WorkspaceInvitation> Invitations { get; set; } 
        = new List<WorkspaceInvitation>();
    
    public ICollection<Board> Boards { get; set; }
        = new List<Board>();
}