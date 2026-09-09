namespace kanbanBackend.Models;

public class BoardColumn
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Position { get; set; }

    public int BoardId { get; set; }

    public Board Board { get; set; } = null!;

    public ICollection<TaskItem> Tasks { get; set; }
        = new List<TaskItem>();
}