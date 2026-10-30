using kanbanBackend.Models.Enum;

namespace kanbanBackend.Models;

public class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; } = string.Empty;
    public int Position { get; set; }
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public int ColumnId { get; set; }
    public ICollection<SuccessCriteria> SuccessCriteria { get; set; } 
        = new List<SuccessCriteria>();
    public BoardColumn Column { get; set; } = null!;
    public int? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }
    public ICollection<TaskItemLabel> TaskLabels { get; set; } 
        = new List<TaskItemLabel>();
}