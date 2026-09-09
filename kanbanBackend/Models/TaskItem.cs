namespace kanbanBackend.Models;

public class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; } = string.Empty;
    public int Position { get; set; }
    public string Priority { get; set; } = "Medium";
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int ColumnId { get; set; }

    public BoardColumn Column { get; set; } = null!;

    public int? AssignedUserId { get; set; }

    public User? AssignedUser { get; set; }
}