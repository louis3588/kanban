using kanbanBackend.DTOs.Profile;
using kanbanBackend.Models.Enum;

namespace kanbanBackend.Models;

public class UserSettings
{
    public int Id { get;  set; }
    public int UserId { get; set; }
    public AppTheme Theme { get; set; } = AppTheme.SepiaLight;
    public int? DefaultBoardId { get; set; }
    public bool ShowOnlineStatus { get; set; } = true;
    public bool EnableEmailNotifications { get; set; } = false;
    public User User { get; set; } = null!;
}