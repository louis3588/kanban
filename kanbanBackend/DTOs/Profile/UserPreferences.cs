using kanbanBackend.Models.Enum;

namespace kanbanBackend.DTOs.Profile;

public class UserPreferences : PreferenceRequest
{
    public UserProfileResponse Profile { get; set; } = new();
}