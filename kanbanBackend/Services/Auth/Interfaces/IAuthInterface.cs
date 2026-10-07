using kanbanBackend.DTOs.Auth;
using kanbanBackend.Util;

namespace kanbanBackend.Services.Auth.Interfaces;

public interface IAuthInterface
{
    Task<RegistrationResponse> RegisterUser(RegisterRequest request);
    Task<CredentialResponse?> Login(LoginRequest request);

    Task<ModelResult<AuthResponse>> RegisterGoogleUser(
        string googleUserId, string email, string? firstName, string? lastName,
        string? profilePicture);
}