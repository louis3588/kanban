namespace kanbanBackend.DTOs.Auth;

public class MicrosoftLoginResult
{
    public bool RequiresEmailConfirmation { get; init; }
    public AuthResponse? AuthResponse { get; init; }
    public string Message { get; init; } = string.Empty;
}