namespace kanbanBackend.Models;

public class TaskItemLabel
{
    public int TaskItemId { get; set; }
    public TaskItem TaskItem { get; set; } = null!;
    public int WorkspaceLabelId { get; set; }
    public WorkspaceLabel WorkspaceLabel { get; set; } = null!;
}