namespace kanbanBackend.Models;

public class Board
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int WorkspaceId { get; set; }

    public Workspace Workspace { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<BoardColumn> Columns { get; set; }
        = new List<BoardColumn>();
}