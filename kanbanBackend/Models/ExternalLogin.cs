using kanbanBackend.Models.Enum;

namespace kanbanBackend.Models;

public class ExternalLogin
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public ExternalLoginProvider Provider { get; set; }
    public string ProviderUserId { get; set; } = null!;
    public User User { get; set; } = null!;
}