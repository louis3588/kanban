namespace kanbanBackend.Models;

public class SuccessCriteria
{
    public int Id { get; set; }
    public int TaskItemId { get; set; }
    public TaskItem TaskItem { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public bool Completed { get; set; } = false;
    public int Position { get; set; }
}