namespace kanbanBackend.Models;

public class Workspace
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WorkspaceMember> Members { get; set; }
        = new List<WorkspaceMember>();

    public ICollection<Board> Boards { get; set; }
        = new List<Board>();
}