namespace kanbanBackend.DTOs.Auth;

public class CredentialResponse
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
}