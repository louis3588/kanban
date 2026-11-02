namespace kanbanBackend.Models;

public class WorkspaceLabel
{
    public int Id { get; set; }
    public int WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string NormalisedName { get; set; } = string.Empty;
    public string Colour { get; set; } = "#6B7280";
    public ICollection<TaskItemLabel> TaskLabels { get; set; } 
        = new List<TaskItemLabel>();
}