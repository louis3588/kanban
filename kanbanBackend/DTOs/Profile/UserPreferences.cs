using kanbanBackend.Models.Enum;

namespace kanbanBackend.DTOs.Profile;

public class UserPreferences
{
    public UserProfileResponse Profile { get; set; } = new();
    public AppTheme Theme { get; set; } = AppTheme.SepiaLight;
    public int? DefaultBoardId { get; set; }
    public bool ShowOnlineStatus { get; set; } = true;
    public bool EnableEmailNotifications { get; set; }
}