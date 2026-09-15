namespace kanbanBackend.Models;

public class User
{
    public int Id { get; set; }

    public string Username { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;
    
    public string FirstName { get; set; } = string.Empty;
    
    public string LastName { get; set; } = string.Empty;
    
    public string? ProfileImage { get; set; }
    
    public string? Bio { get; set; }
    
    public bool IsEmailVerified { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WorkspaceMember> WorkspaceMemberships { get; set; }
        = new List<WorkspaceMember>();

    public ICollection<TaskItem> AssignedTasks { get; set; }
        = new List<TaskItem>();
}