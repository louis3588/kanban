namespace kanbanBackend.DTOs.Auth;

public class AuthResponse : CredentialResponse
{
    public string Token { get; set; } = string.Empty;
    
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string Username { get; set; } = string.Empty;
}