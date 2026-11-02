using kanbanBackend.Models.Enum;

namespace kanbanBackend.DTOs.Dashboard;

public class WorkspaceResponse
{
    public int Id { get; set; }
    
    public string Name { get; set; }
    public WorkspaceRole Role { get; set; }
    public DateTime CreatedAt { get; set; }
}