namespace kanbanBackend.DTOs.Profile;

public class UserProfile
{
    public int? UserId { get; set; }
    
    public string? FirstName { get; set; }

    public string? ProfileImage { get; set; }

    public string? LastName { get; set; }

    public string? Bio { get; set; }
}