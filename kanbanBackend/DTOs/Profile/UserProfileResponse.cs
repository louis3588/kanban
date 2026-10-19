namespace kanbanBackend.DTOs.Profile;

public class UserProfileResponse : UserProfile
{
    public string? Username { get; set; }
    public string? Email { get; set; }
}